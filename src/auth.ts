import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Base OAuth scopes granted at sign-in — just enough to identify the user
 * and confirm they're on the Berkeley Workspace.
 */
const BASE_SCOPES = ["openid", "email", "profile"];

/**
 * Extended scopes users can grant later, one integration at a time, via
 * incremental authorization. Never bundled into the sign-in consent.
 */
export const EXTRA_SCOPES = {
  drive: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
  gmail: ["https://www.googleapis.com/auth/gmail.modify"],
} as const;

export const ALLOWED_EMAIL_DOMAINS = ["berkeley.edu"] as const;

/** Refresh the access token this many seconds before it actually expires. */
const EXPIRY_BUFFER_SECONDS = 60;

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
} | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const body = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };
    if (!res.ok || !body.access_token || !body.expires_in) {
      console.error("Google token refresh failed", res.status, body);
      return null;
    }
    return {
      accessToken: body.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + body.expires_in,
      refreshToken: body.refresh_token,
    };
  } catch (err) {
    console.error("Google token refresh threw", err);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: BASE_SCOPES.join(" "),
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? "";
      const domain = email.split("@")[1]?.toLowerCase();
      return ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]);
    },
    async jwt({ token, account }) {
      // Fresh sign-in — store everything the OAuth provider handed us.
      if (account) {
        const granted = ((account.scope as string) || "").split(" ").filter(Boolean);
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          grantedScopes: granted,
          error: undefined,
        };
      }

      // Subsequent session read. If the access token is still valid (with
      // a small buffer), return the token untouched.
      const now = Math.floor(Date.now() / 1000);
      if (typeof token.expiresAt === "number" && now < token.expiresAt - EXPIRY_BUFFER_SECONDS) {
        return token;
      }

      // Access token expired (or about to). Exchange the refresh token.
      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenError" };
      }

      const refreshed = await refreshGoogleAccessToken(token.refreshToken as string);
      if (!refreshed) {
        return { ...token, error: "RefreshTokenError" };
      }
      return {
        ...token,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
        refreshToken: refreshed.refreshToken ?? token.refreshToken,
        error: undefined,
      };
    },
    async session({ session, token }) {
      session.accessToken = token.error
        ? undefined
        : (token.accessToken as string | undefined);
      session.grantedScopes = (token.grantedScopes as string[]) ?? [];
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
});

export function hasGrantedScopes(session: { grantedScopes?: string[] } | null, needed: readonly string[]): boolean {
  if (!session?.grantedScopes) return false;
  return needed.every((s) => session.grantedScopes!.includes(s));
}

export type SessionGuardIssue =
  | { kind: "unauthorized" }
  | { kind: "session-expired" }
  | { kind: "missing-scopes"; needed: readonly string[] };

export function guardGoogleSession(
  session: { user?: unknown; accessToken?: string; error?: string; grantedScopes?: string[] } | null,
  needed?: readonly string[],
): SessionGuardIssue | null {
  if (!session?.user) return { kind: "unauthorized" };
  if (session.error === "RefreshTokenError" || !session.accessToken) {
    return { kind: "session-expired" };
  }
  if (needed && !needed.every((s) => session.grantedScopes?.includes(s))) {
    return { kind: "missing-scopes", needed };
  }
  return null;
}

export function sessionGuardResponse(issue: SessionGuardIssue): Response {
  const body =
    issue.kind === "unauthorized"
      ? { error: "unauthorized", code: "SIGN_IN" }
      : issue.kind === "session-expired"
        ? {
            error: "Your Google session expired. Sign in again to continue.",
            code: "REAUTH",
          }
        : {
            error: "Missing Google permission. Reconnect the required scope.",
            code: "MISSING_SCOPE",
            needed: issue.needed,
          };
  const status = issue.kind === "missing-scopes" ? 403 : 401;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
