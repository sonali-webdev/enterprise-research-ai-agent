// worker/src/lib/pipeline/retrieval.ts
import { PrismaClient } from "@prisma/client";
import { embedText } from "./embeddings";

export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  url: string;
  content: string;
  distance: number;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function retrieveTopK(
  prisma: PrismaClient,
  projectId: string,
  query: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const vectorLiteral = toVectorLiteral(await embedText(query));
  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT c.id AS "chunkId", c."sourceId" AS "sourceId", s.url AS "url", c.content AS "content",
           c.embedding <=> ${vectorLiteral}::vector AS "distance"
    FROM "Chunk" c
    JOIN "Source" s ON s.id = c."sourceId"
    WHERE s."projectId" = ${projectId}
    ORDER BY c.embedding <=> ${vectorLiteral}::vector ASC
    LIMIT ${k}
  `;
}