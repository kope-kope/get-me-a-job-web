---
name: resume-tailor
description: >
  Use this skill whenever the user pastes a job description and wants their resume tailored to it.
  Triggers on phrases like "tailor my resume", "fit my resume to this JD", "help me apply to this role",
  "rewrite my bullets for this job", "what gaps does my resume have for this", or whenever a job description
  is pasted and the user asks for resume help. Also use when the user asks "does my resume match this?" or
  "how should I position myself for this role?". If a job description appears in the conversation and
  resume tailoring seems relevant, invoke this skill proactively.
---

# Resume Tailor

This skill tailors the user's resume to a specific job description, then produces a ready-to-submit tailored resume as a Word document.

**First step every time:** Read `~/.claude/get-me-a-job/references/resume.md` (the user's master resume). It contains their full work history, narrative summary, and target role archetypes. If this file is missing or empty, tell the user to run `/setup` first.

---

## The Process

### Step 1: Deconstruct the JD

Before touching a single bullet, read the JD carefully and extract:

**Hard requirements** — must-haves that will screen the user out if missing (e.g., "5+ years PM experience", "fintech required", "Series B+ experience")

**Soft requirements** — things they'd love but aren't deal-breakers (e.g., "experience with ML products", "payments background")

**Keywords and vocabulary** — the exact language they use. A JD that says "growth loops" is a different culture than one that says "customer acquisition strategy." Mirror their words, not generic synonyms.

**The underlying ask** — what problem is this company actually trying to solve with this hire? A "Senior PM, Payments Infrastructure" role at a Series C might really be asking for someone who can own a complex technical roadmap while managing 3 eng squads. Name this explicitly.

**Culture signals** — startup vs. corporate, builder vs. operator, global vs. domestic, technical vs. business-facing.

### Step 2: Map the User's Experience to the JD

For each major requirement or theme in the JD, identify the best evidence from the user's background. Be strategic:

- **Strong match**: their experience directly addresses the requirement — lead with this in the tailored bullet
- **Partial match**: their experience is adjacent — reframe the bullet to emphasize the transferable elements
- **Gap**: they genuinely don't have this — flag it honestly in the Gap Report

Use the user's **narrative archetypes** (from the reference file, if defined) to choose which version of them to present. An infrastructure role needs the builder side. An early-stage startup needs the founder/hustler side. A strategy role needs the analytical side.

### Step 3: Rewrite Each Bullet

Apply the **what/how/result/why framework** for every bullet:

- **What**: the task or accomplishment
- **How**: the skills or method used
- **Result**: the measurable impact
- **Why**: the context that makes it meaningful

A great bullet leads with the accomplishment (not "Responsible for..."), uses the JD's vocabulary where authentic, and has a crisp metric. The bullet should be readable at a college level — not dumbed down, but not stuffed with jargon either.

**Critical rule**: Never fabricate metrics or experiences. If a bullet currently lacks a metric, flag this to the user with a suggestion rather than inventing one. If the existing metric is real, keep it — don't soften it.

**On mirroring JD language**: Do it where it's authentic. If the JD says "payment rails" and the user built payment infrastructure, use "payment rails." If they have no connection to the language, don't force it — a recruiter will see through it.

**On ordering bullets within a role**: Lead with the bullet that most directly speaks to what this specific JD is looking for. The first bullet is what gets read; the third bullet is what gets skimmed.

### Step 4: Produce the Output

Output two things:

**1. A full tailored resume as a Word document (.docx)**

**Two output paths (use both when possible):**

**Path A: Google Doc (preferred if configured)**
Check `~/.claude/get-me-a-job/config.json` for `master_resume_doc_id` and `job_search_folder_id`. If both are set, use the `gdocs` helper (via `lib/run.py`) to produce the tailored resume:

1. Copy the master resume template:
   ```
   python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gdocs copy MASTER_DOC_ID "[Company Name] - Tailored Resume" FOLDER_ID
   ```
   This preserves ALL of the user's formatting (bold, italics, spacing, fonts, everything).

2. For each bullet that changed, replace the original text with the tailored version:
   ```
   python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gdocs replace NEW_DOC_ID "original bullet text" "tailored bullet text"
   ```
   Run this for each bullet, keeping the formatting structure intact.

3. Share the Google Doc link with the user (the URL is in the copy command's JSON output).

This is the best path because the user formatted their own template during `/setup`. Their formatting stays perfect every time.

If `config.json` is missing or doesn't have `master_resume_doc_id`, tell the user: "You don't have a Google Doc resume template set up. Run `/setup` to create one, or I'll produce a Word doc instead."

**Path B: Word document (always produce this as well)**
Use the docx skill to produce a clean, formatted Word document. The structure should match the user's original resume layout: name/contact header, bold company names, italic role titles, bullet points for accomplishments. Make it ready to submit.

Save to the workspace folder as: `[Company Name] - Tailored Resume.docx`

**2. A gap report in the chat**

After producing the Word doc, write a concise gap analysis directly in the conversation:

```
## Gap Report: [Role] at [Company]

### Strong Matches
[2-3 sentences on where the user's background is a direct hit]

### Reframed / Partial Matches
[Each partial match: what the JD asks for, what bullet covers it, and the reframe logic]

### Genuine Gaps
[Each real gap: what they want, why it's a gap, and how the user might address it — e.g., a cover letter line, a story from coursework, or just an honest acknowledgment]

### Positioning Recommendation
[1 paragraph: which version of the user to lead with for this role, what their strongest angle is, and any smart framing suggestions for the cover letter or interview]
```

---

## Quality Check Before Delivering

Before producing the final Word doc, run two checks:

**1. Content check** — ask yourself:

- Does each bullet open with a strong action verb (not "Responsible for", "Helped", or "Assisted")?
- Is the first bullet in each role the most relevant one for this specific JD?
- Does the vocabulary in the bullets echo the JD without sounding forced?
- Are the metrics real and specific?
- Would a recruiter skimming for 30 seconds see a clear match?

If the answer to any of these is no, fix it before producing the output.

**2. Humanizer pass** — before finalizing, run the full output through the humanizer skill. Every bullet, every summary line. Recruiters can spot AI-written resumes instantly and it's an automatic rejection. The humanizer catches em dashes, inflated language, rule-of-three patterns, and other tells. This is not optional.

---

## Using the docx Skill

To produce the Word document, use the docx skill. The output should be a clean, professional one-page (or two-page if needed) resume. Match the user's original formatting: name/contact header, bold company names, italic role titles, bullet points for accomplishments.
