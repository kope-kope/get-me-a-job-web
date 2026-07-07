import { anthropic, MODEL } from "@/lib/anthropic";
import { humanizeFinal } from "@/lib/humanize";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

/**
 * Phase 1 of the outreach pipeline: given a JD, target company, and the
 * applicant's resume, ask Claude — with web_search access — to identify
 * three real people who'd be strong warm-outreach targets and explain why
 * each is a fit for THIS applicant specifically.
 *
 * Phase 2 (Hunter Email Finder) turns each researched name into an email.
 */

export type ResearchedContact = {
  firstName: string;
  lastName: string;
  position: string;
  linkedinUrl?: string;
  reasoning: string;
  sourceUrl?: string;
};

export type ResearchResult = {
  company: string;
  domain?: string;
  contacts: ResearchedContact[];
  notes?: string;
};

const RESEARCH_SYSTEM_PROMPT = `You are researching cold-outreach targets for a Berkeley Haas MBA job applicant. You have web_search available — use it liberally.

Your job: given the applicant's resume, the target company, and the role, identify THREE real, currently-employed people at the target company who would be strong warm-outreach targets for THIS applicant.

Priority order:
1. The hiring manager for the specific role (search "<Company> <Role> hiring manager", their LinkedIn, engineering/product blog posts, Twitter).
2. The senior lead of the department the role sits in (Head of Product, VP Engineering, Principal PM, Director of Design, whatever matches).
3. A leader adjacent to the role who could refer or intro (CTO for technical PM, CPO for design, GM for functional roles).

For each person, use search to confirm:
- Full first name + last name (exact spelling matters — Hunter's lookup fails on typos).
- Current title at the target company. Verify they're still there via LinkedIn or recent posts.
- LinkedIn URL when findable.
- ONE specific, applicant-relevant reason they're a good target — mutual background (school, previous employer, industry), work overlap with something on the resume, a recent post/talk that matches applicant's experience, etc.
- A source URL where you confirmed the info (LinkedIn, company careers page, press mention).

STRICT RULES:
- Do NOT invent names. If web_search doesn't surface real people, return fewer than 3 and explain in the notes field.
- Do NOT return recruiters, HR generalists, or generic role names ("hiring team"). Real named individuals only.
- Do NOT return people who've left the company. Cross-check current employment before including.
- Do NOT use em dashes, "excited to reach out", "delve", "leverage", or other AI slop in the reasoning field — write like a human researcher briefing a peer.

After research is done, output ONLY a JSON object matching this exact shape. No prose before or after, no markdown fences, no explanations:

{
  "company": "<confirmed company name from your research>",
  "domain": "<primary company domain, e.g. stripe.com>",
  "contacts": [
    {
      "firstName": "<first>",
      "lastName": "<last>",
      "position": "<current title exactly as they list it>",
      "linkedinUrl": "<full URL if found, otherwise omit>",
      "reasoning": "<one plain sentence on why THIS applicant should reach out to THIS person>",
      "sourceUrl": "<one URL you used to confirm>"
    }
  ],
  "notes": "<one paragraph on what you searched for and what to double-check>"
}

If the company you were given doesn't match a real company or your searches turn up nothing usable, return {"company": "<name>", "contacts": [], "notes": "<why the search failed>"} — the downstream pipeline degrades gracefully.`;

function buildUserMessage(input: {
  jd: string;
  company: string;
  role: string;
  resumeText: string;
}): string {
  return [
    "APPLICANT'S MASTER RESUME (verbatim plaintext):\n\n---\n",
    input.resumeText,
    "\n---\n\n",
    "JOB DESCRIPTION:\n\n---\n",
    input.jd,
    "\n---\n\n",
    `Target company: ${input.company}\n`,
    `Target role: ${input.role}\n\n`,
    `Research 3 warm-outreach targets. Use web_search as many times as you need to confirm real people, real current titles, and applicant-specific reasoning. Return only the JSON.`,
  ].join("");
}

export async function researchContacts(input: {
  jd: string;
  company: string;
  role: string;
  resumeText: string;
}): Promise<ResearchResult> {
  const messages: MessageParam[] = [
    { role: "user", content: buildUserMessage(input) },
  ];

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: RESEARCH_SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 8,
      },
    ],
    messages,
  });

  // Claude's final answer lives in text blocks. Server-side tool blocks
  // (server_tool_use / web_search_tool_result) are handled by Anthropic
  // and don't need our attention here.
  const finalText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();

  const cleaned = finalText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: ResearchResult;
  try {
    parsed = JSON.parse(cleaned) as ResearchResult;
  } catch (err) {
    throw new Error(
      `Research response wasn't valid JSON. First 200 chars: ${finalText.slice(
        0,
        200,
      )}. Parse error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Belt-and-suspenders: strip em-dashes from research reasoning even
  // though the prompt forbids them.
  return {
    company: parsed.company,
    domain: parsed.domain,
    contacts: (parsed.contacts ?? []).map((c) => ({
      ...c,
      reasoning: humanizeFinal(c.reasoning ?? ""),
      position: humanizeFinal(c.position ?? ""),
    })),
    notes: parsed.notes ? humanizeFinal(parsed.notes) : undefined,
  };
}
