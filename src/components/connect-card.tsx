"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { DRIVE_SCOPES, GMAIL_SCOPES } from "@/lib/scopes";

type Integration = "drive" | "gmail";

const CONFIG: Record<
  Integration,
  {
    title: string;
    subtitle: string;
    scopes: readonly string[];
    icon: React.ReactNode;
    tint: "success" | "accent";
  }
> = {
  drive: {
    title: "Google Drive and Docs",
    subtitle:
      "We'll create a Job Search folder and save your tailored resumes and cover letters there.",
    scopes: DRIVE_SCOPES,
    tint: "success",
    icon: <DriveIcon />,
  },
  gmail: {
    title: "Gmail",
    subtitle: "Send cold outreach from your own inbox. We always draft first and wait for your OK.",
    scopes: GMAIL_SCOPES,
    tint: "accent",
    icon: <MailIcon />,
  },
};

export function ConnectCard({
  integration,
  connected,
  redirectTo = "/onboarding",
}: {
  integration: Integration;
  connected: boolean;
  redirectTo?: string;
}) {
  const c = CONFIG[integration];
  const [busy, setBusy] = useState(false);

  const bgClass = c.tint === "success" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4 dark:bg-neutral-900">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgClass}`}>
        {c.icon}
      </div>
      <div className="flex-1">
        <div className="font-medium">{c.title}</div>
        <div className="mt-0.5 text-sm text-[var(--color-muted)]">{c.subtitle}</div>
      </div>
      {connected ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
          <CheckIcon />
          Connected
        </span>
      ) : (
        <button
          onClick={async () => {
            setBusy(true);
            await signIn(
              "google",
              { callbackUrl: redirectTo },
              { scope: ["openid", "email", "profile", ...c.scopes].join(" ") },
            );
          }}
          disabled={busy}
          className="min-w-[90px] rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 dark:hover:bg-neutral-800"
        >
          {busy ? "…" : "Connect"}
        </button>
      )}
    </div>
  );
}

function DriveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 10L4 22h16L12 10z" />
      <path d="M12 10l6-8h-4L8 12" />
      <path d="M4 22l4-10h8l4 10" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
