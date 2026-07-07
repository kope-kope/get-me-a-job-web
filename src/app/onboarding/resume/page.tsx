import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ResumeLink } from "@/components/resume-link";
import { hasGrantedScopes } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";

export default async function ResumeStep() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!hasGrantedScopes(session, DRIVE_SCOPES)) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <OnboardingProgress step={3} />

      <h1 className="mt-6 text-2xl font-semibold">Point me at your master resume</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Not a file — a Google Doc link. Every tailored resume copies this doc and swaps
        specific bullets, so your formatting stays exactly the way you built it.
      </p>

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Not sure what format Haas expects?{" "}
        <Link href="/example-resume" className="underline">
          See the CMG example →
        </Link>
      </p>

      <ResumeLink />
    </main>
  );
}
