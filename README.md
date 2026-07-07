# get-me-a-job

Paste a job description. Get a tailored resume, a cover letter that sounds human, and a cold email addressed to a real hiring manager — all saved to your Google Drive and sent from your own Gmail.

Open to anyone with a Google account.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- NextAuth.js v5 with Google OAuth + incremental scopes
- `@anthropic-ai/sdk` — Claude Sonnet 4.6 for generation and web_search-grounded contact research
- `googleapis` for Drive, Docs, and Gmail
- Hunter.io API for email lookup
- pnpm

## What it does end-to-end

`/apply` runs this pipeline:

1. **Tailor resume** — copy the user's Master Resume Google Doc into a per-job subfolder, ask Claude for structured bullet rewrites, apply them via `docs.batchUpdate replaceAllText`. Original formatting preserved.
2. **Cover letter** — 450-500 word letter grounded in the user's resume + optional STAR stories. Saved as a Doc in the same subfolder.
3. **Research contacts** — Claude Sonnet 4.6 with the `web_search_20250305` tool identifies real named targets (hiring manager first, then adjacent leaders) with per-target reasoning.
4. **Look up emails** — Hunter's `/v2/email-finder` per researched name.
5. **Draft 3 cold emails** — each personalized to its recipient, saved as Docs.
6. **Send via Gmail** — per-recipient Save-as-draft / Send-now buttons hit `/api/email/send`.

Everything lives in the user's Google Drive under `Job Search/[Company] - [Role]/`. No database — the Drive folder listing IS the application history.

## Local setup

1. **Install deps**
   ```bash
   pnpm install
   ```

2. **Google Cloud Console** — create an OAuth client of type **Web application** at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials). Add:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

   Enable Drive API, Docs API, and Gmail API in the same project.

3. **Copy env and fill in**
   ```bash
   cp .env.example .env.local
   ```
   Required:
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from step 2
   - `ANTHROPIC_API_KEY` — <https://console.anthropic.com/settings/keys>
   - `HUNTER_API_KEY` — <https://hunter.io/api-keys> (25 free searches/month)
   - `NEXTAUTH_URL` — `http://localhost:3000`

4. **Run**
   ```bash
   pnpm dev
   ```
   Open <http://localhost:3000>.

## Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add every env var from `.env.local` to Vercel (Settings → Environment Variables).
3. Set `NEXTAUTH_URL` to the Vercel URL (e.g. `https://get-me-a-job-web.vercel.app`).
4. In the Google OAuth client, add the Vercel URL to Authorized JavaScript origins and `https://<domain>/api/auth/callback/google` to redirect URIs.
5. Publish the OAuth consent screen (Testing → Production) so users outside the test list can sign in. Google will show an "unverified app" warning until you complete their verification review — that's fine for beta.

## Structure

```
src/
├── app/
│   ├── page.tsx                       landing
│   ├── onboarding/
│   │   ├── page.tsx                    connect Drive/Gmail cards
│   │   ├── resume/page.tsx             register master resume
│   │   └── stories/page.tsx            register STAR stories doc
│   ├── example-resume/page.tsx         one-page format reference
│   ├── example-stories/page.tsx        STAR story examples
│   ├── apply/page.tsx                  /apply wizard
│   ├── dashboard/page.tsx              applications list (from Drive)
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── resume/register/route.ts
│       ├── stories/register/route.ts
│       ├── tailor/route.ts             (SSE stream: read master, plan, copy, replace)
│       ├── cover-letter/route.ts       (SSE stream + save Doc)
│       ├── email/draft/route.ts        (SSE stream + save Doc)
│       ├── email/send/route.ts         (Gmail draft or send)
│       ├── contacts/research/route.ts  (Claude + web_search)
│       └── contacts/lookup/route.ts    (Hunter Email Finder)
├── auth.ts                             NextAuth v5 config with token refresh
├── components/
│   ├── apply-wizard.tsx                the main pipeline UI
│   ├── connect-card.tsx                incremental Drive/Gmail consent
│   ├── resume-link.tsx, stories-link.tsx
│   ├── session-error-gate.tsx          auto-signIn on refresh failure
│   └── (cmg-resume-preview, star-story-preview, sign-in-button, user-menu…)
└── lib/
    ├── anthropic.ts                    Claude client
    ├── google.ts                       Drive/Docs/Gmail helpers
    ├── hunter.ts                       Domain Search + Email Finder
    ├── research.ts                     Claude + web_search research
    ├── humanize.ts                     em-dash + curly-quote stream sanitizer
    ├── prompts/                        SKILL prompts + web-context override
    ├── scopes.ts                       incremental-auth scope groups
    ├── sse.ts                          client-side SSE reader
    └── stream.ts                       server-side Claude → SSE
```
