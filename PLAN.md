# PLAN.md

Step 6 (Plan), 2026-10-24. Approved under the working mode in `CLAUDE.md`. Revised 2026-10-24: single build branch, locked-down self-test, Notion version pinned.

Sources: `COPY.md` (text), `PROTOTYPE.md` (structure), `CLAUDE.md` STACK (tools). Each task is small, is one commit and has its own test. From task 2 on, each ends with `npm run check` passing.

## How the build loop runs

1. All build work happens on one branch, `claude/build`, based on the planning branch. One commit per task, in order. No other task branches.
2. `main` is untouched until Zyade says deploy. Then he merges `claude/build` once.
3. Take the first task not marked done. Implement it, run the checks, fix until green. Mark it done here in the same commit, with the date and what was VERIFIED. Push.
4. Workers Builds gives `claude/build` a preview URL. Claude checks it with `curl`.

## Known constraints

- The sandbox network allows `*.workers.dev`, npm and git only. Claude verifies previews with `curl` and never calls Notion or Resend from the sandbox. Only the deployed Worker calls them. (`api.notion.com`, `api.resend.com` and `api.cloudflare.com` returned 403 on 2026-10-24: VERIFIED. The `*.workers.dev` allowance is REPORTED, from Zyade.)
- Environment variables added in the Claude Code environment settings appear only in a new session (REPORTED, Claude Code docs). `SELFTEST_KEY` needs that before Claude can call the self-test.
- Wrangler 4.152.0 runs here (VERIFIED). Worker Previews need 4.135.0 or later (REPORTED).
- Preview tests write real rows to the Notion database. Test rows are named `TEST ...`; Zyade deletes them by hand.

## Technical decisions

| Area | Decision | Why |
|------|----------|-----|
| Site | Astro, static output, no adapter | Every page is static. Astro needs no adapter for static output (REPORTED, Astro docs) |
| Worker | One small Worker entry (`src/worker.ts`) serving the built files as static assets and handling `/api/*`, `/ig`, `/dm`, `/tt` first | Keeps Astro static. One place for all server logic |
| Notion | Plain `fetch` to the Notion REST API, no SDK. API version pinned as one constant, `NOTION_VERSION = "2022-06-28"`, in `src/lib/notion.ts`. Rows are created with `database_id` | Reports on the Notion SDK in Workers are mixed (REPORTED). `2022-06-28` needs only the database ID from the URL, not the extra data source ID that `2025-09-03` needs. Whether Notion still accepts `2022-06-28` for a database created in 2026 is UNVERIFIED; the self-test proves it. If it is rejected, switch to `2025-09-03` with `data_source_id` and tell Zyade where to copy the ID |
| Resend | Plain `fetch` to the Resend REST API | Same reason, and no dependency |
| Sender for alerts | `onboarding@resend.dev` until `arcbuildr.co` is verified in Resend | Domain verification is a DNS change. The test sender can only email the Resend account's own address (REPORTED) |
| FAQ | `<details>` / `<summary>` | Works without JavaScript, keyboard and screen-reader friendly |
| Booking | Cal.com embed script on `/thanks`, name and email prefilled from the URL | From the prototype |
| Agentation | React island, included only when the build-time branch is not `main` | Previews only, never on the live site |
| Tests | Vitest for Worker logic, Playwright (pre-installed Chromium) for pages, axe for accessibility | Runs in this sandbox without network to Cloudflare |
| Branch name | `WORKERS_CI_BRANCH` first; if missing, `git rev-parse --abbrev-ref HEAD`; if that fails or says `HEAD`, `unknown`. The source is recorded. `unknown` counts as `main`: preview-only features stay off | Fails closed. `WORKERS_CI_BRANCH` is UNVERIFIED until the first Workers build |
| Design | Decided in task 3 with the hallmark and frontend-design skills, written to `DESIGN.md` | No screenshots received yet. Zyade corrects through Agentation in step 9 |

## Tasks

### Task 1: Scaffold and prove the integrations
Commit: `task 1`. Status: DONE 2026-10-25.

Preview self-test (VERIFIED, 2026-10-25, commit b7c4f2c, `https://claude-build-arcbuildr.zeemesso.workers.dev`):
- No header: 404. With the key: HTTP 200, `ok: true`, `branch: "claude/build"`, `branchSource: "WORKERS_CI_BRANCH"`, commit `b7c4f2c7a365`.
- Notion accepted `2022-06-28`: row id `404b0a5d-b459-816d-94b5-d2eec716c46d`. No switch to `2025-09-03` needed.
- Resend message id `01a1736e-edad-7bb8-a3d4-7241a2c255dd`.
- Earlier causes fixed: Preview URLs toggle (Zyade) and a `SELFTEST_KEY` mismatch (Zyade). CI fix: `typecheck` runs `scripts/build-info.mjs` first; Action green on 1ac9589.
- Done-when item 5 (`main` gives 404 with the key) was verified in local workerd on 2026-10-24; the `/api/selftest` route is now removed, so `main` has no such route at all.
- Zyade: delete the `TEST selftest` row in Notion by hand.

