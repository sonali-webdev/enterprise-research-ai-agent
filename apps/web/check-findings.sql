SELECT f.statement, f.category, f."confidenceLevel", e."chunkId", s.url
FROM "Finding" f
JOIN "Evidence" e ON e."findingId" = f.id
JOIN "Chunk" c ON c.id = e."chunkId"
JOIN "Source" s ON s.id = c."sourceId"
LIMIT 10;