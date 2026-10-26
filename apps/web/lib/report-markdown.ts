// apps/web/lib/report-markdown.ts
import { citedSources, type Insight, type LoadedReport } from "./report-data";

function escapeLinkText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function link(title: string, url: string): string {
  const safeUrl = url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `[${escapeLinkText(title)}](${safeUrl})`;
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "research-report";
}

function insightLines(insights: Insight[], findingNumber: Map<string, number>): string[] {
  if (insights.length === 0) return ["_None identified._", ""];
  const lines = insights.map((insight) => {
    const refs = insight.findingIds.map((id) => `#${findingNumber.get(id) ?? "?"}`).join(", ");
    return `- ${insight.statement}${refs ? ` _(supported by ${refs})_` : ""}`;
  });
  return [...lines, ""];
}

export function buildMarkdown(data: LoadedReport): string {
  const report = data.report;
  if (!report) throw new Error("Report has not been generated yet.");

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

  const out: string[] = [];

  out.push(`# ${project.originalQuestion}`, "");
  out.push(
    `_Generated ${report.generatedAt.toISOString().slice(0, 10)} by Enterprise Research Agent_`,
    ""
  );

  out.push("## Executive summary", "", report.executiveSummary, "");

  out.push("## Research questions", "");
  questions.forEach((q, i) => out.push(`${i + 1}. ${q.text}`));
  out.push("");

  out.push("## Methodology", "", report.methodology, "");

  out.push("## Key findings", "");
  for (const q of questions) {
    out.push(`### ${q.text}`, "");
    if (q.findings.length === 0) {
      out.push("_No findings for this question._", "");
      continue;
    }
    for (const f of q.findings) {
      out.push(`**#${findingNumber.get(f.id)} · ${f.category} · ${f.confidenceLevel} confidence**`, "");
      out.push(f.statement, "");
      out.push(`> ${f.confidenceReason}`, "");
      for (const s of citedSources(f.evidence)) {
        const passages = s.passages > 1 ? ` (${s.passages} passages)` : "";
        out.push(`- ${link(s.title, s.url)} — ${s.stance}${passages}`);
      }
      out.push("");
    }
  }

  out.push("## Contradictions", "");
  if (contradictions.length === 0) {
    out.push("None detected.", "");
  } else {
    for (const c of contradictions) {
      const a = findingNumber.get(c.findingAId) ?? "?";
      const b = findingNumber.get(c.findingBId) ?? "?";
      out.push(`- **#${a} vs. #${b}:** ${c.explanation}`);
    }
    out.push("");
  }

  out.push("## Trends", "", ...insightLines(trends, findingNumber));
  out.push("## Business implications", "", ...insightLines(businessImplications, findingNumber));
  out.push("## Risks", "", ...insightLines(risks, findingNumber));
  out.push("## Conclusions", "", ...insightLines(conclusions, findingNumber));

  out.push("## Sources", "");
  for (const s of sources) {
    out.push(`- ${link(s.title || s.url, s.url)}`);
  }
  out.push("");

  return out.join("\n");
}