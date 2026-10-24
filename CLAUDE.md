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
9. **Visual feedback.** A Vercel preview per branch, with the Agentation toolbar enabled on previews only. Zyade pastes its annotations into the chat.
10. **Deploy** only when Zyade says so.
11. **Iterate** from real use.

## RULES

- Planning is 80% of the work. No code before step 6 (Plan) is approved.
- Design references arrive as screenshots, not URLs.
- Skills arrive in `.claude/skills` from Zyade's Mac. Pull only when told. Pick the right skill yourself; Zyade does not type slash commands.
- Copy is in Zyade's voice: plain, direct, no hype.
- Label every claim: **VERIFIED** (you ran it and saw the output), **REPORTED** (someone or some tool said so) or **UNVERIFIED**.
- One branch per task. Zyade merges. No secrets in the repo.
- Replies: the first line is the next action. Numbered lists of at most 5 items. Include time estimates. English only.

## STATUS

- Step 1 (Context): done from the brief. See `.agents/product-marketing.md`.
- Current step: 2 (Copy). Draft in `COPY.md`, waiting for Zyade's review.
