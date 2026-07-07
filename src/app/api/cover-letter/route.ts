import { NextRequest, NextResponse } from "next/server";
import { auth, hasGrantedScopes } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import { findMasterResume, findStoriesDoc, readDocPlaintext } from "@/lib/google";
import { prompts } from "@/lib/prompts";
import { streamClaudeResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!hasGrantedScopes(session, DRIVE_SCOPES) || !session.accessToken) {
    return NextResponse.json(
      { error: "Google Drive not connected — I need to read your master resume before writing." },
      { status: 403 },
    );
  }

  const { jd, company, role } = (await req.json()) as {
    jd?: string;
    company?: string;
    role?: string;
  };
  if (!jd?.trim()) return NextResponse.json({ error: "missing jd" }, { status: 400 });

  const master = await findMasterResume(session.accessToken);
  if (!master) {
    return NextResponse.json(
      {
        error:
          'No "Master Resume" found in your "Job Search" Drive folder. Register one at /onboarding/resume first.',
      },
      { status: 400 },
    );
  }
  const resumeText = await readDocPlaintext(session.accessToken, master.id);
  if (!resumeText.trim()) {
    return NextResponse.json({ error: "master resume is empty" }, { status: 400 });
  }

  // Stories are optional. If present, they let Claude write a much more
  // personal letter grounded in real anchor stories.
  const stories = await findStoriesDoc(session.accessToken);
  const storiesText = stories
    ? (await readDocPlaintext(session.accessToken, stories.id)).trim()
    : "";

  const userAddressing = company
    ? `Company: ${company}${role ? ` · Role: ${role}` : ""}`
    : "Company: (extract from the JD below)";

  const storiesBlock = storiesText
    ? [
        "APPLICANT STORIES (verbatim plaintext from their Stories doc — use ONE of these as the anchor story if any of them map to the role's core challenge):\n\n---\n",
        storiesText,
        "\n---\n\n",
      ].join("")
    : "";

  return streamClaudeResponse({
    system: prompts.coverLetter(),
    messages: [
      {
        role: "user",
        content: [
          "MASTER RESUME (verbatim plaintext from Google Docs):\n\n---\n",
          resumeText,
          "\n---\n\n",
          storiesBlock,
          userAddressing,
          "\n\nJOB DESCRIPTION:\n\n---\n",
          jd,
          "\n---\n\n",
          "Write the cover letter now. Follow every rule in your instructions: 450-500 word body, ONE anchor story (draw from the Stories doc if provided, otherwise from the resume), no em dashes, no 'I'm excited to apply', warm sign-off. Output ONLY the letter (Dear [Company] Hiring Team, ... Warmly, [Name] etc.), no preamble, no meta commentary. Extract the applicant's name and contact info from the resume header.",
        ].join(""),
      },
    ],
    maxTokens: 2048,
  });
}
