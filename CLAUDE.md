# CLAUDE.md

Project: arcbuildr.co, built from zero. This repo is the whole project.

## WHO

- Zyade runs Arcbuildr with co-founder Hanane.
- Arcbuildr is a personal brand service. We build a business-driven client's brand and content from their real story and expertise.
- Deliverables: Brand Strategy, Visual Identity System, Profile Audit & Optimization, Content Strategy & Production, Ongoing Support.
- Platforms: mainly Instagram, some TikTok. No LinkedIn. No YouTube.
- Packages are drafts. Never put prices or package details on the site unless Zyade provides them.
- The domain was wiped to day one. There is no old content to reuse.

## HOW WE BUILD

Follow these steps in order. Do not skip a step. Copy comes first; the structure adapts to the copy.

1. **Context.** Built from Zyade's brief, saved in `.agents/product-marketing.md`. Use only what the brief says; tag anything else [ASSUMED].
2. **Copy.** All page copy in `COPY.md`, in Zyade's voice. Every [ASSUMED] item is listed at the top. Zyade approves it.
3. **Requirements.** A short bullet list, derived from the approved copy. Every page, section and field has a stated purpose. Zyade approves it.
4. **Architecture.** Propose stack, hosting, integrations (email capture, booking, analytics, pixel) and the funnel: traffic source → router → page → outcome. Zyade approves it.
5. **ASCII prototype** of every page, shaped around the copy. Iterate until the structure is right.
6. **Plan.** Small tasks, each independently testable, written in `PLAN.md`. Zyade approves it.
7. **Build loop.** Take one task, implement it, run build/lint/tests, fix, mark it done in `PLAN.md`, take the next. Tell Zyade when to switch the model to Sonnet 5.5 for this step. Opus stays on planning and copy.
8. **Test.** Build passes, mobile and desktop layouts checked, every link and form works.
9. **Visual feedback.** Locally: `npm run dev` on `http://127.0.0.1:4322` with the Agentation toolbar synced live to `agentation-mcp` on `localhost:4747`. Zyade clicks and annotates; Claude reads `GET /pending` and fixes. Remotely: a Cloudflare preview URL per branch, toolbar on non-main branches only, annotations pasted into the chat.
10. **Deploy** only when Zyade says so.
11. **Iterate** from real use.

## RULES

- Planning is 80% of the work. No code before step 6 (Plan) is approved.
- Design references (REA rule): any reference site, URL or screenshot, is analyzed with REA or Playwright before a design decision. Record only its mechanics (grid, type scale, spacing, color logic, motion, section patterns) in `docs/references/<site>.md`. Never copy its code, text or assets. Strip tracking parameters and tokens from reference URLs.
- Pick the right skill yourself from `~/.claude/skill-index.md`; Zyade does not type slash commands.
- Model routing follows `~/.claude/model-routing.md`: Opus for design, copy and review; Codex for multi-file mechanical code; `delegate` only for non-crucial public or internal text.
- Copy is in Zyade's voice: plain, direct, no hype.
- Label every claim: **VERIFIED** (you ran it and saw the output), **REPORTED** (someone or some tool said so) or **UNVERIFIED**.
- Build work lives on one branch, `claude/build`, one commit per task, no stacked task branches. Zyade merges. `main` stays untouched until he says deploy. No secrets in the repo.
- Replies: the first line is the next action. Numbered lists of at most 5 items. Include time estimates. English only.
- Working mode (from 2026-10-24): decide on your own inside CLAUDE.md, STACK and the approved docs (`COPY.md`, `PROTOTYPE.md`, `PLAN.md`). Don't ask Zyade for approvals; this replaces "Zyade approves it" in HOW WE BUILD.
- Stop and ask Zyade only for: spending money, DNS or domain changes, an account or secret he must create, deploying to production, or being blocked twice on the same thing.
- Batch those into one list per stop, with a time estimate for each item.
- Lead tests that write to Notion or send through Resend use names starting with `TEST`, and Zyade deletes those rows. Never send a test lead from the live domain.

## STACK (approved 2026-10-24)

