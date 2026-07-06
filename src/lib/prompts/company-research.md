---
name: company-research
description: >
  Use this skill when the user wants to research a company they're interested in — whether for an interview,
  an application, or just to decide if it's worth pursuing. Triggers on phrases like "tell me about [company]",
  "research [company]", "what does [company] do", "is [company] a good fit", "what should I know about [company]",
  or whenever the user names a company in a job-hunting context. Also invoke as a supporting step when running
  interview-prep or network-outreach — company context makes everything else sharper.
---

# Company Research

This skill does deep research on a target company and produces a structured brief with a fit analysis against the user's profile. It powers better interview prep, smarter outreach, and more informed decisions about where to apply.

**First step:** Read `~/.claude/get-me-a-job/references/profile.md` for the user's target roles, industries, strengths, and preferences. This is needed for the fit analysis section. If the file is missing, proceed with the research but skip the fit analysis and tell the user to run `/setup` to enable personalized fit scoring.

---

## Research Process

### Step 1: Gather the Basics

Use web search to find:

**Company fundamentals:**
- What they do (one sentence, in plain language)
- How they make money (business model)
- Stage: seed, Series A/B/C/D, public, bootstrapped
- Last funding round: amount, date, lead investors
- Team size (approximate)
- HQ location and remote policy
- Key leadership: CEO, CPO, CTO, VP Product (names and brief backgrounds)

**Product and market:**
- Core products and who uses them
- Competitors and how they differentiate
- Recent product launches or major features (last 6-12 months)
- Pricing model if visible

### Step 2: Find the Strategic Context

Go deeper than the "About Us" page:

**Recent news and signals:**
- Press coverage from last 6 months
- Blog posts from leadership (founders often reveal strategy here)
- Engineering blog (reveals technical culture and challenges)
- Job postings (what they're hiring for reveals where they're investing)

**Market position:**
- Where they sit vs. competitors
- Tailwinds and headwinds in their market
- Regulatory environment (if relevant)

**Culture signals:**
- Glassdoor/Blind reviews (themes, not individual complaints)
- How they talk about themselves vs. how employees talk about them
- Interview process structure (if documented)

### Step 3: Identify Pain Points

This is the most valuable part. Look for:

- **Product pain points**: Trustpilot/G2 reviews, user complaints on Twitter/Reddit, gaps in their feature set vs. competitors
- **Organizational pain points**: rapid hiring (scaling pain), leadership turnover, pivots
- **Strategic pain points**: market pressure, regulatory changes, international expansion challenges
- **Technical pain points**: engineering blog admissions, incident reports, migration announcements

These pain points feed directly into outreach (value-first approach) and interview prep (showing you understand their challenges).

### Step 4: Fit Analysis

Using `~/.claude/get-me-a-job/references/profile.md`, assess:

```
## Fit Analysis: [Company]

### Role Match
[How well do their open roles (or the specific role) match the user's target roles and seniority?]

### Industry Match
[How well does the company's industry match the user's industry preferences?]

### Strengths Alignment
[Which of the user's core strengths map to what this company needs? Which are irrelevant here?]

### Geography
[Does the location/remote policy work for the user?]

### Overall Fit: [Strong / Worth Pursuing / Stretch / Not a Fit]
[1-2 sentence summary of why]
```

### Step 5: Produce the Brief

Output a structured company brief:

```
# [Company Name] — Research Brief

## The One-Liner
[What they do in one plain sentence]

## Basics
- Stage: [X]
- Last round: [X]
- Team size: ~[X]
- HQ: [X]
- Key people: [CPO/VP Product name, CEO name]

## What They Build
[2-3 sentences on their product, who uses it, how they make money]

## Market and Competition
[2-3 sentences on where they sit, who they compete with, how they differentiate]

## Recent Moves
[Bullet list of notable recent events — launches, funding, hires, pivots]

## Pain Points (for outreach and interviews)
[The 2-3 most concrete problems you identified — product complaints, strategic challenges, technical debt]

## Culture and Interview
[What their interview process looks like, cultural signals, what kind of people they hire]

## Fit Analysis
[The fit analysis from Step 4]

## Suggested Next Steps
[Should the user apply? Reach out to someone? Prep for an interview? Skip this company?]
```

Save the brief to the workspace folder as `[Company Name] - Research Brief.md`.

---

## When This Skill Feeds Others

Company research is a building block. After producing a brief:
- If the user wants to apply: invoke resume-tailor with the JD + this context
- If the user has an interview: invoke interview-prep with this context
- If the user wants to network: invoke network-outreach with the pain points from this brief

The pain points section is especially valuable for network-outreach's value-first approach — it gives the user something concrete to reference in their outreach.
