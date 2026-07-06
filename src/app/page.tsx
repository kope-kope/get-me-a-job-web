import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]" />
        For Berkeley Haas MBAs
      </div>

      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Paste a job description.
        <br />
        Apply in 10 minutes.
      </h1>

      <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">
        Tailored resume, a cover letter that doesn&apos;t sound like a robot, and a cold email to a
        real contact at the company. All saved to your Google Drive, sent from your own Gmail.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <SignInButton />
        <span className="text-sm text-[var(--color-muted)]">
          Sign in with your @berkeley.edu account.
        </span>
      </div>

      <ul className="mt-14 grid gap-6 sm:grid-cols-3">
        <Feature title="Tailored resume">
          Every bullet rewritten to match the JD. Formatting stays perfect.
        </Feature>
        <Feature title="Cover letter with a pulse">
          Personal hook, one anchor story, no &quot;I&apos;m excited to apply.&quot;
        </Feature>
        <Feature title="Cold email to a real person">
          Finds someone on the team. Drafts value-first outreach. You approve, we send.
        </Feature>
      </ul>

      <footer className="mt-16 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)]">
        Built by Tosin Oladokun. Not affiliated with UC Berkeley. Data lives in your Google Drive
        and Gmail — see the{" "}
        <Link href="/privacy" className="underline">
          privacy note
        </Link>
        .
      </footer>
    </main>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-subtle)] p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{children}</div>
    </li>
  );
}
