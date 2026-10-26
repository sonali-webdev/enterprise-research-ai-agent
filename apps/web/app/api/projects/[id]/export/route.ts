// apps/web/app/api/projects/[id]/export/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { loadReport } from "@/lib/report-data";
import { buildMarkdown, slugify } from "@/lib/report-markdown";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await loadReport(id, session.user.id);
  if (!data || !data.report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const markdown = buildMarkdown(data);

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(data.project.originalQuestion)}.md"`,
      "Cache-Control": "no-store",
    },
  });
}