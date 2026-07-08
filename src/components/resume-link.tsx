"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResumeLink() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{
    masterDocUrl: string;
    folderUrl: string;
  } | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/resume/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSaved({ masterDocUrl: data.masterDocUrl, folderUrl: data.folderUrl });
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
            Master resume saved
          </div>
          <p className="mt-1 text-emerald-800/80">
            I copied your doc into a{" "}
            <a href={saved.folderUrl} target="_blank" rel="noreferrer" className="underline">
              Job Search folder
            </a>{" "}
            in Drive. Every tailored resume will start as a fresh copy of your{" "}
            <a href={saved.masterDocUrl} target="_blank" rel="noreferrer" className="underline">
              Master Resume
            </a>{" "}
            — your formatting stays perfect.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label htmlFor="doc-url" className="text-sm font-medium">
          Paste your Google Doc link
        </label>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          The one that&apos;s formatted the way you want — bold company names, italic titles, clean
          spacing. I&apos;ll copy it into your Drive so tailoring never loses formatting.
        </p>
        <input
          id="doc-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/document/d/…"
          className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-fg)]">
          {error}
        </div>
      )}

      <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-3 text-xs text-[var(--color-muted)]">
        <summary className="cursor-pointer">How do I get the link?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Open your resume in Google Docs. If it&apos;s a .docx, upload it to Drive first —
            Drive will convert it.
          </li>
          <li>Copy the URL from your browser bar. It looks like <code>docs.google.com/document/d/…</code>.</li>
          <li>Paste it above.</li>
        </ol>
      </details>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !url.trim()}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {saving ? "Saving to Drive…" : "Save master resume"}
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
