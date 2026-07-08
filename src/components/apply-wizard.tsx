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
  subfolderId: string;
  subfolderUrl: string;
  company: string;
  role: string;
  appliedRewrites: number;
  skippedRewrites: number;
};

type SavedDoc = {
  savedDocUrl: string;
  title: string;
  saveError?: string;
};

type Contact = {
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string;
  reasoning?: string;
  linkedinUrl?: string;
  verificationStatus?: string;
  score?: number;
};

type ResearchedContact = {
  firstName: string;
  lastName: string;
  position: string;
  linkedinUrl?: string;
  reasoning: string;
  sourceUrl?: string;
};

type ResearchResult = {
  company: string;
  domain?: string;
  contacts: ResearchedContact[];
  notes?: string;
};

type LookupResult = {
  results: Array<
    ResearchedContact & {
      found: boolean;
      email?: string;
      score?: number;
      verificationStatus?: string;
      error?: string;
    }
  >;
  quotaHit: boolean;
  foundCount: number;
};

type EmailStream = {
  contact: Contact;
  text: string;
  saved: SavedDoc | null;
  state: StepState;
  sending: "draft" | "send" | null;
  sendResult: { status: string; url?: string } | null;
  error: string | null;
};

const OUTREACH_COUNT = 3;

const INITIAL_STATE: Record<string, StepState> = {
  tailor: "idle",
  cover: "idle",
  research: "idle",
  lookup: "idle",
  emails: "idle",
};

function anyRunning(state: Record<string, StepState>) {
  return Object.values(state).some((s) => s === "running");
}

function allDone(state: Record<string, StepState>) {
  return Object.values(state).every((s) => s === "done");
}

