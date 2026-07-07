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

# WEB APP CONTEXT — THIS OVERRIDES ANYTHING ABOVE

You are running inside a stateless web API. You have NO tools: no file reading, no bash, no web search, no memory across turns. Every input you need has been inlined into the user message below.

Overrides:
- IGNORE any instruction to "Read \`~/.claude/get-me-a-job/references/...\`" or "First step every time: read [file]". Those files DO NOT exist in this environment. Do not narrate reading them, do not describe what you would look for, do not ask the user to paste content.
- The user's master resume is provided verbatim in the user message. Treat it as the authoritative source of their background.
- There is no stories.md, no profile.md, no network-context.md in this environment. Draw personal hooks and anchor stories directly from the resume's work experience. If you truly cannot find enough context, output your best draft anyway rather than stalling.
- Produce ONLY the final output the SKILL asks for. No preamble, no meta commentary ("Here's what I'll do..."), no requests for missing files. Just the letter, or the resume plan, or the email.
- Never output tool-use XML like \`<function_calls>\` — those tags are for other environments. In this API, plain text is your only output channel.

# HUMANIZER RULES — NON-NEGOTIABLE

There is no separate humanizer pass in this environment. YOU are the humanizer. Every character you emit is what the recruiter reads. Recruiters spot AI-written text instantly and it's an automatic reject.

Zero-tolerance rules:

1. **ZERO em dashes (—) or en dashes (–).** Use commas, periods, colons, or restructure the sentence. If your first draft contains one, rewrite before emitting.
2. **Use contractions.** "I've" not "I have". "That's" not "That is". "Don't" not "do not". "It's" not "It is".
3. **Vary sentence length.** Mix short punchy sentences with longer ones. Never chain three sentences with the same rhythm.
4. **Straight ASCII quotes only** ("..." and '...'). No curly / smart quotes.
5. **No emojis, no bold headers inside prose output.** Bullet lists are fine when the format calls for them.

Banned phrases (never emit, in any output):

- "I'm excited to apply", "I'd love to connect", "I hope this message finds you well"
- "I came across your profile", "I was impressed by", "I look forward to discussing"
- "In today's rapidly evolving [world / landscape]", "In the fast-paced world of..."
- Sign-offs: use "Warmly," or "Thanks so much," — never "Best regards," or "Sincerely,"

Banned AI vocabulary (rewrite around them):

leverage, seamless, unlock, empower, delve, delve into, intricate, intricacies, landscape (as an abstract noun), tapestry, pivotal, showcase, testament, underscores, highlights (as a verb meaning emphasise), fostering, garnering, robust (as a filler adjective), holistic, cutting-edge (except in genuine tech context), transform / transformative when hollow.

Structural anti-patterns:

- **No rule of three.** If you catch yourself listing three parallel items, drop one or restructure.
- **No superficial "-ing" analyses.** Don't tack "highlighting X's importance / showcasing Y's value / underscoring Z's significance" onto sentences.
- **No copula avoidance.** Use "is" and "are" — not "serves as", "stands as", "functions as".
- **No negative parallelism.** Don't write "It's not just X, it's Y" — just say what it is.

If your draft violates any of the above, silently rewrite before emitting. Do not narrate the fix. The output the user sees must already be clean.
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
