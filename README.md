# get-me-a-job (web)

Web app version of the [get-me-a-job](https://github.com/kope-kope/haas-job-plugins) plugin. Paste a job description, get a tailored resume, a cover letter, and a cold email — all saved to your Google Drive and Gmail. Restricted to `@berkeley.edu` accounts.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- NextAuth.js v5 with Google OAuth + incremental scopes
- `@anthropic-ai/sdk` (Claude Sonnet 4.6 for most, Opus 4.7 for the humanizer pass)
- `googleapis` for Drive, Docs, and Gmail
- pnpm

## Local setup

1. **Install deps**
   ```bash
   pnpm install
   ```

2. **Create a Google OAuth client** of type **Web application** in the same GCP project as the plugin (`robotic-weft-489318-v0`). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.

3. **Copy env and fill in**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `AUTH_SECRET` (`openssl rand -base64 32`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`.

4. **Run**
   ```bash
   pnpm dev
   ```
   Open <http://localhost:3000>.

## What ships in MVP

- Landing page + Google sign-in (Berkeley-only via email domain check)
- Onboarding wizard:
  1. Sign in (basic scopes)
  2. Connect Google Drive + Docs
  3. Optionally connect Gmail
  4. Upload master resume (parsed to markdown, saved as Google Doc)
- `/apply` wizard: paste JD → streaming tailored resume, cover letter, cold email in three tabs
- `/dashboard` shell: status, "Apply to a new job" CTA, applications list (empty for MVP)

## Structure

```
src/
├── app/
│   ├── page.tsx              landing
│   ├── onboarding/
│   │   ├── page.tsx          connect Drive/Gmail cards
│   │   └── resume/page.tsx   upload master resume
│   ├── apply/page.tsx        the /apply wizard
│   ├── dashboard/page.tsx    "my applications"
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── resume/parse/route.ts
│       ├── resume/save/route.ts
│       ├── tailor/route.ts               (SSE stream)
│       ├── cover-letter/route.ts         (SSE stream)
│       └── email/{draft,send}/route.ts
├── auth.ts                    NextAuth config
├── lib/
│   ├── anthropic.ts           Claude client
│   ├── google.ts              Drive/Docs/Gmail helpers
│   ├── prompts/               SKILL prompts from the plugin
│   ├── scopes.ts              incremental-auth scope groups
│   ├── sse.ts                 client-side SSE reader
│   └── stream.ts              server-side Claude → SSE
└── components/                shared UI
```

## Deploy

Vercel. Add all `.env.local` values as Vercel env vars. Add the deployed origin to the OAuth client's authorized redirect URIs.
