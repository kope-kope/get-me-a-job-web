import Link from "next/link";
import { CmgResumePreview } from "@/components/cmg-resume-preview";
import { EXAMPLE_RESUME } from "@/lib/example-resume";

export const metadata = {
  title: "Example resume — CMG one-pager format",
  description:
    "What a well-formatted one-page MBA-style resume looks like. Use this as a reference for the master resume you upload to get-me-a-job.",
};

export default function ExampleResumePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-muted)]">Reference · MBA one-pager format</p>
          <h1 className="mt-1 text-2xl font-semibold">What a good master resume looks like</h1>
        </div>
        <Link
          href="/onboarding/resume"
          className="text-sm text-[var(--color-accent)] underline"
        >
          ← Back to upload
        </Link>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted)]">
        A one-page format most MBA career offices teach — bold-caps section headers, right-aligned
        dates, italic role titles, action-verb bullets with real metrics. Point our app at a Google
        Doc formatted like this, and every tailored resume it produces will keep the same shape.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-[var(--color-border)] bg-neutral-100 p-6 dark:bg-neutral-900">
        <CmgResumePreview data={EXAMPLE_RESUME} />
      </div>

      <div className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm">
        <div className="font-medium">Ready to go?</div>
        <p className="mt-1 text-[var(--color-muted)]">
          Open your resume in Google Docs (if it&apos;s a .docx, upload to Drive and it converts
          automatically), copy the URL, and paste it into the app.
        </p>
        <Link
          href="/onboarding/resume"
          className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)]"
        >
          Upload my resume →
        </Link>
      </div>
    </main>
  );
}
