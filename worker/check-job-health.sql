SELECT p.title, p.status AS project_status, j.status AS job_status, j.stage,
       j."lockedAt", j."updatedAt", now() - j."updatedAt" AS time_since_update
FROM "ResearchProject" p
JOIN "Job" j ON j."projectId" = p.id
ORDER BY j."updatedAt" DESC;