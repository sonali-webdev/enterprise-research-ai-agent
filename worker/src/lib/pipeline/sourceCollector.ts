// worker/src/lib/pipeline/sourceCollector.ts
import { PrismaClient } from "@prisma/client";
import type { SearchResult } from "./search";

export async function collectSources(
  prisma: PrismaClient,
  projectId: string,
  results: SearchResult[]
) {
  return Promise.all(
    results.map((r) =>
      prisma.source.upsert({
        where: { projectId_url: { projectId, url: r.url } },
        update: {},
        create: {
          projectId,
          url: r.url,
          title: r.title,
          rawContentPath: null,
          status: "FETCHED",
          fetchedAt: new Date(),
        },
      })
    )
  );
}