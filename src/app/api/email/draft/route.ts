import { NextRequest, NextResponse } from "next/server";
import { auth, guardGoogleSession, sessionGuardResponse } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import {
  createTextDoc,
  findMasterResume,
  findStoriesDoc,
  readDocPlaintext,
} from "@/lib/google";
import { prompts } from "@/lib/prompts";
import { streamClaudeResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  const issue = guardGoogleSession(session, DRIVE_SCOPES);
  if (issue) return sessionGuardResponse(issue);
  const accessToken = session!.accessToken!;

  const { jd, company, role, contactName, contactRole, subfolderId } = (await req.json()) as {
    jd?: string;
    company?: string;
    role?: string;
    contactName?: string;
    contactRole?: string;
    subfolderId?: string;
  };
  if (!jd?.trim()) return NextResponse.json({ error: "missing jd" }, { status: 400 });

  const master = await findMasterResume(accessToken);
  if (!master) {
    return NextResponse.json(
      {
        error:
          'No "Master Resume" found in your "Job Search" Drive folder. Register one at /onboarding/resume first.',
      },
      { status: 400 },
    );
  }
  const resumeText = await readDocPlaintext(accessToken, master.id);
  if (!resumeText.trim()) {
    return NextResponse.json({ error: "master resume is empty" }, { status: 400 });
  }

  const stories = await findStoriesDoc(accessToken);
  const storiesText = stories
    ? (await readDocPlaintext(accessToken, stories.id)).trim()
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
          contactName
            ? `Open with "Hi ${contactName.split(" ")[0]},". Use their first name only. If their role is provided, weave in ONE specific reason you're reaching out to THEM (their work area, a recent post, or the team they run) rather than a generic hello. `
            : 'Open with "Hi there," — no specific contact was provided. ',
          "Output exactly:\n\nSubject: <one-line subject that creates curiosity, doesn't describe credentials>\n\n<body>\n\n",
          "Rules: under 200 words, no em dashes, use contractions, no 'I hope this message finds you well', ",
          "no 'I came across your profile'. Draw the applicant's name from the resume header. ",
          "Output only the subject and body — no preamble, no meta commentary.",
        ].join(""),
      },
    ],
    maxTokens: 1024,
    onComplete: async (fullText) => {
      const trimmed = fullText.trim();
      if (!trimmed) return {};
      const title = `${company ?? "Application"} - Cold Email`.slice(0, 120);
      const doc = await createTextDoc(accessToken, title, trimmed, subfolderId);
      return { savedDocId: doc.id, savedDocUrl: doc.url, title };
    },
  });
}
