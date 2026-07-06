import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserMenu } from "@/components/user-menu";
import { scopeStatus } from "@/lib/scopes";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const status = scopeStatus(session.grantedScopes);
  const needsOnboarding = !status.drive;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">get-me-a-job</h1>
        <UserMenu email={session.user.email} />
      </header>

      {needsOnboarding ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
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

      <section className="mt-10">
        <h2 className="text-sm font-medium text-[var(--color-muted)]">Your applications</h2>
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-subtle)] p-8 text-center text-sm text-[var(--color-muted)]">
          No applications yet. Paste a JD and we&apos;ll get you started.
        </div>
      </section>

      <section className="mt-10 text-xs text-[var(--color-muted)]">
        <div>
          Drive:{" "}
          <span className={status.drive ? "text-emerald-600" : "text-amber-600"}>
            {status.drive ? "connected" : "not connected"}
          </span>
          {" · "}Gmail:{" "}
          <span className={status.gmail ? "text-emerald-600" : "text-amber-600"}>
            {status.gmail ? "connected" : "not connected"}
          </span>
          {!status.gmail && (
            <>
              {" · "}
              <Link href="/onboarding" className="underline">
                connect Gmail
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
