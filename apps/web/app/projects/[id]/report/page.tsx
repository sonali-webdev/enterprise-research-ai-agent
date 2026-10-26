// apps/web/app/projects/[id]/report/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { citedSources, loadReport, type Insight } from "@/lib/report-data";
import { PrintButton } from "@/components/PrintButton";

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
        <li key={i} className={`border-l-2 ${borderClass} pl-4 break-inside-avoid`}>
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
  const { user } = await requireSession();

  const data = await loadReport(id, user.id);
  if (!data) notFound();

  const report = data.report;
  if (!report) redirect(`/projects/${id}`);

  const {
    project,
    questions,
    contradictions,
    sources,
    findingNumber,
    trends,
    businessImplications,
    risks,
    conclusions,
  } = data;

  const generated = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
    report.generatedAt
  );

  return (
    <main className="print-urls mx-auto max-w-2xl px-6 py-20 print:max-w-none print:px-0 print:py-0">
      <nav className="print:hidden font-sans text-sm text-muted flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={`/projects/${id}`} className="hover:text-accent transition-colors">
          ← Back to progress
        </Link>
        <Link href={`/projects/${id}/sources`} className="hover:text-accent transition-colors">
          Sources
        </Link>
        <Link href={`/projects/${id}/evidence`} className="hover:text-accent transition-colors">
          Evidence
        </Link>
        <a
          href={`/api/projects/${id}/export`}
          download
          className="hover:text-accent transition-colors"
        >
          Download Markdown
        </a>
        <PrintButton />
      </nav>

      <p className="font-sans text-sm text-muted mt-6 mb-3">Research report</p>
      <h1 className="font-serif text-4xl leading-tight mb-2">{project.originalQuestion}</h1>
      <p className="font-sans text-sm text-muted mb-16">Generated {generated}</p>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4 break-after-avoid">Executive summary</h2>
        <p className="font-sans text-text leading-relaxed max-w-prose">{report.executiveSummary}</p>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4 break-after-avoid">Research questions</h2>
        <ol className="list-decimal list-inside space-y-2 font-sans text-text">
          {questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ol>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4 break-after-avoid">Methodology</h2>
        <p className="font-sans text-text leading-relaxed max-w-prose">{report.methodology}</p>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6 break-after-avoid">Key findings</h2>
        {questions.map((q) => (
          <div key={q.id} className="mb-10">
            <h3 className="font-serif text-xl text-text mb-4 break-after-avoid">{q.text}</h3>
            {q.findings.length === 0 ? (
              <p className="font-sans text-sm text-muted">No findings for this question.</p>
            ) : (
              <div className="space-y-6">
                {q.findings.map((f) => (
                  <div
                    key={f.id}
                    id={`finding-${f.id}`}
                    className="border-l-2 border-border pl-4 scroll-mt-20 break-inside-avoid"
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
                      {citedSources(f.evidence).map((s) => (
                        <li key={`${s.url}-${s.stance}`} className="font-sans text-sm">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            {s.title}
                          </a>
                          <span className="text-muted">
                            {" "}
                            — {s.stance}
                            {s.passages > 1 ? ` (${s.passages} passages)` : ""}
                          </span>
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

      <section className="mb-16 print:hidden">
        <h2 className="font-serif text-2xl mb-4">Agreements</h2>
        <p className="font-sans text-sm text-muted">
          This build doesn&apos;t yet run a dedicated agreement-detection stage —
          only contradictions are actively surfaced below. Findings that
          corroborate each other currently show up implicitly, as related
          claims within the Key Findings section above.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-2 break-after-avoid">Contradictions</h2>
        <p className="font-sans text-sm text-muted mb-6">
          Findings that directly conflict with each other, surfaced rather than silently resolved.
        </p>
        {contradictions.length === 0 ? (
          <p className="font-sans text-sm text-muted">None detected.</p>
        ) : (
          <ul className="space-y-6">
            {contradictions.map((c) => (
              <li key={c.id} className="border-l-2 border-danger pl-4 break-inside-avoid">
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
        <h2 className="font-serif text-2xl mb-6 break-after-avoid">Trends</h2>
        <InsightList insights={trends} findingNumber={findingNumber} />
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6 break-after-avoid">Business implications</h2>
        <InsightList insights={businessImplications} findingNumber={findingNumber} />
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6 break-after-avoid">Risks</h2>
        <InsightList insights={risks} findingNumber={findingNumber} tone="danger" />
      </section>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6 break-after-avoid">Conclusions</h2>
        <InsightList insights={conclusions} findingNumber={findingNumber} />
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-4 break-after-avoid">Sources</h2>
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="font-sans text-sm">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {s.title || s.url}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}