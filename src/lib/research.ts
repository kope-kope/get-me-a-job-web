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

const RESEARCH_SYSTEM_PROMPT = `You are researching cold-outreach targets for a job applicant. You have web_search available — use it liberally.

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

If the company you were given doesn't match a real company or your searches turn up nothing usable, return {"company": "<name>", "contacts": [], "notes": "<why the search failed>"} — the downstream pipeline degrades gracefully.

FINAL OUTPUT DISCIPLINE — read this twice:
- Do all your thinking, narration, and reasoning DURING the web_search rounds.
- After your LAST search, your VERY LAST message must be nothing but the JSON object. No preamble, no "Here are the results:", no summary sentence. If the last thing you write is not a valid JSON object starting with { and ending with }, the entire pipeline fails.
- If you catch yourself typing "Now let me submit..." — stop. Just output the JSON.`;

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

  // Claude's response has multiple text blocks — each round of web_search
  // interleaves narration ("I've found Adam Mulliken, let me search for
  // his LinkedIn…") with server_tool_use blocks. The final JSON is in the
  // LAST text block, not the concatenation of all of them.
  const textBlocks = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text);

  const parseAttempt = (raw: string): ResearchResult | null => {
    const trimmed = raw.trim();
    // Strip common wrappers Claude sometimes still emits despite prompt.
    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    // Find the outermost {...} in case there's stray prose before/after.
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    const candidate = stripped.slice(first, last + 1);
    try {
      return JSON.parse(candidate) as ResearchResult;
    } catch {
      return null;
    }
  };

  // Try the last text block first (that's where the JSON should be), then
  // fall back to earlier blocks if the last one is empty or malformed.
  let parsed: ResearchResult | null = null;
  for (let i = textBlocks.length - 1; i >= 0 && !parsed; i--) {
    parsed = parseAttempt(textBlocks[i]);
  }

  if (!parsed) {
    const preview = (textBlocks[textBlocks.length - 1] ?? "").slice(0, 400);
    throw new Error(
      `Research produced ${textBlocks.length} text block${
        textBlocks.length === 1 ? "" : "s"
      } but none contained valid JSON. Last block preview: ${preview}`,
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
