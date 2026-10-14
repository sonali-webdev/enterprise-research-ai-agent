// worker/src/lib/pipeline/embedSource.ts
import { PrismaClient } from "@prisma/client";
import { chunkText } from "./chunker";
import { embedText } from "./embeddings";

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function embedAndStoreChunks(
  prisma: PrismaClient,
  sourceId: string,
  rawContent: string
): Promise<number> {
  const pieces = chunkText(rawContent, 500);
  for (let i = 0; i < pieces.length; i++) {
    const embedding = await embedText(pieces[i]);
    const chunk = await prisma.chunk.create({ data: { sourceId, content: pieces[i], chunkIndex: i } });
    await prisma.$executeRaw`
      UPDATE "Chunk" SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${chunk.id}
    `;
  }
  return pieces.length;
}