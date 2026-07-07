import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, hasGrantedScopes } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import { ApplyWizard } from "@/components/apply-wizard";

export default async function ApplyPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!hasGrantedScopes(session, DRIVE_SCOPES)) redirect("/onboarding");

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
        Paste the JD. I&apos;ll copy your Master Resume, rewrite the bullets that need to change,
        and save the tailored doc to a per-job folder in Drive.
      </p>

      <ApplyWizard />
    </main>
  );
}
