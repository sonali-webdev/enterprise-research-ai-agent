// apps/web/app/projects/[id]/ProgressView.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STAGE_ORDER: readonly string[] = [
  "PLANNING",
  "SEARCHING",
  "EMBEDDING",
  "ANALYZING",
  "DETECTING_CONTRADICTIONS",
  "GENERATING_REPORT",
];

const STAGE_LABEL: Record<string, string> = {
  PLANNING: "Planning sub-questions",
  SEARCHING: "Searching for sources",
  EMBEDDING: "Embedding evidence",
  ANALYZING: "Extracting findings",
  DETECTING_CONTRADICTIONS: "Checking for contradictions",
  GENERATING_REPORT: "Writing report",
};

interface StatusResponse {
  projectStatus: string;
  job: { status: string; stage: string | null; error: string | null } | null;
  counts: { sources: number; findings: number; hasReport: boolean };
}

export function ProgressView({ projectId }: { projectId: string }) {
  const [data, setData] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/projects/${projectId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const json: StatusResponse = await res.json();
        if (cancelled) return;
        setData(json);
        if (json.projectStatus === "COMPLETED" || json.projectStatus === "FAILED") {
          clearInterval(intervalId);
        }
      } catch {
        // transient fetch failure — the next poll will retry
      }
    }

    const intervalId = setInterval(poll, 2000);
    poll();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [projectId]);

  if (!data) {
    return <p className="font-sans text-muted">Loading status…</p>;
  }

  const { job, counts, projectStatus } = data;
  const currentStageIndex = job?.stage ? STAGE_ORDER.indexOf(job.stage) : -1;
  const isDone = projectStatus === "COMPLETED";
  const isFailed = projectStatus === "FAILED";

  return (
    <div>
      <p className="font-sans text-sm text-muted mb-6">Status: {projectStatus}</p>

      <ul className="space-y-3 mb-10">
        {STAGE_ORDER.map((stage, i) => {
          const isPast = isDone || i < currentStageIndex;
          const isActive = !isDone && i === currentStageIndex && !isFailed;
          return (
            <li key={stage} className="flex items-center gap-3 font-sans text-sm">
              <span className={isPast ? "text-confirm" : isActive ? "text-accent" : "text-muted"}>
                {isPast ? "●" : isActive ? "○" : "·"}
              </span>
              <span className={isPast || isActive ? "text-text" : "text-muted"}>
                {STAGE_LABEL[stage]}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-8 font-sans text-sm text-muted mb-10">
        <span>{counts.sources} sources</span>
        <span>{counts.findings} findings</span>
      </div>

      {isFailed && job?.error && (
        <p className="font-sans text-sm text-danger mb-6">Failed: {job.error}</p>
      )}

      {isDone && counts.hasReport && (
        <Link
          href={`/projects/${projectId}/report`}
          className="inline-block font-sans text-sm font-medium bg-accent text-bg px-5 py-2.5 hover:opacity-90 transition-opacity"
        >
          View report
        </Link>
      )}
    </div>
  );
}