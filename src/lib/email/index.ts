import type { EmailProvider, EmailProviderId } from "./types";
import { gmailProvider } from "./gmail";
import { resendProvider } from "./resend";
import { smtpProvider } from "./smtp";

export * from "./types";

const PROVIDER_IDS: readonly EmailProviderId[] = ["gmail", "resend", "smtp"];

/** Which backends can stage a draft vs. send only. */
const DRAFT_CAPABLE: Record<EmailProviderId, boolean> = {
  gmail: true,
  resend: false,
  smtp: false,
};

/**
 * The configured provider id, defaulting to "gmail". Never throws — an
 * unrecognized value falls back to gmail so a typo can't crash page renders.
 * The active provider factory (getEmailProvider) is the strict one.
 */
export function emailProviderId(): EmailProviderId {
  const raw = (process.env.EMAIL_PROVIDER ?? "gmail").toLowerCase();
  return PROVIDER_IDS.includes(raw as EmailProviderId) ? (raw as EmailProviderId) : "gmail";
}

export function providerSupportsDrafts(id: EmailProviderId = emailProviderId()): boolean {
  return DRAFT_CAPABLE[id];
}

/**
 * Build the active email provider from EMAIL_PROVIDER. Constructors do NOT
 * validate their API keys here — that happens lazily inside send()/createDraft
 * so this stays safe to call from server components. Throws only on an
 * unknown EMAIL_PROVIDER value.
 */
export function getEmailProvider(): EmailProvider {
  const id = (process.env.EMAIL_PROVIDER ?? "gmail").toLowerCase();
  switch (id) {
    case "gmail":
      return gmailProvider();
    case "resend":
      return resendProvider();
    case "smtp":
      return smtpProvider();
    default:
      throw new Error(`Unknown EMAIL_PROVIDER "${id}". Set it to gmail, resend, or smtp.`);
  }
}
