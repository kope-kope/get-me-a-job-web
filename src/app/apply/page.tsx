import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApplyWizard } from "@/components/apply-wizard";

// Placeholder for the master resume until we read it back from Drive.
const PLACEHOLDER_RESUME = `# Master resume

_This is a placeholder until we wire Drive read-back into the app. In the meantime, paste your resume text here or edit this file._`;

export default async function ApplyPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-[var(--color-muted)] underline">
          ← Back to dashboard
        </Link>
        <span className="text-sm text-[var(--color-muted)]">
          Signed in as {session.user.email}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-semibold">New application</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Paste the JD. We&apos;ll tailor your resume, write a cover letter, and draft a cold email.
      </p>

      <ApplyWizard resume={PLACEHOLDER_RESUME} />
    </main>
  );
}
