// worker/src/lib/pipeline/planner.ts
import { z } from "zod";
import type { AIProvider } from "../ai/provider";

const PlanSchema = z.object({
  subQuestions: z.array(z.string()).min(3).max(6),
});

export async function planResearch(
  provider: AIProvider,
  originalQuestion: string
): Promise<string[]> {
  const result = await provider.generateStructured({
    schema: PlanSchema,
    schemaName: "research_plan",
    systemPrompt:
      "You are a research planner. Given a business or technology research " +
      "question, break it into 3 to 6 focused sub-questions that could each " +
      "be independently researched via web search. Each sub-question must be " +
      "self-contained (understandable without the others) and non-overlapping.",
    userPrompt: `Research question: ${originalQuestion}`,
  });
  return result.subQuestions;
}