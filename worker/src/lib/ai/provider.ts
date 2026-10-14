// worker/src/lib/ai/provider.ts
import { z } from "zod";

export interface GenerateStructuredParams<T extends z.ZodTypeAny> {
  schema: T;
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  generateStructured<T extends z.ZodTypeAny>(
    params: GenerateStructuredParams<T>
  ): Promise<z.infer<T>>;
}