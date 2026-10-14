// worker/src/lib/pipeline/findingExtractor.ts
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import type { AIProvider } from "../ai/provider";
import { retrieveTopK } from "./retrieval";

const FindingsSchema = z.object({
  findings: z.array(
    z.object({
      statement: z.string(),
      category: z.string(),
      confidenceLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
      confidenceReason: z.string(),
      supportingChunkIndices: z.array(z.number().int()),
    })
  ),
});

const MAX_RELEVANT_DISTANCE = 0.6;

export async function extractFindings(
  provider: AIProvider,
  prisma: PrismaClient,
  questionId: string,
  projectId: string,
  questionText: string
) {
  const retrieved = await retrieveTopK(prisma, projectId, questionText, 8);
  const chunks = retrieved.filter((c) => c.distance <= MAX_RELEVANT_DISTANCE);
  if (chunks.length === 0) return [];

  const evidenceBlock = chunks.map((c, i) => `[${i}] (source: ${c.url})\n${c.content}`).join("\n\n");

  const result = await provider.generateStructured({
    schema: FindingsSchema,
    schemaName: "extracted_findings",
    systemPrompt:
      "You are a research analyst. You will be given a research question and " +
      "a numbered list of evidence excerpts. Extract 0 to 4 findings that are " +
      "DIRECTLY supported by the evidence. Every finding must cite the index " +
      "numbers of the excerpts that support it. Never state a finding the " +
      "evidence doesn't support. If the evidence is insufficient, return an " +
      "empty findings array rather than guessing.",
    userPrompt: `Research question: ${questionText}\n\nEvidence:\n${evidenceBlock}`,
  });

  const createdFindings = [];
  for (const f of result.findings) {
    const validIndices = f.supportingChunkIndices.filter((i) => i >= 0 && i < chunks.length);
    if (validIndices.length === 0) continue;

    const finding = await prisma.finding.create({
      data: {
        questionId,
        statement: f.statement,
        category: f.category,
        confidenceLevel: f.confidenceLevel,
        confidenceReason: f.confidenceReason,
        evidence: {
          create: validIndices.map((i) => ({
            chunkId: chunks[i].chunkId,
            stance: "SUPPORTS" as const,
            excerptStart: 0,
            excerptEnd: chunks[i].content.length,
          })),
        },
      },
      include: { evidence: true },
    });
    createdFindings.push(finding);
  }
  return createdFindings;
}