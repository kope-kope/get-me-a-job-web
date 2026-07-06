import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prompts } from "@/lib/prompts";
import { streamClaudeResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { jd, resume, company } = (await req.json()) as {
    jd?: string;
    resume?: string;
    company?: string;
  };
  if (!jd?.trim() || !resume?.trim()) {
    return NextResponse.json({ error: "missing jd or resume" }, { status: 400 });
  }

  return streamClaudeResponse({
    system: prompts.coverLetter(),
    messages: [
      {
        role: "user",
        content: [
          "Here is the user's master resume:\n\n---\n" + resume + "\n---\n\n",
          "Here is the JD for " + (company ?? "the target company") + ":\n\n---\n" + jd + "\n---\n\n",
          "Write the cover letter. Follow every rule in your instructions, especially the ~450-500 word body, ",
          "no em dashes, no 'I'm excited to apply', one anchor story. Output only the letter — no preamble.",
        ].join(""),
      },
    ],
    maxTokens: 2048,
  });
}