Preview check (VERIFIED, 2026-10-25), after Zyade turned on Preview URLs:
- Preview URL: `https://claude-build-arcbuildr.zeemesso.workers.dev` (branch alias) and `https://<first 8 of version id>-arcbuildr.zeemesso.workers.dev` (per version). Both return 200. The page shows `Build: claude/build (WORKERS_CI_BRANCH)`, so `WORKERS_CI_BRANCH` works.
- `/api/selftest` with no header, a wrong header, and the right-looking key all return 404.
- Temporary `/api/selftest-diag` (removed in task 1b) shows all 5 secrets are bound, `SELFTEST_KEY` is 48 characters, and the header's hash does not match. Cause: the Cloudflare `SELFTEST_KEY` secret differs from the Claude Code environment `SELFTEST_KEY`. Zyade must set both to the same value.
- Notion row id, Resend message id: not yet.
- CI fix: `typecheck` now runs `scripts/build-info.mjs` first. The GitHub Action `check` is green on 1ac9589 (VERIFIED).

Verified here (VERIFIED, 2026-10-24):
- `npm test`: 17 Vitest tests pass, including all 404 cases and the Notion and Resend request shapes with `fetch` stubbed.
- `npm run build` passes; `tsc --noEmit` passes; `wrangler deploy --dry-run` bundles the Worker and one asset.
- Ran the Worker in local workerd with a fake key and no Notion or Resend secrets, so no outside call was possible. On branch `claude/build`: no header gives 404, the right key gives the JSON with `missing NOTION_TOKEN` and `missing RESEND_API_KEY`. On branch `main`: both give 404. The placeholder page shows the branch line.

- Astro project (static output) with one placeholder page. `wrangler.jsonc` for Workers static assets, with `run_worker_first` for `/api/*`.
- Build step `scripts/build-info.mjs` records the branch as in the decisions table, prints it in the build log and shows it on the placeholder page.
- `src/lib/notion.ts` and `src/lib/resend.ts`: the same functions task 7 uses for real leads.
- `GET /api/selftest` returns the same 404 as any unknown `/api` path unless all of these hold: the branch is known and is not `main`; secret `SELFTEST_KEY` is set and at least 16 characters; the request header `X-Selftest-Key` equals it. When they hold, it creates one Notion row `TEST selftest <time>` using every real column, sends one Resend email to `ALERT_EMAIL`, and returns JSON with the branch, branch source, commit, Notion page id and Resend message id. It never returns secrets or the APIs' response bodies.
- **Done when:**
  1. Vitest passes: the 404 cases (no header, wrong header, short key, no key, main, unknown branch) and the request shapes, with `fetch` stubbed.
  2. `npm run build` and a `wrangler deploy --dry-run` bundle succeed here.
  3. On the `claude/build` preview, `curl -H "X-Selftest-Key: $SELFTEST_KEY" <preview>/api/selftest` returns `notion.ok`, `resend.ok`, a Notion page id, a Resend message id and `branch: "claude/build"` with the branch source.
  4. The same call without the header returns 404.
  5. On `main`, the call returns 404 even with the key. Checked after the first merge, or by building locally with the branch set to `main`.

### Task 1b: Remove the self-test
Commit: `task 1b`. Status: DONE 2026-10-25. Preview f83375d: `/api/selftest` and `/api/selftest-diag` both 404 with the right key (VERIFIED). `npm run check` passes (VERIFIED: 7 Vitest tests, build, Playwright).

- Delete `/api/selftest`, its key check and its tests. Keep `notion.ts` and `resend.ts`.
- **Done when:** the preview returns 404 on `/api/selftest` even with the key; `npm run build` passes. Zyade can then delete the `SELFTEST_KEY` secret.

### Task 2: Checks and CI
Commit: `task 2`. Status: built 2026-10-24; waiting for the first GitHub Action run.

