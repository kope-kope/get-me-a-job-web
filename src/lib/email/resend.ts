import type { EmailProvider } from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Resend provider — sends via the Resend HTTP API (no SDK dependency).
 * Needs RESEND_API_KEY and EMAIL_FROM (a verified sender, e.g.
 * "Your Name <you@yourdomain.com>"). Resend has no draft concept, so
 * supportsDrafts is false and only send() is implemented.
 */
export function resendProvider(): EmailProvider {
  return {
    id: "resend",
    supportsDrafts: false,

    async send(message) {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.EMAIL_FROM;
      if (!apiKey) throw new Error("RESEND_API_KEY is not configured on the server.");
      if (!from) {
        throw new Error(
          'EMAIL_FROM is not configured. Set it to a Resend-verified sender, e.g. "Your Name <you@yourdomain.com>".',
        );
      }

      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          text: message.body,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || `Resend returned HTTP ${res.status}`);
      }
      return { status: "sent", messageId: data.id };
    },
  };
}
