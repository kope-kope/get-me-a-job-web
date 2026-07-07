"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StoriesLink() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ storiesDocUrl: string } | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/stories/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSaved({ storiesDocUrl: data.storiesDocUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-800">
            <CheckIcon />
            Stories saved
          </div>
          <p className="mt-1 text-emerald-800/80">
            I&apos;ll read your{" "}
            <a href={saved.storiesDocUrl} target="_blank" rel="noreferrer" className="underline">
              Stories doc
            </a>{" "}
            before every cover letter and cold email. Edit it in Drive any time — the next run
            picks up your latest.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push("/apply")}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
          >
            Apply to a job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label htmlFor="stories-url" className="text-sm font-medium">
          Paste your Stories Google Doc link
        </label>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          A doc with 3&ndash;5 STAR stories (Situation, Task, Action, Result). Every cover letter
          and cold email will draw from it.
        </p>
        <input
          id="stories-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/document/d/…"
          className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm dark:bg-neutral-900"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-3 text-xs text-[var(--color-muted)]">
        <summary className="cursor-pointer">
          Don&apos;t have stories yet? See what good STAR stories look like.
        </summary>
        <p className="mt-2">
          Open{" "}
          <a href="/example-stories" className="underline">
            the example stories page
          </a>{" "}
          in a new tab, use it as a template in Google Docs, then paste the URL here.
        </p>
      </details>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !url.trim()}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {saving ? "Saving to Drive…" : "Save stories"}
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