- Astro, deployed to Cloudflare Workers with static assets, Free plan. Preview URL per branch.
- Form: a Worker endpoint writes each lead to a Notion database and sends a Resend alert.
- Booking: Cal.com Free, embedded on `/thanks`.
- Analytics: Cloudflare Web Analytics, no cookies. Lead and booking counts come from Notion statuses and Cal.com.
- No pixel and no cookie banner at launch.
- Secrets (Notion, Resend) live in Cloudflare secrets, never in the repo.

Changed on 2026-11-18 (Season One rebuild):

- The page's words live in `src/content/site.ts`. Components hold no copy. `DESIGN.md` is the design spec.
- Entry block: name and email, then the application (Tally, `APPLICATION_URL` in `src/config.ts`), which redirects to the booking page (Cal.com). There is no `/thanks` page and no embed.
- `POST /api/lead` saves each opened application to a Google Sheet through an Apps Script web app (`apps-script/README.md`), with an optional Resend alert. Notion is no longer used. Secrets: `SHEETS_URL`, `SHEETS_TOKEN`, `RESEND_API_KEY`, `ALERT_EMAIL`.
- Fonts: Geist and Geist Mono, self-hosted. No Tailwind, no framer-motion. React loads only for the feedback toolbar on preview builds.
- Visit counting: Cloudflare Web Analytics, on when `PUBLIC_CF_ANALYTICS_TOKEN` is set at build time.

Changed on 2026-11-18 (L1-P8 redesign, branch `l1-p8-redesign`):

- Look: Direction A2 with the dark pill header (`DESIGN.md`). Font: Open Runde, self-hosted. Geist is gone.
- Styles: `tokens.css`, `base.css`, `look.css`, `sections.css`. No raw colour outside `tokens.css`.
- Pages: `/`, `/sample` (the full sample script), `/booked` (the page after booking: set it as the Cal.com redirect), `/privacy`, 404.
- `/booked` with `via=chat` or `eventTypeSlug=15-minute-call-chat` in its address is a booking made from a chat: it shows a button to the 8 questions (`APPLICATION_AFTER_BOOKING_URL` and `CHAT_EVENT_SLUG` in `src/config.ts`), with the checked first name and email. Without those parameters the page is unchanged.
- "Choose your season" is CSS only. Its sprites are built by `scripts/sprites/build.mjs`. No photo is ever in the repo.
- Video slots: `FOUNDER_VIDEO` and `CONFIRMATION_VIDEO` in `src/config.ts`. Empty shows a poster.
- `CONTACT_EMAIL` is `hello@arcbuildr.co`.
- iPhone engine tests are opt-in: `npx playwright install webkit`, then `PW_WEBKIT=1 npx playwright test --project=iphone`.

Changed on 2026-11-21 (L1-P9 rebuild, branch `l1-p9-rebuild`):

- The home page is new (`DESIGN.md`, section 10): `src/layouts/Home.astro`, `src/components/home/`, `src/styles/home/`, `src/scripts/home.ts`. `/sample`, `/booked`, `/privacy` and 404 keep Direction A2. "Choose your season" is gone from the home page.
- The application is the site's own form, one question per screen, with the same 8 questions and choices as the Tally form it replaces. `APPLICATION_MODE` in `src/config.ts` is `"native"`; `"embed"` sends the two fields to `APPLICATION_URL` instead. Pages reach the form only through `startApplication()` in `src/scripts/application.ts`.
- `POST /api/apply` saves the 8 answers through the same Apps Script web app and secrets as `POST /api/lead`. What both send is in `apps-script/README.md`. The sheet's script is not in this repo.
- The answers stay on the visitor's device until the sheet says it has them. `/booked` sends them once more when a booking was made before they saved.
- Without scripts the two fields lead to the booking page with the name and email filled.
- Words: at most 25 on the first screen and 450 on load, counted by `e2e/home.spec.ts`. Script budget on the production build: 10 KB gzipped (`scripts/verify-main-build.mjs`).
- Browser tests press with `press()` from `e2e/press.ts`: a tap on phone projects, a click on desktop.

Changed on 2026-11-22 (L1-P11 page, branch `l1-p11-page`):

