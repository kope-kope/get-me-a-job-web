import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    grantedScopes?: string[];
    /** Set when the Google refresh flow failed — client should re-sign-in. */
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    grantedScopes?: string[];
    error?: string;
  }
}
