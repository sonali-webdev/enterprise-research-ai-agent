// apps/web/app/projects/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { ProgressView } from "./ProgressView";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireSession();

  const project = await prisma.researchProject.findUnique({ where: { id } });
  if (!project || project.userId !== user.id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="font-sans text-sm text-muted mb-3">Research</p>
      <h1 className="font-serif text-3xl leading-tight mb-10">{project.originalQuestion}</h1>
      <ProgressView projectId={id} />
    </main>
  );
}