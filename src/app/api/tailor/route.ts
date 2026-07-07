import { NextRequest, NextResponse } from "next/server";
import { auth, guardGoogleSession, sessionGuardResponse } from "@/auth";
import { DRIVE_SCOPES } from "@/lib/scopes";
import {
  copyDoc,
  createSubfolder,
  ensureJobSearchFolder,
  findMasterResume,
  readDocPlaintext,
  replaceAllText,
} from "@/lib/google";
import { anthropic, MODEL } from "@/lib/anthropic";
import { humanizeFinal } from "@/lib/humanize";
import { prompts } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 90;

type TailorPlan = {
  company: string;
  role: string;
  bullets: Array<{
    oldText: string;
    newText: string;
    reason: string;
  }>;
  gapReport: string;
  positioning: string;
};

const SYSTEM_TAIL = `

# OUTPUT REQUIREMENTS FOR THIS WEB PIPELINE

You are running inside a web app that will surgically replace specific bullet strings in the user's Google Doc — the master doc's formatting must be preserved. So instead of rewriting the whole resume, you produce a plan:

- Identify the company and the exact role title from the JD.
- For each bullet in the master resume that you would rewrite, output the EXACT current text (verbatim, character-for-character, so the Docs API can find it) and the tailored replacement.
- Only include bullets that actually change. Leave bullets that are already strong alone.
- Never invent metrics. If a bullet lacks a number and rewriting truthfully requires one, skip it and note it in the gap report instead.

Return ONLY a JSON object matching this TypeScript type — no prose before or after, no markdown fences, no explanations:

{
  "company": string,
  "role": string,
  "bullets": Array<{ "oldText": string, "newText": string, "reason": string }>,
  "gapReport": string,
  "positioning": string
}

"gapReport" is a short markdown block with three subsections: ### Strong matches / ### Reframed / ### Genuine gaps.
"positioning" is one paragraph on which angle to lead with in the cover letter and interview.

If the master resume text is empty or the JD is unusable, return {"company":"", "role":"", "bullets":[], "gapReport":"…what went wrong…", "positioning":""}.
`;

async function generatePlan(masterResumeText: string, jd: string): Promise<TailorPlan> {
  const system = prompts.resumeTailor() + SYSTEM_TAIL;
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [
      {
        role: "user",
        content:
          "MASTER RESUME (plaintext dump from Google Docs — bullet text is verbatim):\n\n" +
          masterResumeText +
          "\n\n---\n\nJOB DESCRIPTION:\n\n" +
          jd +
          "\n\n---\n\nReturn only the JSON plan as specified.",
      },
    ],
  });

  const text = res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();

  // Tolerate stray code fences even though the prompt says no fences.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as TailorPlan;
  } catch (err) {
    throw new Error(
      `Claude didn't return valid JSON. First 200 chars: ${text.slice(0, 200)}. Parse error: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const issue = guardGoogleSession(session, DRIVE_SCOPES);
  if (issue) return sessionGuardResponse(issue);
  const accessToken = session!.accessToken!;

  const { jd } = (await req.json()) as { jd?: string };
  if (!jd?.trim()) return NextResponse.json({ error: "missing jd" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        send("progress", { step: "read-master", message: "Reading your master resume…" });
        const master = await findMasterResume(accessToken);
        if (!master) {
          throw new Error(
            'No "Master Resume" found in your "Job Search" folder. Go to /onboarding/resume and paste your Google Doc link.',
          );
        }
        const masterText = await readDocPlaintext(accessToken, master.id);
        if (!masterText.trim()) {
          throw new Error("Master resume is empty. Check the doc has content and try again.");
        }

        send("progress", { step: "analyze", message: "Analyzing the JD and rewriting bullets…" });
        const plan = await generatePlan(masterText, jd);

        // Sanitize every newText Claude produced. Em-dashes and curly quotes
        // in bullet rewrites would land in the Google Doc otherwise.
        plan.bullets = plan.bullets.map((b) => ({
          ...b,
          newText: humanizeFinal(b.newText),
          reason: humanizeFinal(b.reason ?? ""),
        }));
        plan.gapReport = humanizeFinal(plan.gapReport ?? "");
        plan.positioning = humanizeFinal(plan.positioning ?? "");

        if (plan.bullets.length === 0) {
          send("plan", plan);
          send("done", { skipped: true, reason: "no bullets to change" });
          controller.close();
          return;
        }

        // Verify every oldText actually exists in the master. Skip any that don't
        // so a bad hallucination can't nuke the doc.
        const validPairs = plan.bullets.filter((b) => masterText.includes(b.oldText));
        const skipped = plan.bullets.length - validPairs.length;

        send("plan", { ...plan, skippedRewrites: skipped });

        send("progress", { step: "folder", message: `Creating "${plan.company} - ${plan.role}" folder…` });
        const jobSearchFolder = await ensureJobSearchFolder(accessToken);
        const subfolder = await createSubfolder(
          accessToken,
          `${plan.company} - ${plan.role}`.slice(0, 120),
          jobSearchFolder.id,
        );

        send("progress", { step: "copy", message: "Copying master resume into the new folder…" });
        const tailored = await copyDoc(
          accessToken,
          master.id,
          `${plan.company} - Tailored Resume`.slice(0, 120),
          subfolder.id,
        );

        send("progress", {
          step: "replace",
          message: `Applying ${validPairs.length} bullet ${validPairs.length === 1 ? "rewrite" : "rewrites"}…`,
        });
        const { occurrencesChanged } = await replaceAllText(
          accessToken,
          tailored.id,
          validPairs.map((p) => ({ oldText: p.oldText, newText: p.newText })),
        );

        send("done", {
          tailoredDocUrl: tailored.url,
          tailoredDocId: tailored.id,
          subfolderId: subfolder.id,
          subfolderUrl: subfolder.url,
          company: plan.company,
          role: plan.role,
          occurrencesChanged,
          appliedRewrites: validPairs.length,
          skippedRewrites: skipped,
        });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "tailor failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
