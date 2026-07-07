"use client";

import { useState } from "react";
import { streamSSE } from "@/lib/sse";

type StepState = "idle" | "running" | "done" | "error";

type BulletRewrite = { oldText: string; newText: string; reason: string };

type TailorPlan = {
  company: string;
  role: string;
  bullets: BulletRewrite[];
  gapReport: string;
  positioning: string;
  skippedRewrites?: number;
};

type TailorResult = {
  tailoredDocUrl: string;
  subfolderUrl: string;
  appliedRewrites: number;
  skippedRewrites: number;
};

export function ApplyWizard() {
  const [jd, setJd] = useState("");
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<Record<string, StepState>>({
    tailor: "idle",
    cover: "idle",
    email: "idle",
  });
  const [progress, setProgress] = useState<string>("");
  const [plan, setPlan] = useState<TailorPlan | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [coverText, setCoverText] = useState("");
  const [emailText, setEmailText] = useState("");
  const [tab, setTab] = useState<"resume" | "cover" | "email">("resume");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!jd.trim()) return;
    setStarted(true);
    setError(null);
    setPlan(null);
    setResult(null);
    setCoverText("");
    setEmailText("");
    setState({ tailor: "running", cover: "idle", email: "idle" });

    try {
      await streamSSE("/api/tailor", { jd }, {
        onEvent: (event, data) => {
          if (event === "progress") {
            setProgress((data as { message: string }).message);
          } else if (event === "plan") {
            setPlan(data as TailorPlan);
          } else if (event === "done") {
            setResult(data as TailorResult);
          }
        },
      });
      setState((s) => ({ ...s, tailor: "done", cover: "running" }));
      setProgress("Writing your cover letter…");
      setTab("cover");

      // Cover letter still streams as markdown into a tab for now.
      await streamSSE("/api/cover-letter", { jd, resume: "(read from Drive)", company: plan?.company }, {
        onDelta: (text) => setCoverText((prev) => prev + text),
      });
      setState((s) => ({ ...s, cover: "done", email: "running" }));
      setProgress("Drafting the cold email…");
      setTab("email");

      await streamSSE("/api/email/draft", { jd, resume: "(read from Drive)", company: plan?.company }, {
        onDelta: (text) => setEmailText((prev) => prev + text),
      });
      setState((s) => ({ ...s, email: "done" }));
      setProgress("");
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
        <ProgressRow label="Tailored resume" state={state.tailor} detail={state.tailor === "running" ? progress : undefined} />
        <ProgressRow label="Cover letter" state={state.cover} detail={state.cover === "running" ? progress : undefined} />
        <ProgressRow label="Cold email draft" state={state.email} detail={state.email === "running" ? progress : undefined} />
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

        <div className="mt-4">
          {tab === "resume" && (
            <ResumeTab plan={plan} result={result} state={state.tailor} />
          )}
          {tab === "cover" && (
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm whitespace-pre-wrap font-sans">
              {coverText || (state.cover === "idle" ? "Queued — tailored resume runs first." : "…")}
            </pre>
          )}
          {tab === "email" && (
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm whitespace-pre-wrap font-sans">
              {emailText || (state.email === "idle" ? "Queued — cover letter runs first." : "…")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumeTab({
  plan,
  result,
  state,
}: {
  plan: TailorPlan | null;
  result: TailorResult | null;
  state: StepState;
}) {
  if (state === "idle") {
    return <div className="text-sm text-[var(--color-muted)]">Waiting to start…</div>;
  }
  if (!plan) {
    return <div className="text-sm text-[var(--color-muted)]">Reading your master resume…</div>;
  }
  return (
    <div className="space-y-5">
      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-medium text-emerald-800">
            {plan.company} — {plan.role}
          </div>
          <div className="mt-1 text-emerald-800/80">
            {result.appliedRewrites} bullet {result.appliedRewrites === 1 ? "rewrite" : "rewrites"}{" "}
            applied to your{" "}
            <a href={result.tailoredDocUrl} target="_blank" rel="noreferrer" className="underline">
              tailored Google Doc
            </a>
            {result.skippedRewrites > 0 && (
              <span>
                {" · "}
                {result.skippedRewrites} skipped (couldn&apos;t match verbatim)
              </span>
            )}
            .
          </div>
          <a
            href={result.tailoredDocUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)]"
          >
            Open in Google Docs →
          </a>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold">Bullet rewrites</h3>
        <ul className="mt-3 space-y-3">
          {plan.bullets.map((b, i) => (
            <li key={i} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
              <div className="text-xs uppercase text-[var(--color-muted)]">Before</div>
              <div className="mt-1 text-red-800/90 line-through">{b.oldText}</div>
              <div className="mt-3 text-xs uppercase text-[var(--color-muted)]">After</div>
              <div className="mt-1 text-emerald-800">{b.newText}</div>
              {b.reason && (
                <div className="mt-2 text-xs text-[var(--color-muted)] italic">{b.reason}</div>
              )}
            </li>
          ))}
          {plan.bullets.length === 0 && (
            <li className="text-sm text-[var(--color-muted)]">
              Your master resume is already strong for this JD — no bullet rewrites needed.
            </li>
          )}
        </ul>
      </div>

      {plan.gapReport && (
        <div>
          <h3 className="text-sm font-semibold">Gap report</h3>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm font-sans">
            {plan.gapReport}
          </pre>
        </div>
      )}

      {plan.positioning && (
        <div>
          <h3 className="text-sm font-semibold">Positioning</h3>
          <p className="mt-2 text-sm">{plan.positioning}</p>
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: StepState;
  detail?: string;
}) {
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
      <span className="ml-auto text-xs text-[var(--color-muted)] truncate max-w-[240px]">
        {state === "running"
          ? detail || "streaming…"
          : state === "done"
            ? "done"
            : state === "error"
              ? "failed"
              : "queued"}
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
