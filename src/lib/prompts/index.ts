import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "src", "lib", "prompts");

function read(name: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf-8");
}

export const prompts = {
  resumeTailor: () => read("resume-tailor"),
  coverLetter: () => read("cover-letter"),
  interviewPrep: () => read("interview-prep"),
  networkOutreach: () => read("network-outreach"),
  companyResearch: () => read("company-research"),
  humanizer: () => read("humanizer"),
};

export type PromptName = keyof typeof prompts;