- The home page and `/booked` are new (`DESIGN.md`, section 11): `src/components/page/`, `src/styles/page/`, `src/scripts/page.ts`. `/sample` and `src/components/home/` are gone.
- Words: every page word comes from `~/fable-sprint/L1-P10/deck-v2.md`. `node scripts/deck/sync.mjs` copies it into `src/content/deck.json`; `--check` says whether the page is in sync. Never edit page words in the repo: change the deck, then sync. The word budgets of L1-P9 no longer apply.
- Real pieces: `node scripts/proof/import.mjs` brings L13-P1's pieces in from `~/fable-sprint/L13-P1/proof/INDEX.md` into `src/content/proof/` and `public/proof/`, both ignored by git. An empty card screen shows grey bars. The gallery section stays off the page until the first real gallery piece is in, then shows by itself; a tab with no piece is hidden. Nothing is invented.
- His face: `FOUNDER_PHOTO` in `src/config.ts`, or the imported `founder-photo` piece; his initials until then. The Claude and ChatGPT marks: `AI_MARKS` in `src/config.ts` (`"names"` removes them).
- After the form saves, the calendar opens inside the same layer (Cal.com's inline embed). A finished booking goes to `/booked` (`BOOKED_PATH`). A budget under 750 USD ends the form with the deck's lines and no calendar; the answers are saved with an `outcome` answer.
- Browser tests answer the form's requests and the calendar themselves through `e2e/stubs.ts`.

## STATUS

- Steps 1 to 6 done. `COPY.md`, `PROTOTYPE.md` and `PLAN.md` approved.
- 2026-10-26: the build moved from the cloud sandbox to a local Claude Code session in `~/arcbuildr-site`. Visual layer v2 (Direction A, `DESIGN.md`) replaced the task 3 design. All checks pass.
- Current step: 9, visual feedback through Agentation on localhost. Then deploy (step 10) only when Zyade says so.
- Waiting on Zyade: the open items list in `PLAN.md`.
- 2026-11-18: the home page was rebuilt around one offer, Season One, on branch `l1-p6-season-one`. `COPY.md`, `PROTOTYPE.md`, `PLAN.md` and `SL-P1-PLAN.md` describe the earlier site and are kept for history. `npm run check` passes (128 unit tests, 84 browser tests). Next: Zyade reviews the branch preview; production deploy only when he says so. `CONTACT_EMAIL` in `src/config.ts` is still empty.
- 2026-11-18, later: Zyade rejected that preview's look. Branch `l1-p8-redesign` rebuilds it in Direction A2: 1,100 words on the home page (2,985 before), motion, the pixel character, `/sample` and `/booked`. L1-P8b added the chat state of `/booked`. `npm run check` passes (103 unit tests; 146 browser tests, 1 skipped on desktop by design). `CONTACT_EMAIL` is set. Next: Zyade reviews the branch preview; production only when he says "ship it".
- 2026-11-21: branch `l1-p9-rebuild` replaces the home page and Tally with the site's own application (see the 2026-11-21 changes above). 442 words on load, 24 on the first screen. `npm run check` passes (173 unit tests; 156 browser tests, 2 skipped by design); the iPhone engine passes 77, 2 skipped. Lighthouse mobile on the preview: performance 92, accessibility 100. A test application from the preview reached the sheet.
- 2026-11-21, later: the sheet's script is updated (deployment "Site lead form v1", Version 3). `PUBLIC_CF_ANALYTICS_TOKEN` is a build variable of the Worker, so builds made by Cloudflare count visits. A test application from the preview landed in the "Tally application" tab with its 8 answers, and the sheet copied it to Leads as "applied"; the test rows are deleted. A push to `main` is the production deploy (Cloudflare builds `main` with `npx wrangler deploy`). Cal.com shows "Redirect on booking" as a paid Teams feature on this account, so `/booked` is not reached after a booking until Zyade picks a route: an email on booking from a Cal.com workflow, the calendar inside the site, or the paid plan. Next: Zyade reviews the preview and picks the route; production only when he says "ship it".
- 2026-11-22: branch `l1-p11-page` rebuilds the page from the deck (see the 2026-11-22 changes above): 12 sections, the 11 live screens, the gallery, the iceberg, the form with the calendar inside it, and the new `/booked`. Every real-piece slot is empty and his face is initials, because L13-P1 has delivered no piece and no photo yet. The gallery is off until a real piece exists, so 11 of the 12 sections show. `npm run check` passes (178 unit tests; 189 browser tests, 7 skipped: 4 wait for a gallery piece, 3 by design). Scripts are 8.2 KB gzipped. Next: Zyade judges the preview; production only when he says "ship it".
