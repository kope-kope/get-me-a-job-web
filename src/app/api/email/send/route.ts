import { NextRequest, NextResponse } from "next/server";
import { auth, guardGoogleSession, sessionGuardResponse } from "@/auth";
import { GMAIL_SCOPES } from "@/lib/scopes";
import { getEmailProvider } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const provider = getEmailProvider();

  // Only the Gmail provider needs the gmail.modify scope. Resend/SMTP still
  // require a signed-in user (so the deployment's keys aren't open to anyone),
  // but not the Gmail permission.
  const session = await auth();
  const issue = guardGoogleSession(session, provider.id === "gmail" ? GMAIL_SCOPES : undefined);
  if (issue) return sessionGuardResponse(issue);

  const { mode, to, subject, body } = (await req.json()) as {
    mode?: "draft" | "send";
    to?: string;
    subject?: string;
    body?: string;
  };
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "missing to/subject/body" }, { status: 400 });
  }

  const message = { to, subject, body };
  const ctx = { googleAccessToken: session!.accessToken };

  try {
    if (mode === "send") {
      const result = await provider.send(message, ctx);
      return NextResponse.json(result);
    }

    // draft mode
    if (provider.createDraft) {
      const result = await provider.createDraft(message, ctx);
      return NextResponse.json(result);
    }
    return NextResponse.json(
      {
        error: `The "${provider.id}" email provider can't save drafts. Use Send instead.`,
        code: "NO_DRAFT",
      },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sending failed" },
      { status: 500 },
    );
  }
}
