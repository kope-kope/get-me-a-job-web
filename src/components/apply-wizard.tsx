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
  seniority: string;
  department: string;
  confidence: number;
  linkedin?: string;
};

type ContactResult = {
  organization: string | null;
  domain: string | null;
  contacts: Contact[];
  totalReturned: number;
  totalAtCompany: number;
};

export function ApplyWizard() {
  const [jd, setJd] = useState("");
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<Record<string, StepState>>({
    tailor: "idle",
    cover: "idle",
    contacts: "idle",
    email: "idle",
  });
  const [progress, setProgress] = useState<string>("");
  const [plan, setPlan] = useState<TailorPlan | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [coverText, setCoverText] = useState("");
  const [emailText, setEmailText] = useState("");
  const [coverSaved, setCoverSaved] = useState<SavedDoc | null>(null);
  const [emailSaved, setEmailSaved] = useState<SavedDoc | null>(null);
  const [contacts, setContacts] = useState<ContactResult | null>(null);
  const [contactSkipped, setContactSkipped] = useState<string | null>(null);
  const [pickedContact, setPickedContact] = useState<Contact | null>(null);
  const [tab, setTab] = useState<"resume" | "cover" | "email">("resume");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<"draft" | "send" | null>(null);
  const [sendResult, setSendResult] = useState<{ status: string; url?: string } | null>(null);

  async function run() {
    if (!jd.trim()) return;
    setStarted(true);
    setError(null);
    setPlan(null);
    setResult(null);
    setCoverText("");
    setEmailText("");
    setCoverSaved(null);
    setEmailSaved(null);
    setContacts(null);
    setContactSkipped(null);
    setPickedContact(null);
    setSendResult(null);
    setState({ tailor: "running", cover: "idle", contacts: "idle", email: "idle" });

    const captured: { plan: TailorPlan | null; result: TailorResult | null; contact: Contact | null } = {
      plan: null,
      result: null,
      contact: null,
    };

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

      // Contacts — best-effort. If Hunter isn't configured or returns nothing,
      // we still draft an email using a generic salutation.
      setState((s) => ({ ...s, cover: "done", contacts: "running" }));
      setProgress(`Looking up contacts at ${company ?? "the company"}…`);
      if (company) {
        try {
          const res = await fetch("/api/contacts/find", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ company, role, limit: 5 }),
          });
          const data = (await res.json()) as ContactResult & { error?: string; code?: string };
          if (!res.ok) {
            setContactSkipped(data.error ?? "Contact search failed. Drafting with a generic salutation.");
          } else if (data.contacts.length === 0) {
            setContactSkipped(`No contacts found for ${company}. Drafting with a generic salutation.`);
          } else {
            setContacts(data);
            captured.contact = data.contacts[0];
            setPickedContact(data.contacts[0]);
          }
        } catch (err) {
          setContactSkipped(err instanceof Error ? err.message : "Contact search failed.");
        }
      } else {
        setContactSkipped("Company name wasn't extracted from the JD. Skipping contact search.");
      }
      setState((s) => ({ ...s, contacts: "done", email: "running" }));
      setProgress("Drafting the cold email…");
      setTab("email");

      await streamSSE(
        "/api/email/draft",
        {
          jd,
          company,
          role,
          subfolderId,
          contactName: captured.contact?.fullName,
          contactRole: captured.contact?.position,
        },
        {
          onDelta: (text) => setEmailText((prev) => prev + text),
          onEvent: (event, data) => {
            if (event === "done") {
              const d = data as SavedDoc;
              if (d.savedDocUrl) setEmailSaved(d);
            }
          },
        },
      );
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

  async function sendEmail(mode: "draft" | "send") {
    if (!pickedContact) return;
    const parsed = parseEmail(emailText);
    if (!parsed) {
      setError("Couldn't parse Subject/body from the streamed email.");
      return;
    }
    setSending(mode);
    setSendResult(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          to: pickedContact.email,
          subject: parsed.subject,
          body: parsed.body,
        }),
      });
      const data = (await res.json()) as {
        status?: string;
        url?: string;
        draftId?: string;
        messageId?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSendResult({ status: data.status ?? mode, url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "send failed");
    } finally {
      setSending(null);
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
        <ProgressRow label="Find contact" state={state.contacts} detail={state.contacts === "running" ? progress : undefined} />
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
            <div className="space-y-3">
              {coverSaved && <SavedBanner saved={coverSaved} kind="cover letter" />}
              <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm whitespace-pre-wrap font-sans">
                {coverText || (state.cover === "idle" ? "Queued — tailored resume runs first." : "…")}
              </pre>
            </div>
          )}
          {tab === "email" && (
            <div className="space-y-3">
              {contactSkipped && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {contactSkipped}
                </div>
              )}
              {contacts && pickedContact && (
                <ContactPicker
                  contacts={contacts}
                  picked={pickedContact}
                  onPick={setPickedContact}
                />
              )}
              {emailSaved && <SavedBanner saved={emailSaved} kind="cold email" />}
              <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-subtle)] p-4 text-sm whitespace-pre-wrap font-sans">
                {emailText || (state.email === "idle" ? "Queued — cover letter runs first." : "…")}
              </pre>
              {state.email === "done" && pickedContact && (
                <SendPanel
                  contact={pickedContact}
                  sending={sending}
                  sendResult={sendResult}
                  onDraft={() => sendEmail("draft")}
                  onSend={() => sendEmail("send")}
                />
              )}
            </div>
          )}
        </div>
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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

