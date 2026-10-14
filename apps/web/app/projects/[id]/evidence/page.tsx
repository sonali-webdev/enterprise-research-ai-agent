// apps/web/app/projects/[id]/evidence/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

const STANCE_COLOR: Record<string, string> = {
  SUPPORTS: "text-confirm",
  CONTRADICTS: "text-danger",
};

interface EvidenceRow {
  id: string;
  stance: string;
  findingId: string;
  finding: { statement: string };
  chunk: { content: string; source: { id: string; url: string; title: string | null } };
}

export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { id } = await params;
  const { source: sourceFilter } = await searchParams;

  const { user } = await requireSession();
  const project = await prisma.researchProject.findUnique({ where: { id } });
  if (!project || project.userId !== user.id) notFound();

  const evidence: EvidenceRow[] = await prisma.evidence.findMany({
    where: {
      finding: { question: { projectId: id } },
      ...(sourceFilter ? { chunk: { sourceId: sourceFilter } } : {}),
    },
    include: {
      finding: true,
      chunk: { include: { source: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const filteredSource = sourceFilter
    ? await prisma.source.findUnique({ where: { id: sourceFilter } })
    : null;

  // Grouped by source, not by question — the complementary cut to the report's
  // by-question-then-finding structure: "everything pulled from one place."
  const grouped = new Map<string, { source: EvidenceRow["chunk"]["source"]; items: EvidenceRow[] }>();
  for (const e of evidence) {
    const key = e.chunk.source.id;
    if (!grouped.has(key)) grouped.set(key, { source: e.chunk.source, items: [] });
    grouped.get(key)!.items.push(e);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <nav className="font-sans text-sm text-muted space-x-4 mb-6">
        <Link href={`/projects/${id}/report`} className="hover:text-accent transition-colors">
          ← Back to report
        </Link>
        <Link href={`/projects/${id}/sources`} className="hover:text-accent transition-colors">
          Sources →
        </Link>
      </nav>

      <p className="font-sans text-sm text-muted mb-3">Evidence explorer</p>
      <h1 className="font-serif text-3xl leading-tight mb-2">
        {filteredSource ? filteredSource.title || filteredSource.url : project.originalQuestion}
      </h1>
      <p className="font-sans text-sm text-muted mb-12">
        {evidence.length} excerpt{evidence.length === 1 ? "" : "s"}
        {filteredSource && (
          <>
            {" "}
            from this source ·{" "}
            <Link href={`/projects/${id}/evidence`} className="text-accent hover:underline">
              clear filter
            </Link>
          </>
        )}
      </p>

      {evidence.length === 0 ? (
        <p className="font-sans text-muted">No evidence collected yet.</p>
      ) : (
        <div className="space-y-12">
          {Array.from(grouped.values()).map(({ source, items }) => (
            <div key={source.id}>
              {!filteredSource && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif text-lg text-text hover:text-accent transition-colors block mb-4"
                >
                  {source.title || source.url}
                </a>
              )}
              <ul className="space-y-6">
                {items.map((e) => (
                  <li key={e.id} className="border-l-2 border-border pl-4">
                    <p className="font-sans text-sm text-text leading-relaxed">“{e.chunk.content}”</p>
                    <p className="font-sans text-xs text-muted mt-2">
                      <span className={STANCE_COLOR[e.stance] ?? "text-muted"}>{e.stance.toLowerCase()}</span>
                      {" · "}
                      <Link
                        href={`/projects/${id}/report#finding-${e.findingId}`}
                        className="text-accent hover:underline"
                      >
                        {e.finding.statement.slice(0, 60)}
                        {e.finding.statement.length > 60 ? "…" : ""}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}