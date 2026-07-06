import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prompts } from "@/lib/prompts";
import { streamClaudeResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { jd, resume } = (await req.json()) as { jd?: string; resume?: string };
  if (!jd?.trim()) return NextResponse.json({ error: "missing jd" }, { status: 400 });
  if (!resume?.trim()) return NextResponse.json({ error: "missing resume" }, { status: 400 });

  return streamClaudeResponse({
    system: prompts.resumeTailor(),
    messages: [
      {
        role: "user",
        content: [
          "Here is my master resume:\n\n---\n" + resume + "\n---\n\n",
          "Here is the job description:\n\n---\n" + jd + "\n---\n\n",
          "Produce the tailored resume in clean markdown. Then, on a new line, output:\n",
          "\n===GAP REPORT===\n\n",
          "…followed by the Gap Report as described in your instructions. Do not produce a Word document — just markdown.",
        ].join(""),
      },
    ],
    maxTokens: 4096,
  });
}
