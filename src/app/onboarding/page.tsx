import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ConnectCard } from "@/components/connect-card";
import { scopeStatus } from "@/lib/scopes";

export default async function OnboardingIntegrations() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const status = scopeStatus(session.grantedScopes);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <OnboardingProgress step={2} />

      <h1 className="mt-6 text-2xl font-semibold">Connect your Google apps</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        You control what we can touch. Connect each one only when you&apos;re ready.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <ConnectCard integration="drive" connected={status.drive} />
        <ConnectCard integration="gmail" connected={status.gmail} />
      </div>

      <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
        <Link href="/onboarding/resume" className="underline">
          Skip Gmail for now — I only want tailored resumes
        </Link>
      </p>

      <div className="mt-10 flex items-center justify-between border-t border-[var(--color-border)] pt-6">
        <Link
          href="/"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Back
        </Link>
        <Link
          href="/onboarding/resume"
          aria-disabled={!status.drive}
          className={
            status.drive
              ? "rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
              : "pointer-events-none rounded-md bg-[var(--color-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-muted)]"
          }
        >
          Continue to upload resume
        </Link>
      </div>
    </main>
  );
}
