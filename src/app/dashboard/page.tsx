import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserMenu } from "@/components/user-menu";
import { scopeStatus } from "@/lib/scopes";
import { findMasterResume, findStoriesDoc, listApplications, type ApplicationSummary } from "@/lib/google";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const status = scopeStatus(session.grantedScopes);
  const needsOnboarding = !status.drive;

  const master = status.drive && session.accessToken
    ? await findMasterResume(session.accessToken)
    : null;
  const stories = status.drive && session.accessToken
    ? await findStoriesDoc(session.accessToken)
    : null;
  const applications: ApplicationSummary[] =
    status.drive && session.accessToken
      ? await listApplications(session.accessToken)
      : [];

  const needsResume = status.drive && !master;
  const canApply = !!master;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">get-me-a-job</h1>
        <UserMenu email={session.user.email} />
      </header>

      {needsOnboarding ? (
        <div className="mt-8 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-fg)]">
          <div className="font-medium">Finish onboarding to get started</div>
          <p className="mt-1 text-[var(--color-muted)]">
            Connect Google Drive so we can save your tailored resumes and cover letters.
          </p>
          <Link
            href="/onboarding"
            className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-fg)]"
          >
            Continue onboarding
          </Link>
        </div>
      ) : needsResume ? (
        <div className="mt-8 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-fg)]">
          <div className="font-medium">Register your master resume</div>
          <p className="mt-1 text-[var(--color-muted)]">
            Paste a Google Doc link to your resume so every tailored version can start from it.
          </p>
          <Link
            href="/onboarding/resume"
            className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-fg)]"
          >
            Add resume
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-[var(--color-accent-fg)]"
          >
            Apply to a new job
          </Link>
        </div>
      )}

      {canApply && !stories && (
        <div className="mt-6 rounded-xl border border-[var(--color-border)] p-4 text-sm">
          <div className="font-medium">Add interview stories for sharper writing</div>
          <p className="mt-1 text-[var(--color-muted)]">
            Optional but recommended. Cover letters and cold emails become noticeably more personal
            when they can draw from real STAR stories.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/onboarding/stories"
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-fg)]"
            >
              Add stories
            </Link>
            <Link
              href="/example-stories"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              See an example
            </Link>
          </div>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-[var(--color-muted)]">
            Your applications
            {applications.length > 0 && (
              <span className="ml-2 text-xs">({applications.length})</span>
            )}
          </h2>
          <span className="text-xs text-[var(--color-muted)]">
            Read live from your Drive · no database
          </span>
        </div>
        {applications.length === 0 ? (
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-subtle)] p-8 text-center text-sm text-[var(--color-muted)]">
            No applications yet. Paste a JD and we&apos;ll get you started.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {applications.map((app) => (
              <li key={app.id}>
                <a
                  href={app.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-[var(--color-border)] p-4 transition hover:border-[var(--color-accent)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{app.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {formatRelativeDate(app.createdTime)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-muted)]">
                    Open the Drive folder →
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 text-xs text-[var(--color-muted)]">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Drive:{" "}
            <span className={status.drive ? "font-medium text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
              {status.drive ? "connected" : "not connected"}
            </span>
          </span>
          <span>
            Gmail:{" "}
            <span className={status.gmail ? "font-medium text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
              {status.gmail ? "connected" : "not connected"}
            </span>
          </span>
          <span>
            Master resume:{" "}
            <span className={master ? "font-medium text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
              {master ? "registered" : "not registered"}
            </span>
          </span>
          <span>
            Stories:{" "}
            <span className={stories ? "text-emerald-600" : "text-neutral-500"}>
              {stories ? "registered" : "optional"}
            </span>
          </span>
        </div>
        {!status.gmail && (
          <div className="mt-2">
            <Link href="/onboarding" className="underline">
              Connect Gmail
            </Link>{" "}
            to send outreach from your inbox.
          </div>
        )}
      </section>
    </main>
  );
}

function formatRelativeDate(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
