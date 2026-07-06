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
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        const granted = ((account.scope as string) || "").split(" ").filter(Boolean);
        token.grantedScopes = granted;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.grantedScopes = (token.grantedScopes as string[]) ?? [];
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
