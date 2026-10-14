// worker/src/lib/pipeline/contradictionDetector.ts
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import type { AIProvider } from "../ai/provider";

const ContradictionsSchema = z.object({
  contradictions: z.array(
    z.object({
      findingAIndex: z.number().int(),
      findingBIndex: z.number().int(),
      explanation: z.string(),
    })
  ),
});

export async function detectContradictions(
  provider: AIProvider,
  prisma: PrismaClient,
  projectId: string
) {
  const findings = await prisma.finding.findMany({ where: { question: { projectId } } });
  if (findings.length < 2) return [];

  const findingsBlock = findings.map((f, i) => `[${i}] (${f.category}) ${f.statement}`).join("\n");

  const result = await provider.generateStructured({
    schema: ContradictionsSchema,
    schemaName: "detected_contradictions",
    systemPrompt:
      "You will be given a numbered list of research findings from the same " +
      "project. Identify pairs that GENUINELY CONTRADICT each other — " +
      "opposite claims about the same specific fact, not just different " +
      "topics or complementary details. Do not report a pair unless they " +
      "cannot both be true as stated. If no findings genuinely contradict, " +
      "return an empty array.",
    userPrompt: `Findings:\n${findingsBlock}`,
  });

  const created = [];
  for (const c of result.contradictions) {
    if (c.findingAIndex === c.findingBIndex) continue;
    if (c.findingAIndex < 0 || c.findingAIndex >= findings.length) continue;
    if (c.findingBIndex < 0 || c.findingBIndex >= findings.length) continue;
    created.push(
      await prisma.contradiction.create({
        data: {
          findingAId: findings[c.findingAIndex].id,
          findingBId: findings[c.findingBIndex].id,
          explanation: c.explanation,
        },
      })
    );
  }
  return created;
}