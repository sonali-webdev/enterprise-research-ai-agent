// apps/web/lib/report-data.ts
import { prisma } from "./prisma";

export interface Insight {
  statement: string;
  findingIds: string[];
}

export function parseInsights(value: unknown): Insight[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      statement: typeof v.statement === "string" ? v.statement : "",
      findingIds: Array.isArray(v.findingIds)
        ? v.findingIds.filter((x): x is string => typeof x === "string")
        : [],
    }))
    .filter((i) => i.statement.length > 0);
}

interface EvidenceLike {
  stance: string;
  chunk: { source: { id: string; url: string; title: string | null } };
}

export interface CitedSource {
  url: string;
  title: string;
  stance: string;
  passages: number;
}

// Several chunks can come from the same article. Collapse them into one
// line per (source, stance) with a passage count.
export function citedSources(evidence: EvidenceLike[]): CitedSource[] {
  const grouped = new Map<string, CitedSource>();
  for (const e of evidence) {
    const s = e.chunk.source;
    const key = `${s.id}:${e.stance}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.passages += 1;
    } else {
      grouped.set(key, {
        url: s.url,
        title: s.title || s.url,
        stance: e.stance.toLowerCase(),
        passages: 1,
      });
    }
  }
  return Array.from(grouped.values());
}

// Returns null when the project doesn't exist or isn't owned by userId.
export async function loadReport(projectId: string, userId: string) {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: { report: true },
  });
  if (!project || project.userId !== userId) return null;

  const [questions, contradictions, sources] = await Promise.all([
    prisma.researchQuestion.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        findings: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: {
            evidence: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              include: { chunk: { include: { source: true } } },
            },
          },
        },
      },
    }),
    prisma.contradiction.findMany({
      where: { findingA: { question: { projectId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.source.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Finding numbers (#1, #2, ...) follow question order, then finding order.
  const findingNumber = new Map<string, number>();
  let counter = 0;
  for (const q of questions) {
    for (const f of q.findings) {
      counter += 1;
      findingNumber.set(f.id, counter);
    }
  }

  const report = project.report;

  return {
    project,
    report,
    questions,
    contradictions,
    sources,
    findingNumber,
    trends: parseInsights(report?.trends),
    businessImplications: parseInsights(report?.businessImplications),
    risks: parseInsights(report?.risks),
    conclusions: parseInsights(report?.conclusions),
  };
}

export type LoadedReport = NonNullable<Awaited<ReturnType<typeof loadReport>>>;