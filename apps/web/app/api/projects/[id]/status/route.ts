// apps/web/app/api/projects/[id]/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [sourceCount, findingCount, reportCount] = await Promise.all([
    prisma.source.count({ where: { projectId: id } }),
    prisma.finding.count({ where: { question: { projectId: id } } }),
    prisma.report.count({ where: { projectId: id } }),
  ]);

  const job = project.jobs[0] ?? null;

  return NextResponse.json({
    projectStatus: project.status,
    job: job ? { status: job.status, stage: job.stage, error: job.error } : null,
    counts: { sources: sourceCount, findings: findingCount, hasReport: reportCount > 0 },
  });
}