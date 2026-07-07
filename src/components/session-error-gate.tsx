"use client";

import { useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";

/**
 * Watches the current session for a refresh error (Google refused to
 * exchange the refresh token) and auto-triggers a fresh sign-in. Users
 * shouldn't have to manually click "sign in again" when the access token
 * dies — it happens hourly.
 *
 * Runs on every page via the root layout. No-op if the user isn't signed
 * in or the session is healthy.
 */
export function SessionErrorGate() {
  const { data: session, status } = useSession();
  const triggered = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.error) return;
    if (triggered.current) return;
    triggered.current = true;
    // Send them back to the same page after re-auth so the flow they were
    // in the middle of resumes cleanly.
    const returnTo = window.location.pathname + window.location.search;
    signIn("google", { callbackUrl: returnTo });
  }, [status, session?.error]);

  return null;
}
