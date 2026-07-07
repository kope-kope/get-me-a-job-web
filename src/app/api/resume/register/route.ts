import { NextRequest, NextResponse } from "next/server";
import { auth, guardGoogleSession, sessionGuardResponse } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import { extractDocId, registerMasterResume } from "@/lib/google";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const issue = guardGoogleSession(session, DRIVE_SCOPES);
  if (issue) return sessionGuardResponse(issue);
  const accessToken = session!.accessToken!;

  const { docUrl } = (await req.json()) as { docUrl?: string };
  if (!docUrl?.trim()) return NextResponse.json({ error: "missing docUrl" }, { status: 400 });

  const docId = extractDocId(docUrl);
  if (!docId) {
    return NextResponse.json(
      { error: "That doesn't look like a Google Doc link. Expected https://docs.google.com/document/d/..." },
      { status: 400 },
    );
  }

  try {
    const result = await registerMasterResume(accessToken, docUrl);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "register failed";
    const isPerm =
      /not found|permission|forbidden|404|403/i.test(message);
    return NextResponse.json(
      {
        error: isPerm
          ? "I can't open that doc. Make sure it's shared with your @berkeley.edu account, or you're signed into the same account."
          : message,
      },
      { status: isPerm ? 403 : 500 },
    );
  }
}
