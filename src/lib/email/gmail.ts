import { gmailClient } from "@/lib/google";
import type { EmailProvider } from "./types";

/** RFC 2822 message, base64url-encoded the way the Gmail API expects. */
function buildRawMessage({ to, subject, body }: { to: string; subject: string; body: string }): string {
  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(mime)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Gmail provider — sends from the signed-in user's own mailbox using their
 * OAuth token. Requires the gmail.modify scope (guarded in the route). This is
 * the default provider and the only one that can save native drafts.
 */
export function gmailProvider(): EmailProvider {
  return {
    id: "gmail",
    supportsDrafts: true,

    async send(message, ctx) {
      if (!ctx.googleAccessToken) {
        throw new Error("Gmail provider requires a signed-in Google session.");
      }
      const gmail = gmailClient(ctx.googleAccessToken);
      const raw = buildRawMessage(message);
      const sent = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      return {
        status: "sent",
        messageId: sent.data.id ?? undefined,
        threadId: sent.data.threadId ?? undefined,
      };
    },

    async createDraft(message, ctx) {
      if (!ctx.googleAccessToken) {
        throw new Error("Gmail provider requires a signed-in Google session.");
      }
      const gmail = gmailClient(ctx.googleAccessToken);
      const raw = buildRawMessage(message);
      const draft = await gmail.users.drafts.create({
        userId: "me",
        requestBody: { message: { raw } },
      });
      return {
        status: "drafted",
        draftId: draft.data.id ?? undefined,
        url: `https://mail.google.com/mail/u/0/#drafts?compose=${draft.data.id}`,
      };
    },
  };
}
