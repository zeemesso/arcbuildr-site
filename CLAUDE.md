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

## STATUS

- Steps 1 to 6 done. `COPY.md`, `PROTOTYPE.md` and `PLAN.md` approved.
- 2026-10-26: the build moved from the cloud sandbox to a local Claude Code session in `~/arcbuildr-site`. Visual layer v2 (Direction A, `DESIGN.md`) replaced the task 3 design. All checks pass.
- Current step: 9, visual feedback through Agentation on localhost. Then deploy (step 10) only when Zyade says so.
- Waiting on Zyade: the open items list in `PLAN.md`.
