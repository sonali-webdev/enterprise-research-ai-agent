// apps/web/app/actions/createResearch.ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function createResearch(formData: FormData) {
  const { user } = await requireSession();

  const question = (formData.get("question") as string | null)?.trim();

  if (!question || question.length < 10) {
    throw new Error("Please enter a research question of at least 10 characters.");
  }

  const project = await prisma.researchProject.create({
    data: {
      userId: user.id,
      title: question.slice(0, 80),
      originalQuestion: question,
      status: "PENDING",
      jobs: { create: { status: "QUEUED" } },
    },
  });

  redirect(`/projects/${project.id}`);
}