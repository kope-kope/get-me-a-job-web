/**
 * Post-processing sanitizer for AI-slop characters and phrases that leak
 * through even when the prompt tells Claude not to use them. Belt and
 * suspenders on top of the humanizer rules baked into the system prompts.
 *
 * Runs on every streamed chunk and on the final tailor plan's newText fields.
 * Cheap enough to run on every character in the stream.
 */

const CHAR_REPLACEMENTS: Array<[RegExp, string]> = [
  // Em-dash and en-dash → comma-space (preserves clause boundary intent)
  [/\s*—\s*/g, ", "],
  [/\s*–\s*/g, ", "],
  // Curly quotes → straight
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
  // Ellipsis character → three periods
  [/…/g, "..."],
  // Non-breaking space → regular space
  [/ /g, " "],
];

/**
 * Sanitize a completed text block. Safe to run on final outputs (JSON
 * fields, cover letter, email body) — does not attempt to preserve
 * partial characters at boundaries.
 */
export function humanizeFinal(text: string): string {
  let out = text;
  for (const [pattern, replacement] of CHAR_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Stateful sanitizer for streaming. Buffers only when a chunk ends
 * mid-suspicious-character so we don't split a multi-byte replacement
 * across chunks. In practice em-dash and curly-quote are single UTF-16
 * code points so no buffering is needed — but this API leaves room for
 * multi-character AI-phrase replacements later.
 */
export class StreamHumanizer {
  private carry = "";

  push(chunk: string): string {
    const combined = this.carry + chunk;
    this.carry = "";
    return humanizeFinal(combined);
  }

  flush(): string {
    if (!this.carry) return "";
    const flushed = humanizeFinal(this.carry);
    this.carry = "";
    return flushed;
  }
}