function ContactPicker({
  contacts,
  picked,
  onPick,
}: {
  contacts: ContactResult;
  picked: Contact;
  onPick: (c: Contact) => void;
}) {
  const others = contacts.contacts.filter((c) => c.email !== picked.email);
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="font-medium">
            Drafting to {picked.fullName}
          </div>
          <div className="text-xs text-[var(--color-muted)]">
            {picked.position || "role unknown"} · {picked.email}
            {picked.linkedin && (
              <>
                {" · "}
                <a href={picked.linkedin} target="_blank" rel="noreferrer" className="underline">
                  LinkedIn
                </a>
              </>
            )}
          </div>
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          {contacts.totalAtCompany} contacts at {contacts.organization ?? contacts.domain ?? "the company"}
        </div>
      </div>
      {others.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-[var(--color-muted)]">
            Pick a different contact ({others.length} others)
          </summary>
          <ul className="mt-2 space-y-1">
            {others.map((c) => (
              <li key={c.email}>
                <button
                  onClick={() => onPick(c)}
                  className="w-full rounded-md border border-[var(--color-border)] px-2 py-1.5 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <span className="font-medium">{c.fullName}</span>{" "}
                  <span className="text-[var(--color-muted)]">
                    · {c.position || "role unknown"} · {c.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SendPanel({
  contact,
  sending,
  sendResult,
  onDraft,
  onSend,
}: {
  contact: Contact;
  sending: "draft" | "send" | null;
  sendResult: { status: string; url?: string } | null;
  onDraft: () => void;
  onSend: () => void;
}) {
  if (sendResult?.status === "sent") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        Sent to {contact.email}. It&apos;s in your Gmail Sent folder.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
      {sendResult?.status === "drafted" && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
          Drafted in Gmail —{" "}
          {sendResult.url ? (
            <a href={sendResult.url} target="_blank" rel="noreferrer" className="underline">
              open in Gmail
            </a>
          ) : (
            "check your Drafts folder"
          )}{" "}
          to review before sending.
        </div>
      )}
      <div className="text-xs text-[var(--color-muted)]">
        Sending to <span className="font-medium">{contact.fullName}</span> at{" "}
        <span className="font-medium">{contact.email}</span>.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onDraft}
          disabled={sending !== null}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60 dark:hover:bg-neutral-800"
        >
          {sending === "draft" ? "Saving draft…" : "Save as Gmail draft"}
        </button>
        <button
          onClick={onSend}
          disabled={sending !== null}
          className="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-60"
        >
          {sending === "send" ? "Sending…" : "Send now"}
        </button>
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
