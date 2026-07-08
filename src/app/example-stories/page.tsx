import Link from "next/link";
import { StarStoryPreview } from "@/components/star-story-preview";
import { EXAMPLE_STORIES } from "@/lib/example-stories";

export const metadata = {
  title: "Example stories — STAR format",
  description:
    "What good behavioral-interview stories look like for MBA hiring. Use these as templates for the Stories Google Doc you paste into get-me-a-job.",
};

export default function ExampleStoriesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-muted)]">Reference · STAR format</p>
          <h1 className="mt-1 text-2xl font-semibold">What good interview stories look like</h1>
        </div>
        <Link href="/onboarding/stories" className="text-sm text-[var(--color-accent)] underline">
          ← Back to onboarding
        </Link>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted)]">
        Cover letters and cold outreach get sharper when they draw from real STAR stories.
        Situation and Task set context in two sentences each. Action is what YOU did, not the team.
        Result has a number or an observable change.
      </p>

      <p className="mt-3 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-fg)]">
        <strong>Aim for 3&ndash;5 stories</strong> that cover: leadership without authority, failure
        and recovery, data-driven decision under ambiguity, and a cross-functional conflict you
        navigated. Every interviewer draws from those buckets.
      </p>

      <div className="mt-8 space-y-4">
        {EXAMPLE_STORIES.map((story, i) => (
          <StarStoryPreview key={i} story={story} />
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm">
        <div className="font-medium">Ready?</div>
        <p className="mt-1 text-[var(--color-muted)]">
          Write 3&ndash;5 of your own in a Google Doc using this shape, then paste the URL on the
          onboarding page.
        </p>
        <Link
          href="/onboarding/stories"
          className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)]"
        >
          Add my stories →
        </Link>
      </div>
    </main>
  );
}
