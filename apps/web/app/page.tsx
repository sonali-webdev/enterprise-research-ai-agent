// apps/web/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-muted",
  RUNNING: "text-accent",
  COMPLETED: "text-confirm",
  FAILED: "text-danger",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const { user } = await requireSession();

  const projects = await prisma.researchProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <p className="font-sans text-sm text-muted mb-3">Enterprise Research</p>
          <h1 className="font-serif text-4xl leading-tight">Research history</h1>
        </div>
        <Link
          href="/new"
          className="font-sans text-sm font-medium bg-accent text-bg px-4 py-2 hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          New research
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="font-sans text-muted">
          Nothing here yet. Start your first research question to see it appear.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center justify-between gap-6 py-5 group"
              >
                <div className="min-w-0">
                  <p className="font-serif text-lg text-text truncate group-hover:text-accent transition-colors">
                    {project.title}
                  </p>
                  <p className="font-sans text-sm text-muted mt-1">
                    {formatDate(project.createdAt)}
                  </p>
                </div>
                <span
                  className={`font-sans text-sm shrink-0 ${STATUS_COLOR[project.status] ?? "text-muted"}`}
                >
                  {project.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}