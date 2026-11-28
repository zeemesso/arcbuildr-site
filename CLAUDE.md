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

## ONE LOOK

- Every page tied to arcbuildr.co has the home page's design (L1-P11): every page of this site and every visitor page of go.arcbuildr.co (MagnetRail, `~/magnetrail`). `DESIGN.md` section 17 says how.
- A design or layout change goes into the shared files only: `src/styles/tokens.css`, `src/styles/page/`, `Bar.astro`, `Foot.astro`, `Logo.astro`, `src/components/application/application.css`. From there it reaches every page.
- A new page uses `Base.astro` (or `Home.astro`) and the `.prose` classes: never its own header, footer, fonts or colours. `npm run check` fails otherwise.
- After a design change reaches `main`, run `cd ~/magnetrail && npm run deploy`. go.arcbuildr.co does not build while its copy of the design is behind `main`.
- The RULES above apply to MagnetRail's visitor pages too.
- The control room and ReplyRail's dashboard are internal tools with their own look.
- A new design session starts from the newest `main`. `l1-p11-page` is behind it.

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
- A page's own script tag comes before the visit counter's tag, so the counter's server can never hold the page's script up.

Changed on 2026-11-22, later (L1-P11 redesign, branch `l1-p11-page`):

- Look: the quiet folio (`DESIGN.md`, section 12). One sheet of paper, a small type scale, long air, few surfaces. Its styles are in `src/styles/page/folio.css`, loaded last.
- The first screen leads with the sales video: `VSL_VIDEO` in `src/config.ts`. Empty shows the poster with a drawn play mark.
- Three wins follow the first screen: the deck's `win 1` to `win 3` in section 1, grey bars until the deck has them.
- The iceberg is one drawing in `src/components/page/Berg.astro`. Its sky, water and ice colours are in `tokens.css`.
- The offer shows the deck's stack as a ledger (a row with a figure alone), a product card (a row with a sentence and a figure) and a bonus stack (a row with no figure).
- `AI_MARKS` is `"names"`: no company's mark is on the page.
- The form never leaves anyone stuck. When saving fails, the plain form (name, email, one button) takes the questions' place and saves through `POST /api/apply` with `plain: true`. When the form's script throws, never arrives or is off, the browser posts the form itself to the same endpoint: the Worker saves a marked row in Leads and sends the person on to the booking page. The failure paths are in `e2e/fallback.spec.ts`.
- Two more opt-in browser projects: `PW_WEBKIT=1 npx playwright test --project=safari` and `PW_CHROME=1 npx playwright test --project=chrome` (the Chrome installed on this Mac).

Changed on 2026-11-22, last (L1-P11 Part 2, deck-v3, branch `l1-p11-page`):

