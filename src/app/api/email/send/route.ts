import { NextRequest, NextResponse } from "next/server";
import { auth, hasGrantedScopes } from "@/auth";
import { gmailClient } from "@/lib/google";
import { GMAIL_SCOPES } from "@/lib/scopes";

export const runtime = "nodejs";

function buildRawMessage({ to, subject, body }: { to: string; subject: string; body: string }): string {
  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(mime).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!hasGrantedScopes(session, GMAIL_SCOPES) || !session.accessToken) {
    return NextResponse.json(
      { error: "Gmail not connected. Go to onboarding and click Connect on the Gmail card." },
      { status: 403 },
    );
  }

  const { mode, to, subject, body } = (await req.json()) as {
    mode?: "draft" | "send";
    to?: string;
    subject?: string;
    body?: string;
  };
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "missing to/subject/body" }, { status: 400 });
  }

  const raw = buildRawMessage({ to, subject, body });
  const gmail = gmailClient(session.accessToken);

  try {
    if (mode === "send") {
      const sent = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      return NextResponse.json({ status: "sent", messageId: sent.data.id, threadId: sent.data.threadId });
    }
    const draft = await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw } },
    });
    return NextResponse.json({
      status: "drafted",
      draftId: draft.data.id,
      url: `https://mail.google.com/mail/u/0/#drafts?compose=${draft.data.id}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "gmail failed" },
      { status: 500 },
    );
  }
}
