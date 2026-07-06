---
name: interview-prep
description: >
  Use this skill when the user is preparing for a job interview or wants to practice answering interview questions.
  Triggers on phrases like "help me prep for an interview", "I have an interview at [company]", "what questions
  will they ask", "practice interview questions", "interview prep for [role]", "how do I answer [question type]",
  "behavioral questions", "what should I say about my background", or any mention of an upcoming interview.
  Also invoke when the user asks "how do I talk about my experience at [company]" or "what's my story for [role type]".
  If the user mentions they have an interview coming up, invoke this skill immediately.
---

# Interview Prep

This skill prepares the user for a specific interview with a specific company — not generic prep, but a targeted plan for the exact conversation they're about to have.

**First step every time:** Read `~/.claude/get-me-a-job/references/stories.md` for the user's key interview stories and how to map them to question types. Also read `~/.claude/get-me-a-job/references/resume.md` for their full background.

If `stories.md` is missing or empty, tell the user: "You don't have behavioral stories set up yet. These are the most important part of interview prep. Want to build them now?" Then walk them through creating 3-5 STAR stories and save to `~/.claude/get-me-a-job/references/stories.md`. If they want to skip, proceed with resume-based prep but flag that their answers will be weaker without structured stories.

---

## The Prep Process

### Step 1: Understand the Interview Context

Ask (if not already provided):
- What company and role?
- What stage is the interview (recruiter screen, hiring manager, case/product, panel, final round)?
- Do they know the interview format (behavioral, product sense, technical, case study, portfolio review)?

If the user doesn't know the format, help them look up what that company typically does — many companies have well-documented interview processes on Glassdoor, Blind, or their own careers pages.

### Step 2: Research the Company

Do a quick web search to understand:
- Stage and recent news (funding, product launches, challenges)
- Their products and how they make money
- Their stated mission and culture values
- Recent job postings for signals on what they care about
- LinkedIn profiles of their PM/eng/leadership team to understand backgrounds they hire

Bring this to the prep — "they just launched X, so they may ask about Y" is far more valuable than generic prep.

### Step 3: Generate Interview Questions

Generate 15-20 questions organized by type. For each question, provide:
- The question itself
- Why this company/role would ask it
- Which of the user's stories best answers it (reference stories.md)
- The ideal answer structure

**Behavioral questions (5-8)**: Use the STAR format (Situation, Task, Action, Result), but push the user to be specific and concrete. Vague STAR answers fail. The best behavioral answers have a crisp context setup (2 sentences max), a clear decision point, and a specific result with a number or observable outcome.

**Product sense questions (4-6)**: "Design a product for X", "What metric would you improve for Y", "How would you prioritize this roadmap?" Tailor these to the company's domain and the role's focus area.

**Resume / fit questions (3-4)**: "Walk me through your background", "Why do you want to leave your current role?", "Why this role?", "Why now?" These need sharp, rehearsed answers that don't sound rehearsed.

**Technical questions (2-3, if relevant)**: API design, data modeling, trade-off questions. More relevant for TPM or infrastructure roles.

**Role-specific questions**: Add questions specific to the role type (e.g., VC roles get "What's your investment thesis?"; consulting gets case questions; banking gets "walk me through a DCF").

### Step 4: Prepare the User's "Why" Story

Every interview needs a tight answer to: *"Tell me about yourself"* and *"Why this role?"*

These should be different for every company. Help the user craft a 2-minute opening that:
- Tells a coherent narrative arc (not a resume recitation)
- Lands on why this specific company/role is the natural next step
- Is confident without being arrogant

Read their resume and stories to build a narrative arc. The arc should connect their past roles into a coherent thread that leads to this company. Help them find the thread — most people's career stories have one, they just haven't articulated it.

### Step 5: Dos and Don'ts for This Specific Role

Tailor these to the company and role type. Generic advice is useless here.

**Format:**
```
### DOs for [Company] [Role]
- [Specific thing to emphasize and why]
- [Thing to do]

### DON'Ts for [Company] [Role]
- [Specific thing to avoid and why]
- [Thing to avoid]
```

**Common patterns by company type:**
- *Big tech / scaleup*: They want rigorous thinking, data fluency, and structured communication. Don't be sloppy with numbers or vague about decisions.
- *Early-stage startup*: They want hustle, ownership, and comfort with ambiguity. Don't sound like you need a team of 20 to ship.
- *Fintech / regulated industry*: They want someone who understands compliance isn't just red tape. Show you've navigated regulatory environments.
- *VC*: They want intellectual curiosity, pattern recognition, and a point of view. Don't show up without a clear thesis on something.
- *Consulting / strategy*: They want structured thinking and the ability to be compelling under pressure. Use frameworks but don't be robotic.

### Step 6: Practice Mode (Optional)

If the user wants to practice, run a mock interview:
- Ask them questions one at a time
- After each answer, give direct feedback: what worked, what was vague, what metric or detail would have made it stronger
- Don't just say "great answer" — be honest. If an answer is weak, say so and help them tighten it.
- Push them on specifics: "You said 'improved the process' — what was the process, what did you change, and what was the measurable result?"

---

## Humanizer Pass

Before delivering any written prep document (the question list, the "tell me about yourself" script, the dos/don'ts), run it through the humanizer skill. Interview prep docs often get shared with career coaches, friends, or practiced aloud — if the language sounds AI-generated, it undermines confidence instead of building it. The humanizer catches inflated language, em dashes, and robotic patterns. This is not optional.

---

## Key Principle

The goal is not to help the user memorize answers. It's to help them understand their own stories so well that they can adapt them naturally to any question. The best interview performance comes from deep confidence in your material, not perfect recall of scripts.

Push them to go specific. The difference between a good answer and a great answer is almost always a specific detail — a number, a person, a decision, a moment.
