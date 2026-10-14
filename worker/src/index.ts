// worker/src/index.ts
import "dotenv/config";
import { PrismaClient, JobStage } from "@prisma/client";
import { GroqProvider } from "./lib/ai/groqProvider";
import { planResearch } from "./lib/pipeline/planner";
import { searchWeb } from "./lib/pipeline/search";
import { collectSources } from "./lib/pipeline/sourceCollector";
import { embedAndStoreChunks } from "./lib/pipeline/embedSource";
import { extractFindings } from "./lib/pipeline/findingExtractor";
import { detectContradictions } from "./lib/pipeline/contradictionDetector";
import { generateReport } from "./lib/pipeline/reportGenerator";

const prisma = new PrismaClient();
const provider = new GroqProvider();
const POLL_INTERVAL_MS = 3000;
const STALE_TIMEOUT_MINUTES = 10;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A job left at PROCESSING with no update in STALE_TIMEOUT_MINUTES almost
// certainly belongs to a worker that crashed or was stopped mid-run. It's
// invisible to claimNextJob forever otherwise, since that only looks at
// QUEUED jobs. Re-running it from scratch would duplicate already-created
// questions/sources/findings, so instead we mark it FAILED — preserving
// whatever partial evidence it gathered rather than corrupting it.
async function reapStaleJobs() {
  const cutoff = new Date(Date.now() - STALE_TIMEOUT_MINUTES * 60 * 1000);
  const staleJobs = await prisma.job.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: cutoff } },
  });

  for (const job of staleJobs) {
    console.warn(
      `⚠️  Reaping stale job ${job.id} (no update since ${job.updatedAt.toISOString()})`
    );
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        error: `Job abandoned: no progress update for over ${STALE_TIMEOUT_MINUTES} minutes (worker likely stopped or crashed mid-run).`,
      },
    });
    await prisma.researchProject.update({
      where: { id: job.projectId },
      data: { status: "FAILED" },
    });
  }
}

async function claimNextJob() {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; projectId: string }[]>`
      SELECT id, "projectId" FROM "Job"
      WHERE status = 'QUEUED'
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const job = rows[0];
    await tx.job.update({
      where: { id: job.id },
      data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } },
    });
    return job;
  });
}

async function setStage(jobId: string, projectId: string, stage: JobStage) {
  await prisma.job.update({ where: { id: jobId }, data: { stage } });
  await prisma.researchProject.update({ where: { id: projectId }, data: { status: "RUNNING" } });
  console.log(`  → Stage: ${stage}`);
}

async function processJob(jobId: string, projectId: string) {
  const project = await prisma.researchProject.findUniqueOrThrow({ where: { id: projectId } });

  await setStage(jobId, projectId, "PLANNING");
  const subQuestions = await planResearch(provider, project.originalQuestion);
  if (subQuestions.length === 0) throw new Error("Planner returned zero sub-questions.");
  const questions = await Promise.all(
    subQuestions.map((text, i) =>
      prisma.researchQuestion.create({ data: { projectId, text, order: i, status: "PENDING" } })
    )
  );

  await setStage(jobId, projectId, "SEARCHING");
  const contentByUrl = new Map<string, string>();
  for (const q of questions) {
    try {
      const results = await searchWeb(q.text, 5);
      results.forEach((r) => contentByUrl.set(r.url, r.content));
      await collectSources(prisma, projectId, results);
      await prisma.researchQuestion.update({ where: { id: q.id }, data: { status: "IN_PROGRESS" } });
    } catch (err) {
      console.warn(`  ⚠️ Search failed for "${q.text.slice(0, 50)}...": ${err instanceof Error ? err.message : err}`);
      await prisma.researchQuestion.update({ where: { id: q.id }, data: { status: "FAILED" } });
    }
  }

  await setStage(jobId, projectId, "EMBEDDING");
  const allSources = await prisma.source.findMany({ where: { projectId } });
  for (const source of allSources) {
    const content = contentByUrl.get(source.url);
    if (!content) continue;
    try {
      await embedAndStoreChunks(prisma, source.id, content);
    } catch (err) {
      console.warn(`  ⚠️ Embedding failed for ${source.url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  await setStage(jobId, projectId, "ANALYZING");
  for (const q of questions) {
    try {
      await extractFindings(provider, prisma, q.id, projectId, q.text);
      await prisma.researchQuestion.update({ where: { id: q.id }, data: { status: "COMPLETED" } });
    } catch (err) {
      console.warn(`  ⚠️ Finding extraction failed for "${q.text.slice(0, 50)}...": ${err instanceof Error ? err.message : err}`);
      await prisma.researchQuestion.update({ where: { id: q.id }, data: { status: "FAILED" } });
    }
  }

  await setStage(jobId, projectId, "DETECTING_CONTRADICTIONS");
  try {
    await detectContradictions(provider, prisma, projectId);
  } catch (err) {
    console.warn(`  ⚠️ Contradiction detection failed: ${err instanceof Error ? err.message : err}`);
  }

  await setStage(jobId, projectId, "GENERATING_REPORT");
  await generateReport(provider, prisma, projectId);
}

async function mainLoop() {
  console.log("Worker started. Polling for queued jobs...");
  while (true) {
    await reapStaleJobs();

    const claimed = await claimNextJob();
    if (!claimed) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    console.log(`\nClaimed job ${claimed.id} for project ${claimed.projectId}`);
    try {
      await processJob(claimed.id, claimed.projectId);
      await prisma.job.update({ where: { id: claimed.id }, data: { status: "COMPLETED", stage: null } });
      await prisma.researchProject.update({ where: { id: claimed.projectId }, data: { status: "COMPLETED" } });
      console.log(`✅ Job ${claimed.id} completed.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Job ${claimed.id} failed: ${message}`);
      await prisma.job.update({ where: { id: claimed.id }, data: { status: "FAILED", error: message } });
      await prisma.researchProject.update({ where: { id: claimed.projectId }, data: { status: "FAILED" } });
    }
  }
}

mainLoop().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});