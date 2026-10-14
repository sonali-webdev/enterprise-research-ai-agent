// apps/web/app/new/page.tsx
import { requireSession } from "@/lib/auth-helpers";
import { createResearch } from "@/app/actions/createResearch";

export default async function NewResearchPage() {
  await requireSession();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="font-sans text-sm text-muted mb-3">Enterprise Research</p>
      <h1 className="font-serif text-4xl leading-tight mb-4">
        What do you need researched?
      </h1>
      <p className="font-sans text-muted mb-10 max-w-prose">
        Describe a business or technology question in a sentence or two. The
        agent will break it down, search for sources, and return a cited
        report with the evidence behind every claim.
      </p>

      <form action={createResearch} className="space-y-6">
        <div>
          <label htmlFor="question" className="block font-sans text-sm text-muted mb-2">
            Research question
          </label>
          <textarea
            id="question"
            name="question"
            required
            minLength={10}
            rows={3}
            placeholder="Should a mid-sized SaaS company adopt a four-day work week?"
            className="w-full bg-transparent border-0 border-b border-border focus:border-b-2 focus:border-accent focus:outline-none font-serif text-xl text-text placeholder:text-muted/60 py-2 resize-none transition-all"
          />
        </div>

        <button
          type="submit"
          className="font-sans text-sm font-medium bg-accent text-bg px-5 py-2.5 hover:opacity-90 transition-opacity"
        >
          Start research
        </button>
      </form>
    </main>
  );
}