// worker/src/lib/pipeline/reportGenerator.ts
import { z } from "zod";
import { Prisma, PrismaClient } from "@prisma/client";
import type { AIProvider } from "../ai/provider";

const InsightSchema = z.object({
  statement: z.string(),
  supportingFindingIndices: z.array(z.number().int()),
});

const ReportSchema = z.object({
  executiveSummary: z.string(),
  methodology: z.string(),
  trends: z.array(InsightSchema),
  businessImplications: z.array(InsightSchema),
  risks: z.array(InsightSchema),
  conclusions: z.array(InsightSchema),
});

export async function generateReport(provider: AIProvider, prisma: PrismaClient, projectId: string) {
  const project = await prisma.researchProject.findUniqueOrThrow({ where: { id: projectId } });
  const findings = await prisma.finding.findMany({ where: { question: { projectId } } });
  const contradictions = await prisma.contradiction.findMany({
    where: { findingA: { question: { projectId } } },
  });

  if (findings.length === 0) {
    throw new Error("Cannot generate a report with zero findings.");
  }

  const findingsBlock = findings
    .map((f, i) => `[${i}] (${f.category}, ${f.confidenceLevel}) ${f.statement}`)
    .join("\n");
  const contradictionsBlock = contradictions.length
    ? contradictions.map((c) => `- ${c.explanation}`).join("\n")
    : "(none detected)";

  const result = await provider.generateStructured({
    schema: ReportSchema,
    schemaName: "research_report",
    maxTokens: 8192,
    systemPrompt:
      "You are writing a structured research report. You will be given the " +
      "original research question, a numbered list of findings, and any " +
      "known contradictions. Write an executive summary and methodology " +
      "description, then extract trends, business implications, risks, and " +
      "conclusions as arrays of statements. EVERY statement in those four " +
      "arrays MUST cite the index numbers of the findings that support it. " +
      "Never introduce a claim not traceable to a listed finding. " +
      "Acknowledge contradictions explicitly rather than silently picking a side.",
    userPrompt:
      `Original research question: ${project.originalQuestion}\n\n` +
      `Findings:\n${findingsBlock}\n\n` +
      `Known contradictions:\n${contradictionsBlock}`,
  });

  const resolveIndices = (indices: number[]): string[] =>
    indices.filter((i) => i >= 0 && i < findings.length).map((i) => findings[i].id);
  const resolveInsights = (insights: z.infer<typeof InsightSchema>[]) =>
    insights
      .map((ins) => ({ statement: ins.statement, findingIds: resolveIndices(ins.supportingFindingIndices) }))
      .filter((ins) => ins.findingIds.length > 0);

  const trends = resolveInsights(result.trends) as Prisma.InputJsonValue;
  const businessImplications = resolveInsights(result.businessImplications) as Prisma.InputJsonValue;
  const risks = resolveInsights(result.risks) as Prisma.InputJsonValue;
  const conclusions = resolveInsights(result.conclusions) as Prisma.InputJsonValue;

  return prisma.report.upsert({
    where: { projectId },
    update: {
      executiveSummary: result.executiveSummary,
      methodology: result.methodology,
      trends, businessImplications, risks, conclusions,
      generatedAt: new Date(),
    },
    create: {
      projectId,
      executiveSummary: result.executiveSummary,
      methodology: result.methodology,
      trends, businessImplications, risks, conclusions,
    },
  });
}