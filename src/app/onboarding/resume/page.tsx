import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ResumeUpload } from "@/components/resume-upload";

export default async function ResumeStep() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <OnboardingProgress step={3} />

      <h1 className="mt-6 text-2xl font-semibold">Upload your master resume</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        This is the source of truth. Every tailored resume will start from here.
      </p>

      <ResumeUpload />
    </main>
  );
}
