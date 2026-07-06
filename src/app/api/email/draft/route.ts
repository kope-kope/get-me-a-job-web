import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prompts } from "@/lib/prompts";
import { streamClaudeResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { jd, resume, company, contactName, contactRole } = (await req.json()) as {
    jd?: string;
    resume?: string;
    company?: string;
    contactName?: string;
    contactRole?: string;
  };
  if (!jd?.trim() || !resume?.trim()) {
    return NextResponse.json({ error: "missing jd or resume" }, { status: 400 });
  }

  return streamClaudeResponse({
    system: prompts.networkOutreach(),
    messages: [
      {
        role: "user",
        content: [
          "Master resume:\n---\n" + resume + "\n---\n\n",
          "JD:\n---\n" + jd + "\n---\n\n",
          "Company: " + (company ?? "unknown") + "\n",
          "Contact: " + (contactName ?? "someone on the team") + " (" + (contactRole ?? "role unknown") + ")\n\n",
          "Draft a cold email using the value-first product-insight approach. Output exactly:\n\n",
          "Subject: <subject line>\n\n<body>\n\nRules: under 200 words, no em dashes, use contractions, ",
          "never 'I hope this message finds you well'. Output only the subject and body — no meta commentary.",
        ].join(""),
      },
    ],
    maxTokens: 1024,
  });
}
