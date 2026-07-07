import { NextRequest, NextResponse } from "next/server";
import { auth, guardGoogleSession, sessionGuardResponse } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import { findMasterResume, readDocPlaintext } from "@/lib/google";
import { researchContacts } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const session = await auth();
  const issue = guardGoogleSession(session, DRIVE_SCOPES);
  if (issue) return sessionGuardResponse(issue);
  const accessToken = session!.accessToken!;

  const { jd, company, role } = (await req.json()) as {
    jd?: string;
    company?: string;
    role?: string;
  };
  if (!jd?.trim() || !company?.trim() || !role?.trim()) {
    return NextResponse.json(
      { error: "missing jd, company, or role" },
      { status: 400 },
    );
  }

  const master = await findMasterResume(accessToken);
  if (!master) {
    return NextResponse.json(
      { error: 'No "Master Resume" in your Job Search folder. Register one first.' },
      { status: 400 },
    );
  }
  const resumeText = await readDocPlaintext(accessToken, master.id);
  if (!resumeText.trim()) {
    return NextResponse.json({ error: "master resume is empty" }, { status: 400 });
  }

  try {
    const result = await researchContacts({ jd, company, role, resumeText });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "research failed" },
      { status: 500 },
    );
  }
}
