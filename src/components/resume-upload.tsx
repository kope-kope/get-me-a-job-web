"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResumeUpload() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
      const data = await res.json();
      setParsed(data.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse the file.");
    } finally {
      setParsing(false);
    }
  }

  function handlePaste() {
    if (!text.trim()) return;
    setParsed(text);
  }

  async function save() {
    if (!parsed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/resume/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: parsed }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  if (parsed) {
    return (
      <div className="mt-6">
        <label className="text-sm font-medium">Review and edit your resume</label>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Make sure the bullets and metrics are accurate — this is what every tailored resume will
          start from.
        </p>
        <textarea
          value={parsed}
          onChange={(e) => setParsed(e.target.value)}
          className="mt-3 h-96 w-full rounded-lg border border-[var(--color-border)] bg-white p-3 font-mono text-sm dark:bg-neutral-900"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setParsed(null)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Start over
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            {saving ? "Saving to Drive…" : "Save and continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".docx,.pdf,.txt,.md"
            onChange={handleFile}
            className="hidden"
            disabled={parsing}
          />
          <div className="text-sm font-medium">
            {parsing ? "Parsing…" : "Upload .docx, PDF, or plain text"}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">
            Or drop a file. We&apos;ll extract the text.
          </div>
        </label>
      </div>

      <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        or paste it
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your resume text here…"
          className="h-48 w-full rounded-lg border border-[var(--color-border)] bg-white p-3 text-sm dark:bg-neutral-900"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handlePaste}
            disabled={!text.trim()}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            Continue with pasted text
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
