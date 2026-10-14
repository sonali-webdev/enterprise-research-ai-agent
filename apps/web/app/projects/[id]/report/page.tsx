import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

interface Insight {
  statement: string;
  findingIds: string[];
}

function parseInsights(value: unknown): Insight[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      statement: typeof v.statement === "string" ? v.statement : "",
      findingIds: Array.isArray(v.findingIds)
        ? v.findingIds.filter((x): x is string => typeof x === "string")
        : [],
    }))
    .filter((i) => i.statement.length > 0);
}

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: "text-confirm",
  MEDIUM: "text-accent",
  LOW: "text-muted",
};

function InsightList({
  insights,
  findingNumber,
  tone = "default",
}: {
  insights: Insight[];
  findingNumber: Map<string, number>;
  tone?: "default" | "danger";
}) {
  if (insights.length === 0) {
    return <p className="font-sans text-sm text-muted">None identified.</p>;
  }
  const borderClass = tone === "danger" ? "border-danger" : "border-border";
  return (
    <ul className="space-y-6">
      {insights.map((insight, i) => (
        <li key={i} className={`border-l-2 ${borderClass} pl-4`}>
          <p className="font-sans text-text">{insight.statement}</p>
          {insight.findingIds.length > 0 && (
            <p className="font-sans text-sm text-muted mt-1">
              Supported by{" "}
              {insight.findingIds.map((fid, idx) => (
                <span key={fid}>
                  {idx > 0 && ", "}
                  <a href={`#finding-${fid}`} className="text-accent hover:underline">
                    #{findingNumber.get(fid) ?? "?"}
                  </a>
                </span>
              ))}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: { report: true },
  });

  if (!project) notFound();
  const { user } = await requireSession();
  if (project.userId !== user.id) notFound();
  if (!project.report) redirect(`/projects/${id}`);

  const questions = await prisma.researchQuestion.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
    include: {
      findings: {
        include: { evidence: { include: { chunk: { include: { source: true } } } } },
      },
    },
  });

  const contradictions = await prisma.contradiction.findMany({
    where: { findingA: { question: { projectId: id } } },
  });

  const sources = await prisma.source.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  const findingNumber = new Map<string, number>();
  let counter = 0;
  for (const q of questions) {
    for (const f of q.findings) {
      counter += 1;
      findingNumber.set(f.id, counter);
    }
  }

  const { report } = project;
  const trends = parseInsights(report.trends);
  const businessImplications = parseInsights(report.businessImplications);
  const risks = parseInsights(report.risks);
  const conclusions = parseInsights(report.conclusions);

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
            <nav className="font-sans text-sm text-muted space-x-4">
        <Link href={`/projects/${id}`} className="hover:text-accent transition-colors">
          ← Back to progress
        </Link>
        <Link href={`/projects/${id}/sources`} className="hover:text-accent transition-colors">
          Sources
        </Link>
        <Link href={`/projects/${id}/evidence`} className="hover:text-accent transition-colors">
          Evidence
        </Link>
      </nav>

      <p className="font-sans text-sm text-muted mt-6 mb-3">Research report</p>
      <h1 className="font-serif text-4xl leading-tight mb-16">{project.originalQuestion}</h1>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4">Executive summary</h2>
        <p className="font-sans text-text leading-relaxed max-w-prose">{report.executiveSummary}</p>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4">Research questions</h2>
        <ol className="list-decimal list-inside space-y-2 font-sans text-text">
          {questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ol>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4">Methodology</h2>
        <p className="font-sans text-text leading-relaxed max-w-prose">{report.methodology}</p>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6">Key findings</h2>
        {questions.map((q) => (
          <div key={q.id} className="mb-10">
            <h3 className="font-serif text-xl text-text mb-4">{q.text}</h3>
            {q.findings.length === 0 ? (
              <p className="font-sans text-sm text-muted">No findings for this question.</p>
            ) : (
              <div className="space-y-6">
                {q.findings.map((f) => (
                  <div
                    key={f.id}
                    id={`finding-${f.id}`}
                    className="border-l-2 border-border pl-4 scroll-mt-20"
                  >
                    <div className="flex items-center gap-3 mb-1 font-sans text-xs text-muted">
                      <span>#{findingNumber.get(f.id)}</span>
                      <span>{f.category}</span>
                      <span className={CONFIDENCE_COLOR[f.confidenceLevel] ?? "text-muted"}>
                        {f.confidenceLevel} confidence
                      </span>
                    </div>
                    <p className="font-serif text-lg text-text mb-1">{f.statement}</p>
                    <p className="font-sans text-sm text-muted mb-2">{f.confidenceReason}</p>
                    <ul className="space-y-1">
                      {f.evidence.map((e) => (
                        <li key={e.id} className="font-sans text-sm">
                          <a
                            href={e.chunk.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            {e.chunk.source.title || e.chunk.source.url}
                          </a>
                          <span className="text-muted"> — {e.stance.toLowerCase()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4">Agreements</h2>
        <p className="font-sans text-sm text-muted">
          This build doesn&apos;t yet run a dedicated agreement-detection stage —
          only contradictions are actively surfaced below. Findings that
          corroborate each other currently show up implicitly, as related
          claims within the Key Findings section above.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-2">Contradictions</h2>
        <p className="font-sans text-sm text-muted mb-6">
          Findings that directly conflict with each other, surfaced rather than silently resolved.
        </p>
        {contradictions.length === 0 ? (
          <p className="font-sans text-sm text-muted">None detected.</p>
        ) : (
          <ul className="space-y-6">
            {contradictions.map((c) => (
              <li key={c.id} className="border-l-2 border-danger pl-4">
                <p className="font-sans text-sm text-muted mb-1">
                  <a href={`#finding-${c.findingAId}`} className="text-accent hover:underline">
                    #{findingNumber.get(c.findingAId) ?? "?"}
                  </a>{" "}
                  vs.{" "}
                  <a href={`#finding-${c.findingBId}`} className="text-accent hover:underline">
                    #{findingNumber.get(c.findingBId) ?? "?"}
                  </a>
                </p>
                <p className="font-sans text-text">{c.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6">Trends</h2>
        <InsightList insights={trends} findingNumber={findingNumber} />
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6">Business implications</h2>
        <InsightList insights={businessImplications} findingNumber={findingNumber} />
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6">Risks</h2>
        <InsightList insights={risks} findingNumber={findingNumber} tone="danger" />
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6">Conclusions</h2>
        <InsightList insights={conclusions} findingNumber={findingNumber} />
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-4">Sources</h2>
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="font-sans text-sm">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {s.title || s.url}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}