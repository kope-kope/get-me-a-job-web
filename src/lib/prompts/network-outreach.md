---
name: network-outreach
description: >
  Use this skill when the user wants to reach out to people in their network or find contacts at a target company.
  Triggers on phrases like "help me reach out to someone at [company]", "who should I talk to about this role",
  "write me a LinkedIn message", "help me cold outreach", "find someone at [company] to speak with",
  "how do I network for this job", "can you write a message to [person]", "help me do informational interviews",
  "who in my network works at [company]", or "help me get a referral". Also invoke when the user mentions a
  target company and seems to be in job-hunting mode — offer to help them find the right people to contact.
---

# Network Outreach

This skill helps the user identify the right people to contact at target companies and craft outreach messages that actually get responses.

**First step every time:** Read `~/.claude/get-me-a-job/references/network-context.md` for context on the user's network and which communities they're part of. Also read `~/.claude/get-me-a-job/references/outreach-style-guide.md` for their preferred outreach tone and style.

If these files are missing or empty, tell the user: "You don't have your network context or outreach style set up yet. Want to do a quick setup now?" Walk them through it (what communities are you in? what tone do you prefer?) and save the files. Or tell them to run `/setup`.

---

## The Outreach Process

### Step 1: Identify Who to Reach Out To

For any target company or role, help the user identify the right people. The best contacts are usually:

**Warm path (always try first)**:
- Alumni from the user's school at the company (search LinkedIn: "[school name]" at [company])
- Former colleagues from previous companies
- Professional community connections (accelerators, fellowships, industry groups)
- Mutual LinkedIn connections

Read `~/.claude/get-me-a-job/references/network-context.md` to understand which communities the user belongs to. These are their warmest paths.

**Target contacts by role type**:
- *For PM roles*: Product managers at the company (same level or 1 level up), the hiring manager if identifiable, anyone who has posted about the team's work
- *For VC roles*: Associates, Principals, or Partners at the fund; portfolio company founders the fund has backed
- *For consulting/banking*: Alumni who went through the same recruiting process, people in the specific practice area
- *For eng roles*: Engineers on the team, engineering managers, people who've given talks about the company's tech stack

**Email finding**: If Hunter.io or Apollo is connected, use it to find email addresses. Try the Email-Finder tool with the person's name and company domain, or Domain-Search to find contacts at a company. If no email tool is available, fall back to LinkedIn outreach and email pattern guessing (first.last@company.com, first@company.com, etc.).

### Step 2: Research Before Writing

**CRITICAL: Do not write a single word of outreach before researching the company and the person.**

Research the company:
- Website, product, blog
- Trustpilot/G2 reviews (user complaints are gold for value-first outreach)
- Engineering blog, product changelog
- Press interviews with founders
- The job description itself (what they're hiring for reveals what they're struggling with)

Research the person:
- Their LinkedIn profile, career path
- Any posts, articles, or talks they've given
- Their specific team and what they work on

### Step 3: Craft the Outreach Message

Read `~/.claude/get-me-a-job/references/outreach-style-guide.md` for the user's preferred approach. The default is the **value-first product insight** approach:

**The value-first approach (default):**
1. Find a specific, observable problem in the company's product or business (user complaints, UX friction, missing feature, data quality issue)
2. Connect it to something the user has solved before — a concrete example
3. Propose a fix or framework, not just a question

This works because it proves you can actually do the job. You're not saying "I'm curious about your search experience," you're saying "I used your search, here's what's broken, here's how I'd fix it." That's a work sample disguised as an email.

**If research doesn't surface a product problem, fall back to the curiosity bridge:**
- Frame the connection as a genuine question: "I keep wondering if this is the same class of problem I was working on at [X]?"
- Make the reader feel like they have something to offer, not like they're being pitched

**Message structure (either approach):**
1. **Hook** (1 sentence): Why you're reaching out to *them specifically*. Reference something real.
2. **Who you are** (1-2 sentences): Your most relevant credential for this conversation. Not your whole resume.
3. **The value or the ask** (1-3 sentences): Either the product insight + proposed fix, or a specific small ask ("20-minute call to hear about your experience on the [X] team").
4. **Close** (1 sentence): Warm, not corporate.

**Tone rules:**
- Warm but direct. Not servile. The user has a strong background — the message should feel peer-to-peer.
- Under 150 words for LinkedIn. Under 200 words for email.
- Use contractions. "I've" not "I have."
- No em dashes.
- No "I hope this message finds you well", "I'd love to connect", "I was impressed by", "I came across your profile."
- End casually: "Thanks so much" or "Would really appreciate it" beats "Best regards."

**Subject line rule (for email):**
The subject line should create curiosity, not describe credentials.
- Wrong: "Technical PM role — regulated product background, MBA"
- Right: "Quick question about [specific thing they're building]" or "Is this the same problem?"

### Step 4: Follow-Up Strategy

If there's no response after 5-7 days, one follow-up is fine and often necessary:
- 2-3 sentences max
- Add a small new piece of value (an article, a question, a mutual connection mention)
- Don't guilt-trip ("Just following up on my earlier message...")

After two messages with no response, move on. Don't burn the contact.

### Step 5: Pre-Call Prep

Once someone agrees to a call, help the user prepare:
- Research the person's career path
- What does the user genuinely want to learn from them?
- 3-5 good questions to ask (not "do you have any open roles?" — that's for later)
- What's a graceful way to ask for a referral or introduction if the call goes well?

---

## Humanizer Pass

Before showing any outreach draft to the user, run it through the humanizer skill. Outreach that sounds AI-generated gets ignored or, worse, damages the user's reputation. The humanizer catches em dashes, inflated language, sycophantic tone, and other tells. This is not optional — it's the difference between an email that gets a response and one that gets deleted.

---

## Sending via Gmail

After the humanizer pass and after the user has seen and approved the draft, save it as a Gmail draft first so they can also see it in their inbox before sending:

```
python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gmail draft recipient@company.com "Subject" @/tmp/outreach-body.txt
```

Write the body text to a temp file (e.g. `/tmp/outreach-body.txt`) rather than passing a giant string on the command line — it's safer and survives shell quoting issues.

Send only when the user replies "send it" / "yes, send" (or equivalent unambiguous approval) in chat:

```
python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gmail send recipient@company.com "Subject" @/tmp/outreach-body.txt
```

For follow-ups in an existing thread, use `gmail reply MESSAGE_ID @body.txt` instead — it reuses the original thread and Subject so the conversation stays threaded.

If the user wants to track outreach, optionally label the sent message:
```
python ${CLAUDE_PLUGIN_ROOT}/lib/run.py gmail label MESSAGE_ID "Outreach/Sent"
```

---

## Email Safety Rule

**NEVER call `gmail send` or `gmail reply` without showing the user the full draft first and getting their explicit approval in the chat.** Draft first, approve first, send second. No exceptions. A `gmail draft` (which only stages, doesn't deliver) is fine to run after the humanizer pass.

---

## What Not to Do

- Don't ask for a job in the first message. It ends the conversation immediately.
- Don't send the same message to 20 people. It reads as spam.
- Don't use "I hope this message finds you well." It signals a generic template.
- Don't ask open-ended questions like "any advice?" — too much cognitive load, no one responds.
- Don't apologize for reaching out. It undermines the ask.
