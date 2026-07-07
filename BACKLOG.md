# Backlog

Things worth doing that aren't blocking the current cut. Newest at the top of each section.

## Requested follow-ups

### Google Doc template link on `/example-resume`
Publish a public Google Doc in CMG format (or your own copy of one) and add a "Copy this template to Drive" button on `/example-resume`. A classmate without a formatted master resume can then start from a working template in one click.

- Needs: a share-anyone-can-view Google Doc of the CMG template.
- Implementation: button hits `/api/example-resume/copy` → uses the user's Drive scope to `drive.files.copy` the template into their "Job Search" folder as "Master Resume" (same idempotent register flow we already have).
- UX: after copy, redirect to `/onboarding/resume` with a pre-filled URL so the user just clicks "Save master resume."

### Redact PII in `src/lib/example-resume.ts`
Swap the real phone/email/LinkedIn/site in the `header.contact` block for placeholders like `[Your Phone] · you@berkeley.edu` (or move to an env-configurable "sample identity"). Everything else in the resume (jobs, education, additional) is discoverable via LinkedIn / the personal site and safe to keep.

- One-file edit. Consider keeping the real one at `example-resume.private.ts` (gitignored) so you can preview your actual resume locally.

## Product gaps in the /apply flow

### Cover letter as a Google Doc in the per-job subfolder
Currently streams markdown into a tab. Should also create a "[Company] - Cover Letter" Google Doc in the same per-job subfolder the tailored resume goes into, with the humanized letter content.

- Extend `/api/cover-letter` to (a) find or create the current job's subfolder and (b) after the stream ends, `docs.documents.create` and `insertText` the letter into it.
- Return the Doc URL to the client alongside the streamed text.

### Cold email → Gmail draft integrated with `/apply`
The `/api/email/send` route already supports `draft` and `send` modes. The UI in `/apply` still just streams text — it needs a "Save as Gmail draft" button that fires the draft mode, and a "Send it" button that fires send mode (with explicit confirmation).

- Also: parse `Subject: ...\n\n<body>` from the streamed response so we can pass structured `{ to, subject, body }` to the endpoint.
- To needs a real contact — see next item.

### Contact finder for cold outreach
Right now the cold email uses generic "someone on the team." The plugin uses Hunter.io + LinkedIn heuristics; the web app needs an equivalent.

- Option A: Hunter.io API key stored per user (add scope card in onboarding).
- Option B: LinkedIn company employee search via a search API (SerpAPI, etc.).
- Option C: Skip contact finding for MVP, ask user to paste the email address before draft.

### Dashboard: list past applications
Empty state right now. Populate from Drive by listing subfolders inside "Job Search" and showing them as cards with company/role/date and links to the tailored resume + cover letter + cold email draft.

- No database needed; Drive is source of truth.
- Sort by folder created time descending.

## Infra / polish

### Vercel deploy
Push the current main branch to Vercel, add all `.env.local` values as Vercel env vars, add `https://get-me-a-job-web.vercel.app` (or the final domain) as an authorized redirect URI on the OAuth client and to `javascript_origins`.

### Rotate `AUTH_SECRET` before prod
The dev value in `.env.local` is fine locally. Generate a fresh one for Vercel env: `openssl rand -base64 32`.

### Fix `localhost:300` typo in GCP `javascript_origins`
The OAuth client has `http://localhost:300` (missing a zero). Doesn't block sign-in but breaks any client-side Google API calls. Fix at [credentials page](https://console.cloud.google.com/apis/credentials?project=robotic-weft-489318-v0).

### Fuzzy-match fallback for `replaceAllText`
If Claude's `oldText` doesn't match verbatim (curly quotes, extra whitespace, invisible chars from Google Docs export), the replace silently skips. Options:
- Normalize both strings (strip smart quotes, collapse whitespace) before comparison.
- Fall back to inserting the tailored bullet at the location of the closest match.
- Report skipped rewrites to the user with the exact string mismatch so they can decide.

### Read master resume back into `/apply` UI hints
The apply wizard currently doesn't display anything about which master resume is being used. A tiny header row ("Tailoring from Master Resume · updated 3 days ago") would ground the user.

## Nice-to-haves

- **PDF export** of the tailored resume alongside the Google Doc.
- **Application-specific notes** field (user's own notes per job) saved into the subfolder as a `Notes.md` Doc.
- **`/interview`-equivalent flow** for interview prep, mirroring the plugin's `interview-prep` skill.
- **Multi-user analytics** (opt-in): how many applications, response rate, interview conversion, so classmates can compare.
