// apps/web/app/projects/[id]/sources/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-muted",
  FETCHED: "text-confirm",
  FAILED: "text-danger",
};

export default async function SourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { user } = await requireSession();
  const project = await prisma.researchProject.findUnique({ where: { id } });
  if (!project || project.userId !== user.id) notFound();

  const sources = await prisma.source.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    include: { chunks: { include: { evidence: true } } },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <nav className="font-sans text-sm text-muted space-x-4 mb-6">
        <Link href={`/projects/${id}/report`} className="hover:text-accent transition-colors">
          ← Back to report
        </Link>
        <Link href={`/projects/${id}/evidence`} className="hover:text-accent transition-colors">
          Evidence explorer →
        </Link>
      </nav>

      <p className="font-sans text-sm text-muted mb-3">Sources</p>
      <h1 className="font-serif text-3xl leading-tight mb-2">{project.originalQuestion}</h1>
      <p className="font-sans text-sm text-muted mb-12">{sources.length} sources collected</p>

      {sources.length === 0 ? (
        <p className="font-sans text-muted">No sources collected yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {sources.map((s) => {
            const chunkCount = s.chunks.length;
            const findingIds = new Set(s.chunks.flatMap((c) => c.evidence.map((e) => e.findingId)));
            return (
              <li key={s.id} className="py-5">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif text-lg text-text hover:text-accent transition-colors"
                >
                  {s.title || s.url}
                </a>
                <div className="font-sans text-sm text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span className={STATUS_COLOR[s.status] ?? "text-muted"}>{s.status}</span>
                  <span>{chunkCount} chunk{chunkCount === 1 ? "" : "s"}</span>
                  <span>cited in {findingIds.size} finding{findingIds.size === 1 ? "" : "s"}</span>
                  {findingIds.size > 0 && (
                    <Link
                      href={`/projects/${id}/evidence?source=${s.id}`}
                      className="text-accent hover:underline"
                    >
                      View evidence
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}