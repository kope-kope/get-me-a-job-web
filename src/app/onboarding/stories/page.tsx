import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, hasGrantedScopes } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import { StoriesLink } from "@/components/stories-link";

export default async function StoriesStep() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!hasGrantedScopes(session, DRIVE_SCOPES)) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-[var(--color-muted)]">Optional but recommended</p>

      <h1 className="mt-2 text-2xl font-semibold">Add your interview stories</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Without these, cover letters and cold emails have to work from your resume alone. With
        them, the writing gets specific: real anchor stories, real hooks, real detail.
      </p>

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        See{" "}
        <Link href="/example-stories" className="underline">
          what good STAR stories look like →
        </Link>
      </p>

      <StoriesLink />

      <p className="mt-8 text-xs text-[var(--color-muted)]">
        Not ready?{" "}
        <Link href="/dashboard" className="underline">
          Skip for now
        </Link>{" "}
        — you can come back anytime.
      </p>
    </main>
  );
}
