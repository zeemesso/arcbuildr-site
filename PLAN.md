# PLAN.md

Step 6 (Plan), 2026-10-24. Approved under the working mode in `CLAUDE.md`.

Sources: `COPY.md` (text), `PROTOTYPE.md` (structure), `CLAUDE.md` STACK (tools). Each task is small, has its own branch and its own test, and ends with `npm run check` passing (from task 2 on).

## How the build loop runs

1. Take the first task not marked done.
2. Branch: `claude/task-NN-<slug>`, based on the previous task's branch, so each preview shows everything built so far. Zyade merges the branches in order.
3. Implement, run the checks, fix until green.
4. Mark the task done here, with the date and what was VERIFIED.
5. Push. Workers Builds gives the branch a preview URL.

## Known constraints

- This sandbox can't reach `api.notion.com`, `api.resend.com`, `api.cloudflare.com` or `*.workers.dev`: the environment's network policy returns 403 (VERIFIED 2026-10-24 with `curl`). npm works (VERIFIED). So real API calls are proven from a Cloudflare preview, not from here. If Zyade adds those hosts to the environment's allowed domains, Claude can open previews and check results directly.
- Wrangler 4.152.0 runs here (VERIFIED). Worker Previews need 4.135.0 or later (REPORTED).
- Previews of non-main branches use the Worker's secrets, so preview tests write real rows to the Notion database. Test rows are named `TEST ...` and get deleted by hand.

## Technical decisions

| Area | Decision | Why |
|------|----------|-----|
| Site | Astro, static output, no adapter | Every page is static. Astro needs no adapter for static output (REPORTED, Astro docs) |
| Worker | One small Worker entry (`src/worker.ts`) serving the built files as static assets and handling `/api/*`, `/ig`, `/dm`, `/tt` first | Keeps Astro static. One place for all server logic |
| Notion | Plain `fetch` to the Notion REST API, no SDK | Reports on the Notion SDK in Workers are mixed (REPORTED) |
| Resend | Plain `fetch` to the Resend REST API | Same reason, and no dependency |
| Sender for alerts | `onboarding@resend.dev` until `arcbuildr.co` is verified in Resend | Domain verification is a DNS change. The test sender can only email the Resend account's own address (REPORTED) |
| FAQ | `<details>` / `<summary>` | Works without JavaScript, keyboard and screen-reader friendly |
| Booking | Cal.com embed script on `/thanks`, name and email prefilled from the URL | From the prototype |
| Agentation | React island, included only when the build-time branch is not `main` | Previews only, never on the live site |
| Tests | Vitest for Worker logic, Playwright (pre-installed Chromium) for pages, axe for accessibility | Runs in this sandbox without network to Cloudflare |
| Design | Decided in task 3 with the hallmark and frontend-design skills, written to `DESIGN.md` | No screenshots received yet. Zyade corrects through Agentation in step 9 |

## Tasks

### Task 1: Scaffold and prove the integrations
Branch `claude/task-01-proof`. Status: not started.

- Astro project with one placeholder page. `wrangler.jsonc` set up for Workers static assets, with `run_worker_first` for `/api/*`.
- `src/worker.ts` with `GET /api/selftest`, compiled in only when the build-time branch is not `main`. It:
  1. creates one Notion page in the leads database named `TEST selftest <time>`,
  2. sends one Resend email to the alert address,
  3. returns JSON: `{ notion: "ok" | error, resend: "ok" | error, branch: "<name>" }`.
- The build reads the branch name from Workers Builds' build variables (`WORKERS_CI_BRANCH`, UNVERIFIED name) and prints it into the build log and the placeholder page.
- **Done when:** on the branch preview, `/api/selftest` returns `notion: ok`, `resend: ok` and the branch name; the Notion row exists; the email arrives; the build log shows the branch name. Local `npm run build` passes (VERIFIED here). The rest is checked on the preview, by Claude if the hosts are allowed, otherwise by Zyade (2 minutes).
- If the branch variable doesn't exist, fall back to comparing the Worker version against production, and record that here.

### Task 2: Checks and CI
Branch `claude/task-02-checks`.
- `npm run check`: `astro check`, Prettier, Vitest, Playwright.
- GitHub Action running `npm run check` on every push.
- **Done when:** `npm run check` passes here and the Action is green.

### Task 3: Design system and base layout
Branch `claude/task-03-design`.
- `DESIGN.md`: type, color, spacing and the reasons, chosen with the hallmark and frontend-design skills. Fonts self-hosted. CSS custom properties.
- Base layout: sticky header (wordmark and "Book a call"), footer, page shell. Body text at least 16 px, tap targets at least 44 px.
- **Done when:** Playwright screenshots at 375 px and 1280 px match the prototype frames; axe reports no violations.

### Task 4: Home sections 1 to 5
Branch `claude/task-04-home`.
- Hero, Who it's for, What we build, Who does what, Who we are (photo and founder lines as placeholders), with anchors `#top`, `#for`, `#build`, `#roles`, `#us`.
- Text taken from `COPY.md` word for word.
- **Done when:** a test confirms every headline and body line from `COPY.md` appears on the page; the hero fits in a 375 x 667 first screen; all buttons jump to `#start`.