Verified here (VERIFIED, 2026-10-24): `npm run check` passes: Prettier, `astro check` (0 errors), 17 Vitest tests, build, and the Playwright smoke test at phone (Pixel 7) and desktop (1280 px) sizes using the sandbox Chromium.
- The smoke test caught a missing favicon (the browser's `/favicon.ico` request returned 404). Added a placeholder `public/favicon.svg`; task 3 replaces it.
- TypeScript is pinned to 6, because `@astrojs/check` does not support 7 yet.
- In CI, `npx playwright install chromium` provides the browser instead of the sandbox copy.
- `npm run check`: `astro check`, Prettier, Vitest, Playwright.
- GitHub Action running `npm run check` on every push.
- **Done when:** `npm run check` passes here and the Action is green.

### Task 3: Design system and base layout
Commit: `task 3`. Status: DONE 2026-10-25. `DESIGN.md` written; base layout, tokens and fonts in place. `npm run check` passes: axe clean, sticky header, 16 px body, 44 px targets, at phone and desktop sizes (VERIFIED). Phone test runs at 412 px (Pixel 7), not 375 px.
- `DESIGN.md`: type, color, spacing and the reasons, chosen with the hallmark and frontend-design skills. Fonts self-hosted. CSS custom properties.
- Base layout: sticky header (wordmark and "Book a call"), footer, page shell. Body text at least 16 px, tap targets at least 44 px.
- **Done when:** Playwright screenshots at 375 px and 1280 px match the prototype frames; axe reports no violations.

### Task 4: Home sections 1 to 5
Commit: `task 4`. Status: DONE 2026-10-25. `npm run check` passes (VERIFIED): a test checks every headline and body line of Home sections 1 to 5 against `COPY.md` text, the six anchors, the hero button jumping to `#start`, and the hero fitting 375 x 667. `#start` holds only the heading and intro until task 6. The page keeps `noindex` until task 12.
- Hero, Who it's for, What we build, Who does what, Who we are (photo and founder lines as placeholders), with anchors `#top`, `#for`, `#build`, `#roles`, `#us`.
- Text taken from `COPY.md` word for word.
- **Done when:** a test confirms every headline and body line from `COPY.md` appears on the page; the hero fits in a 375 x 667 first screen; all buttons jump to `#start`.

### Task 5: Questions section
Commit: `task 5`. Status: DONE 2026-10-25. `npm run check` passes (VERIFIED): 8 `<details>` items, first open; each item opens and closes with Enter and Space; all 8 answers are in the served HTML; axe still clean.
- 8 questions as `<details>`, first one open.
- **Done when:** a test opens and closes each item by keyboard; the answers are in the page HTML.

### Task 6: Form (page side)
Commit: `task 6`. Status: DONE 2026-10-25. `npm run check` passes (VERIFIED, `/api/lead` stubbed in the browser): each error shows and clears; keyboards and attributes; one POST with every field (`name`, `email`, `instagram`, `business`, `goal`, `src`, `referrer`, `sent_at`, `website`); "Sending..." and a disabled button; an unknown `src` becomes `direct`; a 502 shows the failure message and keeps the typed values; without JavaScript the form is a plain POST to `/api/lead` with native `required`; axe clean.
- Contract for task 7: the script posts urlencoded with `Accept: application/json` and expects `200 {"ok":true}`; any other answer shows the failure message. It then goes to `/thanks?name=&email=` itself. A plain (no-JS) post expects a 303 redirect to the same URL. The spam trap field is `website`. The DM line "@arcbuildr" is plain text until the handle is confirmed (#18).
- Fields, labels, helper text, the right mobile keyboards, hidden `src`, `referrer`, `sent_at` and the spam trap.
- Inline errors, "Sending..." state with no double submit, server-failure message that keeps what was typed (copy from `PROTOTYPE.md`).
- Works without JavaScript as a plain form post.
- **Done when:** Playwright fills invalid and valid values, sees each error and state, and the request body has every field.

### Task 7: Lead endpoint
Commit: `task 7`. Status: DONE 2026-10-25, one check left for Zyade.
- `npm run check` passes (VERIFIED): 9 new Vitest tests with `fetch` stubbed cover valid (JSON and no-JS 303), invalid, spam trap, Notion down and throwing, Resend down and throwing.
- Preview `claude-build-arcbuildr.zeemesso.workers.dev` on 90e2472 (VERIFIED with curl): a `TEST lead` POST returned `200 {"ok":true}`, which the code only returns after Notion accepted the row. Invalid gives 400 with field errors; the spam trap gives 200 and stores nothing; GET gives 404.
- Not seen from here: the row in Notion and the alert email (the sandbox cannot read either). Zyade: look for a `TEST lead` row with Source `ig` and an email "New lead: TEST lead ..." in the alert inbox, then delete the row. Tell Claude if either is missing.
- `POST /api/lead`: validate, drop spam-trap hits, create the Notion row (Status: New), send the Resend alert, then redirect to `/thanks?name=&email=`.
- If Notion fails: return the failure state, no redirect. If only Resend fails: still redirect; the lead is safe in Notion.
- **Done when:** Vitest covers valid, invalid, spam, Notion down and Resend down, with `fetch` stubbed; a real `TEST` lead sent on the preview lands in Notion and triggers the email.

### Task 8: Short links
Commit: `task 8`. Status: DONE 2026-10-25. Vitest checks each redirect (302 to `/?src=ig|dm|tt`, trailing slash, other paths untouched). Playwright checks that `?src=ig` reaches the request body (`form.spec.ts`), because `astro preview` does not run the Worker. On the preview (2c25019, VERIFIED with curl): `/ig`, `/dm`, `/tt` and `/ig/` answer 302 to `/?src=...`; `/igg` gives 404.
- `/ig`, `/dm`, `/tt` redirect (302) to `/?src=ig|dm|tt`. The form copies `src` into its hidden field.
- **Done when:** Vitest checks each redirect; Playwright checks `src` reaches the request body.

### Task 9: Thanks page
Commit: `task 9`. Status: not started.
- Cal.com embed prefilled from the URL, fallback line, header without the button, `noindex`.
- **Done when:** Playwright sees prefill values passed to the embed; the fallback shows when the embed script is blocked; a direct visit with no URL values still works.

### Task 10: Privacy page
Commit: `task 10`. Status: not started.
- Five sections from `COPY.md`, naming Cloudflare, Notion, Resend and Cal.com. Marked "needs a legal check before launch" in `PLAN.md`, not on the page.
- **Done when:** the page builds and is linked from the form and the footer.

### Task 11: Agentation on previews
Commit: `task 11`. Status: not started.
- React island with the Agentation toolbar, included only when the build-time branch is not `main`.
- **Done when:** the preview shows the toolbar; a local build with the branch set to `main` contains no Agentation code (checked with `grep` on `dist/`).

### Task 12: Analytics, meta and 404
Commit: `task 12`. Status: not started.
- Cloudflare Web Analytics beacon, page titles and descriptions from `COPY.md`, Open Graph tags, `robots.txt`, sitemap without `/thanks`, a plain 404 page.
- **Done when:** a test reads the built HTML and finds each tag; `/thanks` is absent from the sitemap.

### Task 13: Remove the self-test and run step 8
Commit: `task 13`. Status: not started.
- Step 8 checks: build passes, layouts at 375 px and 1280 px, every link, the form end to end on the preview, Lighthouse mobile on the preview.
- **Done when:** all of the above are VERIFIED or listed with a reason, and the preview link goes to Zyade for step 9.

## Manual setup for Zyade

Everything below is free. Nothing touches DNS or the live domain. Total: about 55 minutes.

| # | What | Where | Time | Needed by |
|---|------|-------|------|-----------|
| 1 | Claude Code environment (menu in the session title bar, Edit): Network access, add `*.workers.dev` under Allowed domains and leave package managers ticked. Add an environment variable `SELFTEST_KEY` set to a random string of 48 characters (`openssl rand -hex 24`). Then start a new session, because variables appear only in new sessions | Claude Code | 5 min | Verifying task 1 |
| 2 | Notion: create an internal integration and copy its token. Create a database "Arcbuildr leads" with columns Name (title), Email (email), Instagram (text), Business (text), Goal (text), Source (select: ig, dm, tt, direct), Referrer (text), Submitted (date), Status (select: New, Booked, Call done, Client, Not a fit). Share the database with the integration and copy its ID from the URL | notion.so | 10 min | Task 1 |
| 3 | Resend: create a free account with the email that should get lead alerts, then create an API key | resend.com | 5 min | Task 1 |
| 4 | Cloudflare: create a free account. Workers & Pages, Create, "Start with Hello World", name it exactly `arcbuildr` (it must match `name` in `wrangler.jsonc`), and deploy it. Then in that Worker: Settings, Builds, Connect `zeemesso/arcbuildr-site`. Production branch `main`. Turn on builds for non-production branches. Build command `npm run build`; deploy command `npx wrangler deploy`; non-production deploy command `npx wrangler versions upload`. Then Settings, Variables and Secrets: add 5 secrets, `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `RESEND_API_KEY`, `ALERT_EMAIL`, `SELFTEST_KEY` (same value as item 1) | dash.cloudflare.com | 25 min | Task 1 |
| 5 | Cal.com: create a free account and a 30-minute event "Intro call". Send Claude the booking link | cal.com | 10 min | Task 9 |

Paste the token, IDs and keys only into Cloudflare's secrets screen and the Claude Code environment settings. Never paste them into the chat or the repo.

Notes on item 4:
- Create the Worker by hand first. If the repo is connected before a Worker exists, the first build runs on `main`, which has no app yet, and fails. Secrets can't be added until the Worker exists.
- Pushes to `main` will keep failing to build until you merge `claude/build`. That is expected and harmless: the live domain isn't attached.
- If the GitHub check on `claude/build` doesn't show the preview URL, send Claude the `*.workers.dev` subdomain (shown on the Worker's page).

## Later stops (not now)

- Launch: verify `arcbuildr.co` in Resend (DNS records), move the domain to Cloudflare (nameservers), attach it to the Worker, real handles and email (#18), founder lines and photo (#10), legal check of the privacy page.
