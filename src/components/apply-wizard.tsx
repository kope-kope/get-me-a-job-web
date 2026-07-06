"use client";

import { useState } from "react";
import { streamText } from "@/lib/sse";

type StepState = "idle" | "running" | "done" | "error";

type Result = {
  tailoredResume: string;
  coverLetter: string;
  coldEmail: string;
};

const EMPTY: Result = { tailoredResume: "", coverLetter: "", coldEmail: "" };

export function ApplyWizard({ resume }: { resume: string }) {
  const [jd, setJd] = useState("");
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<Result>(EMPTY);
  const [state, setState] = useState<Record<string, StepState>>({
    tailor: "idle",
    cover: "idle",
    email: "idle",
  });
  const [tab, setTab] = useState<"resume" | "cover" | "email">("resume");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!jd.trim()) return;
    setStarted(true);
    setError(null);
    setResult(EMPTY);
    setState({ tailor: "running", cover: "idle", email: "idle" });

    try {
      await streamText("/api/tailor", { jd, resume }, (text) =>
        setResult((r) => ({ ...r, tailoredResume: r.tailoredResume + text })),
      );
      setState((s) => ({ ...s, tailor: "done", cover: "running" }));

      await streamText("/api/cover-letter", { jd, resume }, (text) =>
        setResult((r) => ({ ...r, coverLetter: r.coverLetter + text })),
      );
      setState((s) => ({ ...s, cover: "done", email: "running" }));

      await streamText("/api/email/draft", { jd, resume }, (text) =>
        setResult((r) => ({ ...r, coldEmail: r.coldEmail + text })),
      );
      setState((s) => ({ ...s, email: "done" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "generation failed");
      setState((s) => {
        const next = { ...s };
        for (const k of Object.keys(next)) if (next[k] === "running") next[k] = "error";
        return next;
      });
    }
  }

  if (!started) {
    return (
      <div className="mt-8">
        <label className="text-sm font-medium">Job description</label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full JD here — title, responsibilities, requirements, everything."
          className="mt-2 h-72 w-full rounded-lg border border-[var(--color-border)] bg-white p-4 text-sm dark:bg-neutral-900"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={run}
            disabled={!jd.trim()}
            className="rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            Generate application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] p-4">
        <ProgressRow label="Tailored resume" state={state.tailor} />
        <ProgressRow label="Cover letter" state={state.cover} />
        <ProgressRow label="Cold email draft" state={state.email} />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <div className="flex gap-2 border-b border-[var(--color-border)]">
          <TabBtn active={tab === "resume"} onClick={() => setTab("resume")}>
            Resume
          </TabBtn>
          <TabBtn active={tab === "cover"} onClick={() => setTab("cover")}>
            Cover letter
          </TabBtn>
          <TabBtn active={tab === "email"} onClick={() => setTab("email")}>
            Cold email
          </TabBtn>
        </div>
        <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm whitespace-pre-wrap font-sans">
          {tab === "resume" && (result.tailoredResume || "…")}
          {tab === "cover" && (result.coverLetter || "…")}
          {tab === "email" && (result.coldEmail || "…")}
        </pre>
      </div>
    </div>
  );
}

function ProgressRow({ label, state }: { label: string; state: StepState }) {
  const dot = {
    idle: "bg-neutral-300",
    running: "bg-blue-500 animate-pulse",
    done: "bg-emerald-500",
    error: "bg-red-500",
  }[state];
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
      <span className={state === "running" ? "font-medium" : ""}>{label}</span>
      <span className="ml-auto text-xs text-[var(--color-muted)]">
        {state === "running" ? "streaming…" : state === "done" ? "done" : state === "error" ? "failed" : "queued"}
      </span>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "-mb-px border-b-2 px-3 py-2 text-sm " +
        (active
          ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
          : "border-transparent text-[var(--color-muted)]")
      }
    >
      {children}
    </button>
  );
}
