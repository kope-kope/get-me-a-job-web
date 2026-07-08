/**
 * Email provider abstraction.
 *
 * The app can send outreach through different backends (Gmail, Resend, SMTP)
 * chosen by the EMAIL_PROVIDER env var. Every backend implements this small
 * interface so /api/email/send stays provider-agnostic. To add your own
 * provider, write an adapter that returns an EmailProvider and wire it into
 * getEmailProvider() in ./index.ts.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

export type SendResult = {
  status: "sent";
  messageId?: string;
  threadId?: string;
};

export type DraftResult = {
  status: "drafted";
  draftId?: string;
  /** Deep link to open the draft, when the provider can give one. */
  url?: string;
};

/**
 * Runtime context a provider may need. Only the Gmail provider uses the
 * Google access token; Resend/SMTP authenticate with their own env keys.
 */
export type EmailContext = {
  googleAccessToken?: string;
};

export type EmailProviderId = "gmail" | "resend" | "smtp";

export interface EmailProvider {
  readonly id: EmailProviderId;
  /** True when the provider can stage a draft instead of sending immediately. */
  readonly supportsDrafts: boolean;
  send(message: EmailMessage, ctx: EmailContext): Promise<SendResult>;
  /** Present only when supportsDrafts is true. */
  createDraft?(message: EmailMessage, ctx: EmailContext): Promise<DraftResult>;
}
