import type { EmailProvider } from "./types";

/**
 * SMTP provider — sends through any mail server via nodemailer. Needs
 * SMTP_HOST and EMAIL_FROM; SMTP_PORT (default 587), SMTP_USER, SMTP_PASS are
 * optional depending on your server. Port 465 uses implicit TLS. No draft
 * concept, so supportsDrafts is false.
 *
 * nodemailer is imported lazily so it only loads when SMTP is actually used.
 */
export function smtpProvider(): EmailProvider {
  return {
    id: "smtp",
    supportsDrafts: false,

    async send(message) {
      const host = process.env.SMTP_HOST;
      const from = process.env.EMAIL_FROM;
      if (!host) throw new Error("SMTP_HOST is not configured on the server.");
      if (!from) {
        throw new Error('EMAIL_FROM is not configured. Set it to a sender address, e.g. "Your Name <you@yourdomain.com>".');
      }

      const port = Number(process.env.SMTP_PORT ?? 587);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
      });

      const info = await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
      return { status: "sent", messageId: info.messageId };
    },
  };
}
