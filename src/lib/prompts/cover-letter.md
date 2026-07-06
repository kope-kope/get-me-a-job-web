---
name: cover-letter
description: >
  Use this skill whenever the user wants to write a cover letter for a job application. Triggers on phrases like
  "write a cover letter", "draft a cover letter", "cover letter for this role", "help me with a cover letter",
  or whenever a job description is present and the user mentions wanting a cover letter. Also invoke when the user
  says "do the same" or "full pipeline" for a new role if cover letters have been part of the workflow.
  If the user pastes a JD and says something like "let's apply to this one", invoke both the resume-tailor
  and this skill. Invoke proactively whenever a new application is being processed.
---

# Cover Letter Writer

This skill writes cover letters that sound like a real human wrote them, not a robot summarizing a resume.

**First step every time:** Read `~/.claude/get-me-a-job/references/resume.md` for context on the user's full background. Also read `~/.claude/get-me-a-job/references/stories.md` if it exists — it contains the user's personal stories and hooks. Reading these is for YOUR context — not so you can list them back.

If these files are missing or empty, tell the user to run `/setup` first.

---

## The Cardinal Rule

**Do not regurgitate the resume.**

The cover letter is not a prose version of the resume. It is not a place to walk through each role chronologically. It is not a place to list accomplishments with metrics from four different jobs.

The resume already exists. The recruiter will read it. The cover letter's job is to do what the resume cannot: tell a story, show personality, and make the reader feel something.

A cover letter that lists "At Company A I did X. At Company B I did Y. At Company C I did Z" is a wasted opportunity. The recruiter already has that information. What they don't have is the *why* — why the user cares, why this company, why this role, why now.

---

## How to Write a Good Cover Letter

### Step 1: Find the Emotional Hook

Every good cover letter opens with something that makes the reader lean in. This is a personal story or observation that connects to the company's mission.

Look for the hook in the user's `~/.claude/get-me-a-job/references/stories.md` file — it may contain personal hooks the user shared during `/setup`. If not, ask the user: "What's your personal connection to what this company does? Why do you actually care about this, beyond wanting a job?"

The hook should be 2-4 sentences. It should feel personal and specific. It should NOT be "I'm excited to apply for the [Role] at [Company]."

Good hooks come from:
- A personal experience that mirrors the company's mission (e.g., growing up without access to the thing the company provides)
- A moment in a previous role where the user saw the problem this company solves
- A genuine frustration or curiosity that led them to care about this space
- Something they built that connects to what the company is building

### Step 2: Pick ONE Anchor Story

Choose the single experience from the user's background that most directly parallels what the company is building. Go deep on this one story — the context, the challenge, the human stakes, what they learned. This is the proof point. ONE, not three or four.

Read `~/.claude/get-me-a-job/references/stories.md` and select the story that best maps to the company's domain and the role's core challenge. If the user has multiple relevant stories, pick the one with the strongest result and the most vivid detail.

### Step 3: Bridge to the Role

After the anchor story, connect it to what the company needs. Use THEIR language from the JD — not generic buzzwords. Show that you understand the specific problem they're trying to solve and explain why the user's experience is relevant to it.

This section should feel like a conversation, not an argument. "The compliance thread in the Visitors JD is basically my entire career" is better than "My experience aligns well with the requirements outlined in your job posting."

### Step 4: Add ONE Supporting Beat

You can briefly (1-2 sentences) mention one other experience that reinforces the anchor story. This is a supporting character, not a second protagonist. Don't give it its own paragraph. Weave it in naturally.

### Step 5: Close with Mission and Humanity

End by connecting back to why the user cares about what the company is building. Reference something real — the state of the world, a personal conviction, something they observed. Close warm, not corporate.

---

## Style Rules

- **Target length**: ~450-500 words in the body (excluding salutation and closing)
- **No em dashes.** Use commas, periods, or restructure.
- **No "I'm excited to apply" or "I believe I would be a great fit."** These are dead phrases.
- **Contractions are good.** "I've" not "I have." "That's" not "That is."
- **Short sentences mixed with longer ones.** Vary the rhythm.
- **Sign off warmly.** "Warmly," is good. "Best regards," is corporate.
- **Include contact info from resume.md**: name, school/degree, phone, email

---

## What NOT to Do

- Don't open each paragraph with a different job from the resume
- Don't use the phrase "leveraged my experience" or "utilized my skills"
- Don't write more than 500 words in the body
- Don't mention every company the user has worked at — pick the ones that matter for THIS letter
- Don't end with "I look forward to discussing how my qualifications align with your needs"
- Don't use bullet points in a cover letter
- Don't write something that could apply to any company if you swapped the name out

---

## Output

1. Write the cover letter as a text file first
2. **Run the full text through the humanizer skill before finalizing.** Cover letters are the most scrutinized document in an application — if it sounds AI-generated, it's worse than not sending one at all. The humanizer catches em dashes, inflated language, sycophantic tone, and other tells. This is not optional.
3. Verify word count (body only, excluding salutation and closing) is 450-500 words
4. If Google Drive is configured, save to Google Drive. Check `~/.claude/get-me-a-job/config.json` for `job_search_folder_id`. If it exists, create the doc in that folder:
   ```
   python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gdocs create "Cover Letter - [Company Name]" FOLDER_ID
   python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gdocs write DOC_ID "cover letter text"
   ```
   If no folder is configured, skip Google Drive and just produce the local file.
5. Also save as a local file: `[Company Name] - Cover Letter.docx` in the workspace folder

---

## Example Structure (NOT a template — just the shape)

```
Dear [Company] Hiring Team,

[Personal hook — 2-4 sentences. Something from the user's life that connects to the company's mission. Make the reader feel something.]

[Anchor story — the ONE experience that maps to what this company needs. Go deep. Context, challenge, stakes, what happened. 100-150 words.]

[Bridge — connect the anchor story to the specific role. Use their JD language. Show you understand their problem. 50-80 words.]

[Supporting beat — one other quick proof point, woven in naturally. 30-50 words.]

[Close — why this company, why now, what the user cares about. Warm and human. 30-50 words.]

Warmly,
[Name]
[Degree and school, graduation year]
[Phone] | [Email]
```

The best cover letters feel like you're overhearing someone talk about why they care. Not like you're reading an application.
