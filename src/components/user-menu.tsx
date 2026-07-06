"use client";

import { signOut } from "next-auth/react";

export function UserMenu({ email }: { email?: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[var(--color-muted)]">{email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        Sign out
      </button>
    </div>
  );
}
