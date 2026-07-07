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
      { error: "Google Drive not connected — I need to read your master resume first." },
      { status: 403 },
    );
  }

  const { jd, company, role, contactName, contactRole } = (await req.json()) as {
    jd?: string;
    company?: string;
    role?: string;
    contactName?: string;
    contactRole?: string;
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

  const stories = await findStoriesDoc(session.accessToken);
  const storiesText = stories
    ? (await readDocPlaintext(session.accessToken, stories.id)).trim()
    : "";
  const storiesBlock = storiesText
    ? [
        "APPLICANT STORIES (use for the value-first hook when a real story maps to the target company's problem):\n\n---\n",
        storiesText,
        "\n---\n\n",
      ].join("")
    : "";

  return streamClaudeResponse({
    system: prompts.networkOutreach(),
    messages: [
      {
        role: "user",
        content: [
          "MASTER RESUME (verbatim plaintext from Google Docs):\n\n---\n",
          resumeText,
          "\n---\n\n",
          storiesBlock,
          "JOB DESCRIPTION:\n\n---\n",
          jd,
          "\n---\n\n",
          `Company: ${company ?? "(extract from the JD above)"}\n`,
          `Role of interest: ${role ?? "(the role in the JD)"}\n`,
          `Contact: ${contactName ?? "someone on the team"}${contactRole ? ` (${contactRole})` : ""}\n\n`,
          "Draft a cold outreach email using the value-first product-insight approach from your instructions. ",
          "Output exactly:\n\nSubject: <one-line subject that creates curiosity, doesn't describe credentials>\n\n<body>\n\n",
          "Rules: under 200 words, no em dashes, use contractions, no 'I hope this message finds you well', ",
          "no 'I came across your profile'. Draw the applicant's name from the resume header. ",
          "Output only the subject and body — no preamble, no meta commentary.",
        ].join(""),
      },
    ],
    maxTokens: 1024,
  });
}