### Task 5: Questions section
Branch `claude/task-05-faq`.
- 8 questions as `<details>`, first one open.
- **Done when:** a test opens and closes each item by keyboard; the answers are in the page HTML.

### Task 6: Form (page side)
Branch `claude/task-06-form-ui`.
- Fields, labels, helper text, the right mobile keyboards, hidden `src`, `referrer`, `sent_at` and the spam trap.
- Inline errors, "Sending..." state with no double submit, server-failure message that keeps what was typed (copy from `PROTOTYPE.md`).
- Works without JavaScript as a plain form post.
- **Done when:** Playwright fills invalid and valid values, sees each error and state, and the request body has every field.

### Task 7: Lead endpoint
Branch `claude/task-07-lead-api`.
- `POST /api/lead`: validate, drop spam-trap hits, create the Notion row (Status: New), send the Resend alert, then redirect to `/thanks?name=&email=`.
- If Notion fails: return the failure state, no redirect. If only Resend fails: still redirect; the lead is safe in Notion.
- **Done when:** Vitest covers valid, invalid, spam, Notion down and Resend down, with `fetch` stubbed; a real `TEST` lead sent on the preview lands in Notion and triggers the email.

### Task 8: Short links
Branch `claude/task-08-short-links`.
- `/ig`, `/dm`, `/tt` redirect (302) to `/?src=ig|dm|tt`. The form copies `src` into its hidden field.
- **Done when:** Vitest checks each redirect; Playwright checks `src` reaches the request body.

### Task 9: Thanks page
Branch `claude/task-09-thanks`.
- Cal.com embed prefilled from the URL, fallback line, header without the button, `noindex`.
- **Done when:** Playwright sees prefill values passed to the embed; the fallback shows when the embed script is blocked; a direct visit with no URL values still works.

### Task 10: Privacy page
Branch `claude/task-10-privacy`.
- Five sections from `COPY.md`, naming Cloudflare, Notion, Resend and Cal.com. Marked "needs a legal check before launch" in `PLAN.md`, not on the page.
- **Done when:** the page builds and is linked from the form and the footer.

### Task 11: Agentation on previews
Branch `claude/task-11-agentation`.
- React island with the Agentation toolbar, included only when the build-time branch is not `main`.
- **Done when:** the preview shows the toolbar; a local build with the branch set to `main` contains no Agentation code (checked with `grep` on `dist/`).

### Task 12: Analytics, meta and 404
Branch `claude/task-12-meta`.
- Cloudflare Web Analytics beacon, page titles and descriptions from `COPY.md`, Open Graph tags, `robots.txt`, sitemap without `/thanks`, a plain 404 page.
- **Done when:** a test reads the built HTML and finds each tag; `/thanks` is absent from the sitemap.

### Task 13: Remove the self-test and run step 8
Branch `claude/task-13-test-pass`.
- Delete `/api/selftest`.
- Step 8 checks: build passes, layouts at 375 px and 1280 px, every link, the form end to end on the preview, Lighthouse mobile on the preview.
- **Done when:** all of the above are VERIFIED or listed with a reason, and the preview link goes to Zyade for step 9.

## Manual setup for Zyade

Everything below is free. Nothing touches DNS or the live domain. Total: about 50 minutes.

| # | What | Where | Time | Needed by |
|---|------|-------|------|-----------|
| 1 | Allow `api.notion.com`, `api.resend.com`, `api.cloudflare.com` and `*.workers.dev` in this cloud environment's network settings (Edit environment, Network access, Allowed domains; leave package managers ticked) | Claude Code environment settings | 3 min | Task 1 (optional, lets Claude check previews itself) |
| 2 | Notion: create an internal integration and copy its token. Create a database "Arcbuildr leads" with columns Name (title), Email (email), Instagram (text), Business (text), Goal (text), Source (select: ig, dm, tt, direct), Referrer (text), Submitted (date), Status (select: New, Booked, Call done, Client, Not a fit). Share the database with the integration and copy its ID from the URL | notion.so | 10 min | Task 1 |
| 3 | Resend: create a free account with the email that should get lead alerts, then create an API key | resend.com | 5 min | Task 1 |
| 4 | Cloudflare: create a free account. Workers & Pages, Create, Import a repository, pick `zeemesso/arcbuildr-site`. Production branch `main`; turn on builds for non-production branches; build command `npm run build`; deploy command `npx wrangler deploy`; non-production deploy command `npx wrangler versions upload`. Then add 4 secrets to the Worker: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `RESEND_API_KEY`, `ALERT_EMAIL`. Do this after Claude pushes the task 1 branch, which holds `wrangler.jsonc` | dash.cloudflare.com | 20 min | Task 1 |
| 5 | Cal.com: create a free account and a 30-minute event "Intro call". Send Claude the booking link | cal.com | 10 min | Task 9 |

Paste the token, IDs and keys only into the Cloudflare secrets screen. Never paste them into this chat or the repo.

On item 4: the `main` branch only gets a `*.workers.dev` address. `arcbuildr.co` stays untouched until you say deploy. The first `main` build may fail because `main` has no app yet (UNVERIFIED). That's expected and harmless.

## Later stops (not now)

- Launch: verify `arcbuildr.co` in Resend (DNS records), move the domain to Cloudflare (nameservers), attach it to the Worker, real handles and email (#18), founder lines and photo (#10), legal check of the privacy page.
