SELECT fa.statement AS finding_a, fb.statement AS finding_b, c.explanation
FROM "Contradiction" c
JOIN "Finding" fa ON fa.id = c."findingAId"
JOIN "Finding" fb ON fb.id = c."findingBId";