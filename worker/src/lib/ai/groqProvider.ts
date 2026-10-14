// worker/src/lib/ai/groqProvider.ts
import Groq from "groq-sdk";
import { z } from "zod";
import type { AIProvider, GenerateStructuredParams } from "./provider";

const STRUCTURED_MODEL = "openai/gpt-oss-20b";
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GroqProvider implements AIProvider {
  readonly name = "groq";
  private client: Groq;

  constructor(apiKey: string | undefined = process.env.GROQ_API_KEY) {
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    this.client = new Groq({ apiKey });
  }

  async generateStructured<T extends z.ZodTypeAny>(
    params: GenerateStructuredParams<T>
  ): Promise<z.infer<T>> {
    const jsonSchema = z.toJSONSchema(params.schema, { target: "draft-2020-12" });
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model: STRUCTURED_MODEL,
          max_completion_tokens: params.maxTokens ?? 2048,
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: params.userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: params.schemaName,
              strict: true,
              schema: jsonSchema as Record<string, unknown>,
            },
          },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new Error(`Groq (${STRUCTURED_MODEL}) returned an empty response`);

        return params.schema.parse(JSON.parse(raw));
      } catch (err) {
        lastError = err;
        console.warn(
          `⚠️  generateStructured attempt ${attempt}/${MAX_ATTEMPTS} failed for "${params.schemaName}": ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt);
      }
    }

    throw new Error(
      `Groq structured generation failed after ${MAX_ATTEMPTS} attempts for "${params.schemaName}": ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
}