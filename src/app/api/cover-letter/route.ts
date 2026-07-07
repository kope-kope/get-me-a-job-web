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

  const { jd, company, role, subfolderId } = (await req.json()) as {
    jd?: string;
    company?: string;
    role?: string;
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

  const docTitle = `${company ?? "Application"} - Cover Letter`.slice(0, 120);

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
    onComplete: async (fullText) => {
      const trimmed = fullText.trim();
      if (!trimmed) return {};
      const doc = await createTextDoc(accessToken, docTitle, trimmed, subfolderId);
      return { savedDocId: doc.id, savedDocUrl: doc.url, title: docTitle };
    },
  });
}
