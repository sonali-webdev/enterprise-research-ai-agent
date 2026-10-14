SELECT p.title, p.status AS project_status, j.status AS job_status,
       (SELECT COUNT(*) FROM "ResearchQuestion" WHERE "projectId" = p.id) AS questions,
       (SELECT COUNT(*) FROM "Source" WHERE "projectId" = p.id) AS sources,
       (SELECT COUNT(*) FROM "Finding" f JOIN "ResearchQuestion" q ON q.id = f."questionId" WHERE q."projectId" = p.id) AS findings,
       (SELECT COUNT(*) FROM "Report" WHERE "projectId" = p.id) AS has_report
FROM "ResearchProject" p
JOIN "Job" j ON j."projectId" = p.id
ORDER BY p."createdAt" DESC
LIMIT 1;