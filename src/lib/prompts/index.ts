import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "src", "lib", "prompts");

function read(name: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf-8");
}

/**
 * Neutralizes the plugin-era file-reading instructions in the SKILL prompts.
 * The SKILLs were written for a Cowork plugin where Claude could read
 * ~/.claude/get-me-a-job/references/*.md via a file tool. In this web API,
 * Claude has NO tools — everything it needs is inlined in the user message.
 *
 * Without this override, Claude wastes a turn "reading" imaginary files,
 * then apologises and asks the user to paste content.
 */
const WEB_CONTEXT_OVERRIDE = `

# WEB APP CONTEXT — READ THIS OVERRIDES ANYTHING ABOVE

You are running inside a stateless web API. You have NO tools: no file reading, no bash, no web search, no memory across turns. Every input you need has been inlined into the user message below.

Overrides:
- IGNORE any instruction to "Read \`~/.claude/get-me-a-job/references/...\`" or "First step every time: read [file]". Those files DO NOT exist in this environment. Do not narrate reading them, do not describe what you would look for, do not ask the user to paste content.
- The user's master resume is provided verbatim in the user message. Treat it as the authoritative source of their background.
- There is no stories.md, no profile.md, no network-context.md in this environment. Draw personal hooks and anchor stories directly from the resume's work experience. If you truly cannot find enough context, output your best draft anyway rather than stalling.
- Produce ONLY the final output the SKILL asks for. No preamble, no meta commentary ("Here's what I'll do…"), no requests for missing files. Just the letter, or the resume plan, or the email.
- Never output tool-use XML like \`<function_calls>\` — those tags are for other environments. In this API, plain text is your only output channel.
`;

export const prompts = {
  resumeTailor: () => read("resume-tailor") + WEB_CONTEXT_OVERRIDE,
  coverLetter: () => read("cover-letter") + WEB_CONTEXT_OVERRIDE,
  interviewPrep: () => read("interview-prep") + WEB_CONTEXT_OVERRIDE,
  networkOutreach: () => read("network-outreach") + WEB_CONTEXT_OVERRIDE,
  companyResearch: () => read("company-research") + WEB_CONTEXT_OVERRIDE,
  humanizer: () => read("humanizer") + WEB_CONTEXT_OVERRIDE,
};

export type PromptName = keyof typeof prompts;
