SELECT id, "chunkIndex", LEFT(content, 60) AS preview, vector_dims(embedding) AS dims
FROM "Chunk"
ORDER BY "sourceId", "chunkIndex"
LIMIT 10;