- Words: every page word now comes from `~/fable-sprint/L1-P12/deck-v3.md` (never `deck-v3-writer.md`). `node scripts/deck/sync.mjs` and `--check` work as before. Sections are read by number (`section(1)` to `section(12)`) or by name: `"names"`, `"the apply window"`, `"the form"`, `"the booked page"`, `"title and description"`. `{product}` in a line is filled from the `product name` slot.
- The page has 13 sections (`DESIGN.md`, section 13): first screen, problem, beliefs, framework, what you get, who directs it, the work, the 12 weeks, the offer, guarantee, fit, questions, apply.
- The drawn live screens are gone (`src/components/page/screens/`). A picture panel exists only with a real picture in it: a card without one is words under a hairline, and section 6 without his photo shows his initials as a small mark by the heading. `scripts/proof/import.mjs` takes only a picture for a card.
- The work (section 7) shows once its twelve gallery pieces are real; `item 2` of section 6 and `free 3` of section 8 wait with it.
- Removed: `AI_MARKS`, the two mark files and `FOUNDER_VIDEO`. No company's mark can be on the page.
- While `VSL_VIDEO` is empty the poster has no play mark; the deck's placeholder line sits under the frame.
- `e2e/words.spec.ts` fails on the words the positioning dropped (script, AI, kit, ghostwrite, writers' room, "in your voice", long dashes; "We don't chase viral." is the one allowed "viral").

Changed on 2026-11-23 (L1-P11 fu-2, deck-v4, branch `l1-p11-page`):

- Words: every page word now comes from `~/fable-sprint/L1-P12/deck-v4.md` (never `deck-v4-writer.md`). Sections are read by number (`section(1)` to `section(11)`) or by name: `"names"`, `"the apply window"`, `"the form, on tally"`, `"the booked page"`, `"title and description"`. `{product}`, `{p12}`, `{p24}` and `{p36}` in a line are filled from the names block (`PRODUCT`, `PACKAGES` in `src/content/deck.ts`).
- The page has 12 sections (`DESIGN.md`, section 14): first screen, problem, beliefs, how it works, what you get, the work, under the water, the packages, guarantee, fit, questions, apply. "Who directs it" is gone. Three packages (12, 24 and 36 pieces), no "Season", no dates.
- Nothing reads unfinished: a block shows only once its real thing exists. The video block shows only when `VSL_VIDEO` is set; `/?vsl=demo` on a preview build shows it with a test film. The film starts without sound, with one button to turn the sound on.
- The header's button is always in the header, at every width and scroll position.
- The seven cards have their moving drawn screens again (`src/components/page/screens/`), with the deck's labels inside. The product card has one more, the sample (`Sample.astro`).
- The packages (`Packages.astro`): three cards, the middle one marked; three tabs on a phone, made of radio buttons. A package has no name: its title is its size ("24 pieces"), with its length as the small label above. A card's button passes that size to the form (`data-package`), and `/booked` says it.
- The form is on Tally again: `TALLY_FORM` in `src/config.ts`, opened in Tally's popup by `startApplication()`. On submit the site saves through `POST /api/apply`, then shows the calendar inside its own layer, or the under-750 lines. `APPLICATION_MODE` and the coded questions (`src/scripts/apply.ts`) are removed. The Tally form itself is edited outside this repo; what the site needs from it is in `~/fable-sprint/L1-P11/TALLY-SITE.md`. A full-page Tally form comes back through `/?apply=calendar&name=&email=` or `/?apply=end&name=`.
- His photo is the first picture in `~/fable-sprint/L1-P11/photo/`, and his audit's picture the first in `~/fable-sprint/L1-P11/audit/`; `node scripts/proof/import.mjs` brings both in (ignored by git).
- `e2e/words.spec.ts` now also fails on "Season", on a date (day N, week N), on "Watch this first" with no film, and on the three package names dropped on 23 Nov (Clarity, Recognition, Momentum).
- No raw colour outside `tokens.css` still holds; ChatGPT and Claude are named in words only.

Changed on 2026-11-23, later (L1-P11 fu-4, VERDICT-6, branch `l1-p11-page`):

- Look: the tight page (`DESIGN.md`, section 15). Its styles are in `src/styles/page/tight.css`, loaded last. The headline is display size; a section heading stops at 30 px; the space between sections is 60% of what it was.
- The first screen has two buttons: the apply button and a grey pill with the Claude and ChatGPT marks that leads to What you get. Behind the words a trail of soft square pixels follows the pointer (`src/scripts/page.ts`, `[data-trail]`); it drifts by itself on a touch screen and stands still with reduced motion.
- The video frame always shows. With `VSL_VIDEO` empty it is a poster and a play mark, with no words. This replaces "the video block shows only when `VSL_VIDEO` is set".
- The Claude and ChatGPT marks are back by Zyade's decision of 23 Nov (`public/marks/`, `Marks.astro`), in two places only: the first screen's pill and beside Say It Plain's small line. This replaces "ChatGPT and Claude are named in words only".
- The page has 13 sections: Say It Plain is its own section (`Tools.astro`, `id="tools"`, the deck's `section("5b. say it plain")`) right after What you get: five tools in a grid, each with a moving sample screen (`screens/Tool.astro`). The words inside the sample screens are in `src/content/samples.ts`; they are not deck slots.
- The packages have names again: `PACKAGES` is Personal Brand Accelerator, Season One, Season One Extended. A card's title is the name, the small label is "8 weeks, 24 videos", a phone tab reads the length alone, and `data-package` carries the name. The product card, the hired-out stack and the count of founding places are removed (`Product.astro`, `screens/Sample.astro`, `founding()`, `FOUNDING_PLACES_LEFT`).
- `e2e/words.spec.ts`: "script" and "AI" pass inside `#tools` only; "Season" is no longer banned; a count of places ("3 of 3") is. The date patterns and Clarity, Recognition, Momentum stay banned.

Changed on 2026-11-23, last (L1-P11 fu-5, VERDICT-7, branch `l1-p11-page`):

- The page's last round (`DESIGN.md`, section 16). 13 sections: first screen, problem, beliefs, how it works, what you get, the work, the packages, Say It Plain, the bonuses, guarantee, fit, questions, apply.
- The header has no section links: the logo and the Apply button only.
- Under the water is removed: `Berg.astro`, `#water`, its colours in `tokens.css` and its script. The deck has no section 7.
- The packages are Pilot, Season One and Full Season (`PACKAGES`); the badge reads "Recommended". Nothing stands under the three cards.
- Say It Plain is short and sits right under the cards (`Plain.astro`, `id="say-it-plain"`, the deck's `section("8b. say it plain")`): three steps beside one moving sample (`screens/Sample.astro`, words in `src/content/samples.ts`), "What's inside" as one list of five, the two marks beside the small line, the credit line. `Tools.astro` and `screens/Tool.astro` are removed (in git history at `6882097`).
- The bonuses are their own block (`Bonuses.astro`, `id="bonuses"`): four white cards with a pastel square holding the arc mark, each "Included", no dollar value. Section 8's apply strip closes it.
- `e2e/words.spec.ts`: "script" passes inside `#say-it-plain` only; "AI" is banned everywhere; "Most Popular" must not be on the page.

## STATUS

- Steps 1 to 6 done. `COPY.md`, `PROTOTYPE.md` and `PLAN.md` approved.
- 2026-10-26: the build moved from the cloud sandbox to a local Claude Code session in `~/arcbuildr-site`. Visual layer v2 (Direction A, `DESIGN.md`) replaced the task 3 design. All checks pass.
- Current step: 9, visual feedback through Agentation on localhost. Then deploy (step 10) only when Zyade says so.
- Waiting on Zyade: the open items list in `PLAN.md`.
- 2026-11-18: the home page was rebuilt around one offer, Season One, on branch `l1-p6-season-one`. `COPY.md`, `PROTOTYPE.md`, `PLAN.md` and `SL-P1-PLAN.md` describe the earlier site and are kept for history. `npm run check` passes (128 unit tests, 84 browser tests). Next: Zyade reviews the branch preview; production deploy only when he says so. `CONTACT_EMAIL` in `src/config.ts` is still empty.
- 2026-11-18, later: Zyade rejected that preview's look. Branch `l1-p8-redesign` rebuilds it in Direction A2: 1,100 words on the home page (2,985 before), motion, the pixel character, `/sample` and `/booked`. L1-P8b added the chat state of `/booked`. `npm run check` passes (103 unit tests; 146 browser tests, 1 skipped on desktop by design). `CONTACT_EMAIL` is set. Next: Zyade reviews the branch preview; production only when he says "ship it".
- 2026-11-21: branch `l1-p9-rebuild` replaces the home page and Tally with the site's own application (see the 2026-11-21 changes above). 442 words on load, 24 on the first screen. `npm run check` passes (173 unit tests; 156 browser tests, 2 skipped by design); the iPhone engine passes 77, 2 skipped. Lighthouse mobile on the preview: performance 92, accessibility 100. A test application from the preview reached the sheet.
- 2026-11-21, later: the sheet's script is updated (deployment "Site lead form v1", Version 3). `PUBLIC_CF_ANALYTICS_TOKEN` is a build variable of the Worker, so builds made by Cloudflare count visits. A test application from the preview landed in the "Tally application" tab with its 8 answers, and the sheet copied it to Leads as "applied"; the test rows are deleted. A push to `main` is the production deploy (Cloudflare builds `main` with `npx wrangler deploy`). Cal.com shows "Redirect on booking" as a paid Teams feature on this account, so `/booked` is not reached after a booking until Zyade picks a route: an email on booking from a Cal.com workflow, the calendar inside the site, or the paid plan. Next: Zyade reviews the preview and picks the route; production only when he says "ship it".
- 2026-11-22: branch `l1-p11-page` rebuilds the page from the deck (see the 2026-11-22 changes above): 12 sections, the 11 live screens, the gallery, the iceberg, the form with the calendar inside it, and the new `/booked`. Every real-piece slot is empty and his face is initials, because L13-P1 has delivered no piece and no photo yet. The gallery is off until a real piece exists, so 11 of the 12 sections show. `npm run check` passes (178 unit tests; 193 browser tests, 7 skipped: 4 wait for a gallery piece, 3 by design); the iPhone engine passes 95, 5 skipped. On the preview, a TEST application reached the sheet with the new budget choices and an "Outcome" column, and a TEST booking made inside the form landed on `/booked` and was cancelled. Scripts are 8.2 KB gzipped. Next: Zyade judges the preview; production only when he says "ship it".
- 2026-11-22, later: Zyade rejected that page. The redesign (the quiet folio) and deck-v3 rebuilt it on the same branch: 13 sections, the sales video slot, a drawn iceberg, the framework chain, the ledger with the bonus stack and the product card, and a form that falls back to a plain form. Section 7 is off until its twelve real pieces exist, so 12 of the 13 sections show. No picture panel shows empty: the seven cards and section 6 are words until their pictures exist. `npm run check` passes (211 unit tests; 240 browser tests, 6 skipped: 4 wait for the gallery, 2 by design); Safari's engine and the iPhone engine pass 238, 8 skipped; Chrome passes 119, 4 skipped. Scripts are 8.1 KB gzipped. Next: Zyade judges the preview; production only when he says "ship it".
- 2026-11-23: Zyade compared every past version and asked for the best of them (L1-P11 fu-2). Same branch, deck-v4 (VERDICT-D4 GO): 12 sections, three packages in place of Season One, How it works in place of the framework, the seven moving screens back with the deck's labels, the Say It Plain card with its flow picture and sample, and the form back on Tally with the calendar inside the site. Section 6 (the work) is off until its twelve real pieces exist, so 11 of the 12 sections show. His photo, his audit's picture and the film are not in yet, and nothing stands in for them. After VERDICT-5 the packages have no names: each is called by its size. `npm run check`'s parts pass (214 unit tests; 310 browser tests, 6 skipped: 4 wait for the gallery, 2 by design); Safari's engine and the iPhone engine pass 309, 7 skipped; Chrome passes 155, 3 skipped. Scripts are 6.7 KB gzipped. The Tally form's new questions are an unpublished draft, so the real popup still shows the old ones. Next: Zyade judges the preview; production only when he says "ship it".
- 2026-11-23, later: Zyade rejected that preview as "too fat, spaced out and random" (VERDICT-6). Same branch: the first screen at display size with the trail, the pill with the two marks and the video frame; Say It Plain as its own section of five tools with sample screens; named packages with no stack and no count of places; a tighter page. The home page at 1440 is 12,220 px tall (15,305 before): 20% shorter, with a video frame and a section it did not have. 12 of the 13 sections show (the work waits for its twelve real pieces). The checks pass (214 unit tests; 328 browser tests, 6 skipped; Safari's engine and the iPhone engine 327, 7 skipped; Chrome 164, 3 skipped). Scripts are 7.2 KB gzipped. Next: Zyade judges the preview; production only when he says "ship it".
- 2026-11-23, last: Zyade's final changes (VERDICT-7), the page's last round. Same branch: no section links in the header; Pilot, Season One and Full Season with a "Recommended" badge and nothing under the cards; Say It Plain short and right under the cards (three steps, one moving sample, five things inside); the bonuses as their own block of four white cards, each "Included"; Under the water removed. The home page at 1440 is 10,690 px tall (12,220 before). 12 of the 13 sections show (the work waits for its twelve real pieces). The checks pass (214 unit tests; 320 browser tests, 6 skipped; Safari's engine and the iPhone engine 319, 7 skipped; Chrome 160, 3 skipped). Scripts are 7.0 KB gzipped. Under heavy parallel load one Safari test can fail: the 3-second "script is late" rule in `Head.astro` drops the `js` class when WebKit holds back its frames; it passes alone. Next: Zyade judges the preview; production only when he says "ship it".
- 2026-11-28: one design for every page (`DESIGN.md` section 17, ONE LOOK above). Privacy, the 404 page, the free-resource pages, the plan page and unsubscribe now have the home page's header, footer, styles and type; the Direction A2 files are deleted. `npm run check` passes (438 unit tests; 340 browser tests, 6 skipped). go.arcbuildr.co takes the same design with `npm run deploy` in `~/magnetrail`.