export function ApplyWizard() {
  const [jd, setJd] = useState("");
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<Record<string, StepState>>({ ...INITIAL_STATE });
  const [progress, setProgress] = useState<string>("");
  const [plan, setPlan] = useState<TailorPlan | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [coverText, setCoverText] = useState("");
  const [coverSaved, setCoverSaved] = useState<SavedDoc | null>(null);
  const [contactSkipped, setContactSkipped] = useState<string | null>(null);
  const [researchNotes, setResearchNotes] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailStream[]>([]);
  const [tab, setTab] = useState<"resume" | "cover" | "email">("resume");
  const [error, setError] = useState<string | null>(null);

  function updateEmail(index: number, patch: Partial<EmailStream>) {
    setEmails((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function appendEmailText(index: number, text: string) {
    setEmails((prev) =>
      prev.map((e, i) => (i === index ? { ...e, text: e.text + text } : e)),
    );
  }

  function reset(confirmFirst = true) {
    if (confirmFirst && anyRunning(state)) {
      const ok = window.confirm(
        "Something's still streaming. Start a new application anyway?",
      );
      if (!ok) return;
    }
    setJd("");
    setStarted(false);
    setState({ ...INITIAL_STATE });
    setProgress("");
    setPlan(null);
    setResult(null);
    setCoverText("");
    setCoverSaved(null);
    setContactSkipped(null);
    setResearchNotes(null);
    setEmails([]);
    setTab("resume");
    setError(null);
  }

  async function run() {
    if (!jd.trim()) return;
    setStarted(true);
    setError(null);
    setPlan(null);
    setResult(null);
    setCoverText("");
    setCoverSaved(null);
    setContactSkipped(null);
    setResearchNotes(null);
    setEmails([]);
    setState({ tailor: "running", cover: "idle", research: "idle", lookup: "idle", emails: "idle" });

    const captured: {
      plan: TailorPlan | null;
      result: TailorResult | null;
      contacts: Contact[];
    } = { plan: null, result: null, contacts: [] };

    try {
      await streamSSE("/api/tailor", { jd }, {
        onEvent: (event, data) => {
          if (event === "progress") {
            setProgress((data as { message: string }).message);
          } else if (event === "plan") {
            const p = data as TailorPlan;
            captured.plan = p;
            setPlan(p);
          } else if (event === "done") {
            const r = data as TailorResult;
            captured.result = r;
            setResult(r);
          }
        },
      });
      setState((s) => ({ ...s, tailor: "done", cover: "running" }));
      setProgress("Writing your cover letter…");
      setTab("cover");

      const company = captured.result?.company ?? captured.plan?.company;
      const role = captured.result?.role ?? captured.plan?.role;
      const subfolderId = captured.result?.subfolderId;

      await streamSSE(
        "/api/cover-letter",
        { jd, company, role, subfolderId },
        {
          onDelta: (text) => setCoverText((prev) => prev + text),
          onEvent: (event, data) => {
            if (event === "done") {
              const d = data as SavedDoc;
              if (d.savedDocUrl) setCoverSaved(d);
            }
          },
        },
      );

      // Phase 1: research — Claude + web_search identifies real named targets.
      setState((s) => ({ ...s, cover: "done", research: "running" }));
      setProgress(`Researching hiring managers at ${company ?? "the company"}…`);
      let researched: ResearchedContact[] = [];
      let researchDomain: string | undefined;
      if (company && role) {
        try {
          const res = await fetch("/api/contacts/research", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jd, company, role }),
          });
          const data = (await res.json()) as ResearchResult & { error?: string };
          if (!res.ok) {
            setContactSkipped(data.error ?? `Research returned HTTP ${res.status}`);
          } else if (data.contacts.length === 0) {
            setContactSkipped(
              data.notes ??
                `Couldn't identify named targets at ${company}. Rest of the application still saved.`,
            );
          } else {
            researched = data.contacts.slice(0, OUTREACH_COUNT);
            researchDomain = data.domain;
            if (data.notes) setResearchNotes(data.notes);
          }
        } catch (err) {
          setContactSkipped(err instanceof Error ? err.message : "Research failed.");
        }
      } else {
        setContactSkipped("Company or role wasn't extracted from the JD — skipping outreach.");
      }
      setState((s) => ({ ...s, research: "done" }));

      if (researched.length === 0) {
        setState((s) => ({ ...s, lookup: "done", emails: "done" }));
        setProgress("");
        setTab("email");
        return;
      }

      // Phase 2: Hunter Email Finder for each researched name.
      setState((s) => ({ ...s, lookup: "running" }));
      setProgress(`Looking up ${researched.length} email${researched.length === 1 ? "" : "s"}…`);
      try {
        const res = await fetch("/api/contacts/lookup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            targets: researched.map((r) => ({
              firstName: r.firstName,
              lastName: r.lastName,
              company,
              domain: researchDomain,
              position: r.position,
              linkedinUrl: r.linkedinUrl,
              reasoning: r.reasoning,
            })),
          }),
        });
        const data = (await res.json()) as LookupResult & { error?: string; code?: string };
        if (!res.ok) {
          setContactSkipped(
            data.error ?? `Hunter lookup returned HTTP ${res.status}.`,
          );
        } else {
          for (const r of data.results) {
            if (r.found && r.email) {
              captured.contacts.push({
                email: r.email,
                firstName: r.firstName,
                lastName: r.lastName,
                fullName: `${r.firstName} ${r.lastName}`.trim(),
                position: r.position,
                reasoning: r.reasoning,
                linkedinUrl: r.linkedinUrl,
                verificationStatus: r.verificationStatus,
                score: r.score,
              });
            }
          }
          if (data.quotaHit) {
            setContactSkipped(
              `Hunter quota ran out partway through lookup. ${data.foundCount} of ${data.results.length} emails found; the rest can be reached manually.`,
            );
          } else if (data.foundCount === 0) {
            setContactSkipped(
              `Found ${researched.length} target${researched.length === 1 ? "" : "s"} via research, but Hunter couldn't verify any emails. Names still saved in the research notes.`,
            );
          }
        }
      } catch (err) {
        setContactSkipped(err instanceof Error ? err.message : "Email lookup failed.");
      }
      setState((s) => ({ ...s, lookup: "done" }));

      if (captured.contacts.length === 0) {
        // Nothing to draft. Leave emails empty and mark as done.
        setState((s) => ({ ...s, emails: "done" }));
        setProgress("");
        setTab("email");
        return;
      }

      // Seed one EmailStream per contact and switch to the email tab so
      // the user watches the drafts fill in.
      setEmails(
        captured.contacts.map((c) => ({
          contact: c,
          text: "",
          saved: null,
          state: "idle",
          sending: null,
          sendResult: null,
          error: null,
        })),
      );
      setState((s) => ({ ...s, emails: "running" }));
      setTab("email");

      for (let i = 0; i < captured.contacts.length; i++) {
        const contact = captured.contacts[i];
        setProgress(`Drafting email ${i + 1} of ${captured.contacts.length} — to ${contact.fullName}…`);
        updateEmail(i, { state: "running" });
        try {
          await streamSSE(
            "/api/email/draft",
            {
              jd,
              company,
              role,
              subfolderId,
              contactName: contact.fullName,
              contactRole: contact.position,
            },
            {
              onDelta: (text) => appendEmailText(i, text),
              onEvent: (event, data) => {
                if (event === "done") {
                  const d = data as SavedDoc;
                  if (d.savedDocUrl) updateEmail(i, { saved: d });
                }
              },
            },
          );
          updateEmail(i, { state: "done" });
        } catch (err) {
          updateEmail(i, {
            state: "error",
            error: err instanceof Error ? err.message : "email draft failed",
          });
        }
      }
      setState((s) => ({ ...s, emails: "done" }));
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

  async function sendEmail(index: number, mode: "draft" | "send") {
    const email = emails[index];
    if (!email) return;
    const parsed = parseEmail(email.text);
    if (!parsed) {
      updateEmail(index, {
        error: "Couldn't parse Subject/body from the streamed email. Edit the doc and send from Gmail directly.",
      });
      return;
    }
    updateEmail(index, { sending: mode, sendResult: null, error: null });
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          to: email.contact.email,
          subject: parsed.subject,
          body: parsed.body,
        }),
      });
      const data = (await res.json()) as {
        status?: string;
        url?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      updateEmail(index, {
        sending: null,
        sendResult: { status: data.status ?? mode, url: data.url },
      });
    } catch (err) {
      updateEmail(index, {
        sending: null,
        error: err instanceof Error ? err.message : "send failed",
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
          className="mt-2 h-72 w-full rounded-lg border p-4 text-sm"
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

  const done = allDone(state);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="text-[var(--color-muted)]">
          {plan?.company && plan?.role ? (
            <>
              Applying to <span className="font-medium text-[var(--color-foreground)]">{plan.company}</span> ·{" "}
              {plan.role}
            </>
          ) : (
            "Streaming your application…"
          )}
        </div>
        <button
          onClick={() => reset()}
          className="text-xs text-[var(--color-muted)] underline hover:text-[var(--color-foreground)]"
        >
          Start over
        </button>
      </div>

      {done && result && (
        <CompletionBanner
          result={result}
          emailCount={emails.length}
          onNewApplication={() => reset(false)}
        />
      )}

      <div className="rounded-xl border border-[var(--color-border)] p-4">
        <ProgressRow label="Tailored resume" state={state.tailor} detail={state.tailor === "running" ? progress : undefined} />
        <ProgressRow label="Cover letter" state={state.cover} detail={state.cover === "running" ? progress : undefined} />
        <ProgressRow label={`Research ${OUTREACH_COUNT} contacts`} state={state.research} detail={state.research === "running" ? progress : undefined} />
        <ProgressRow label="Look up emails" state={state.lookup} detail={state.lookup === "running" ? progress : undefined} />
        <ProgressRow label={`Draft ${OUTREACH_COUNT} cold emails`} state={state.emails} detail={state.emails === "running" ? progress : undefined} />
      </div>

      {error && (
        <div className="rounded-md border border-l-4 border-[var(--color-border)] border-l-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-fg)]">
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
            Cold outreach{emails.length > 0 ? ` (${emails.length})` : ""}
          </TabBtn>
        </div>

        <div className="mt-4">
          {tab === "resume" && (
            <ResumeTab plan={plan} result={result} state={state.tailor} />
          )}
          {tab === "cover" && (
            <div className="space-y-3">
              {coverSaved && <SavedBanner saved={coverSaved} kind="cover letter" />}
              <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm whitespace-pre-wrap font-sans">
                {coverText || (state.cover === "idle" ? "Queued — tailored resume runs first." : "…")}
              </pre>
            </div>
          )}
          {tab === "email" && (
            <div className="space-y-4">
              {contactSkipped && (
                <div className="rounded-lg border border-l-4 border-[var(--color-border)] border-l-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-fg)]">
                  {contactSkipped}
                </div>
              )}
              {emails.length === 0 && !contactSkipped && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-6 text-center text-sm text-[var(--color-muted)]">
                  {state.emails === "idle" ? "Queued — tailored resume and cover letter run first." : "Waiting for contact search…"}
                </div>
              )}
              {emails.map((e, i) => (
                <EmailCard
                  key={e.contact.email}
                  index={i}
                  email={e}
                  onDraft={() => sendEmail(i, "draft")}
                  onSend={() => sendEmail(i, "send")}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletionBanner({
  result,
  emailCount,
  onNewApplication,
}: {
  result: TailorResult;
  emailCount: number;
  onNewApplication: () => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-sm font-semibold text-emerald-900">
        Application ready
      </div>
      <div className="mt-1 text-sm text-emerald-800/80">
        Everything&apos;s saved to your{" "}
        <a
          href={result.subfolderUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          {result.company} - {result.role}
        </a>{" "}
        folder in Drive — tailored resume, cover letter
        {emailCount > 0 && `, and ${emailCount} cold email${emailCount === 1 ? "" : "s"}`}
        . Send the outreach when you&apos;re ready, then move on.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onNewApplication}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
        >
          Apply to another job
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm hover:bg-[var(--color-subtle)]"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}

function parseEmail(text: string): { subject: string; body: string } | null {
  const m = text.match(/^\s*Subject:\s*(.+?)\s*\n+([\s\S]+)$/);
  if (!m) return null;
  return { subject: m[1].trim(), body: m[2].trim() };
}

function SavedBanner({ saved, kind }: { saved: SavedDoc; kind: string }) {
  if (saved.saveError) {
    return (
      <div className="rounded-lg border border-l-4 border-[var(--color-border)] border-l-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-fg)]">
        Streamed above, but couldn&apos;t save the {kind} to Drive: {saved.saveError}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      Saved as{" "}
      <a href={saved.savedDocUrl} target="_blank" rel="noreferrer" className="font-medium underline">
        {saved.title}
      </a>{" "}
      in the same Drive folder as the tailored resume.
    </div>
  );
}

function EmailCard({
  index,
  email,
  onDraft,
  onSend,
}: {
  index: number;
  email: EmailStream;
  onDraft: () => void;
  onSend: () => void;
}) {
  const isSent = email.sendResult?.status === "sent";
  const isDrafted = email.sendResult?.status === "drafted";

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--color-muted)]">Recipient {index + 1}</div>
          <div className="mt-0.5 font-medium">{email.contact.fullName}</div>
          <div className="text-xs text-[var(--color-muted)]">
            {email.contact.position || "role unknown"} · {email.contact.email}
            {email.contact.linkedinUrl && (
              <>
                {" · "}
                <a href={email.contact.linkedinUrl} target="_blank" rel="noreferrer" className="underline">
                  LinkedIn
                </a>
              </>
            )}
            {email.contact.verificationStatus && (
              <>
                {" · verified "}
                <span className={email.contact.verificationStatus === "valid" ? "text-emerald-600" : "text-[var(--color-warning)]"}>
                  {email.contact.verificationStatus}
                </span>
              </>
            )}
          </div>
          {email.contact.reasoning && (
            <div className="mt-2 text-xs italic text-[var(--color-muted)]">
              {email.contact.reasoning}
            </div>
          )}
        </div>
        <StatePill state={email.state} />
      </div>

      {email.saved && (
        <div className="mt-3">
          <SavedBanner saved={email.saved} kind="cold email" />
        </div>
      )}

      <pre className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-3 text-sm whitespace-pre-wrap font-sans">
        {email.text || (email.state === "idle" ? "Queued." : "…")}
      </pre>

      {email.error && (
        <div className="mt-3 rounded-md border border-l-4 border-[var(--color-border)] border-l-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-2 text-sm text-[var(--color-danger-fg)]">
          {email.error}
        </div>
      )}

      {isSent && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
          Sent to {email.contact.email}. In your Gmail Sent folder.
        </div>
      )}
      {isDrafted && !isSent && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
          Drafted in Gmail —{" "}
          {email.sendResult?.url ? (
            <a href={email.sendResult.url} target="_blank" rel="noreferrer" className="underline">
              open in Gmail
            </a>
          ) : (
            "check your Drafts folder"
          )}
          .
        </div>
      )}

      {email.state === "done" && !isSent && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onDraft}
            disabled={email.sending !== null}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60 dark:hover:bg-neutral-800"
          >
            {email.sending === "draft" ? "Saving draft…" : "Save as Gmail draft"}
          </button>
          <button
            onClick={onSend}
            disabled={email.sending !== null}
            className="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
          >
            {email.sending === "send" ? "Sending…" : `Send to ${email.contact.firstName || email.contact.fullName}`}
          </button>
        </div>
      )}
    </div>
  );
}

function StatePill({ state }: { state: StepState }) {
  const styles = {
    idle: "bg-[var(--color-subtle)] text-[var(--color-muted)]",
    running: "bg-[var(--color-subtle)] text-[var(--color-foreground)]",
    done: "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
    error: "border border-[var(--color-foreground)] text-[var(--color-foreground)]",
  }[state];
  const label = {
    idle: "queued",
    running: "streaming",
    done: "ready",
    error: "failed",
  }[state];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${styles}`}>{label}</span>
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
              <div className="mt-1 text-[var(--color-muted)] line-through">{b.oldText}</div>
              <div className="mt-3 text-xs uppercase text-[var(--color-muted)]">After</div>
              <div className="mt-1 text-[var(--color-foreground)]">{b.newText}</div>
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
    idle: "bg-[var(--color-border)]",
    running: "bg-[var(--color-foreground)] animate-pulse",
    done: "bg-[var(--color-foreground)]",
    error: "border-2 border-[var(--color-foreground)]",
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
