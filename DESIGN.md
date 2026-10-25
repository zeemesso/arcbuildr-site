# DESIGN.md

Direction A, "Daylight bento". Chosen by Zyade on 2026-10-26 from two directions built on real references. Replaces the task 3 design (cream paper, roman serif, sienna), which was picked with no references and read as generic.

References (mechanics only, nothing copied): `docs/references/context-con.md` (layout, bento, founder note, one action color) and `docs/references/onefactor-kallaway.md` (type pairing, section order, mobile CTA, CSS-only reveal).

## Direction

- Audience: business owners who find Arcbuildr on Instagram, mostly on a phone in the in-app browser.
- Job: one action, book an intro call.
- Feel: bright, friendly, built. Cool light page, white cards, one strong action color. The page has to look finished with no client proof yet, so the cards and the small illustrations carry it instead of photos and numbers.
- Signature: the hero shows a scattered profile behind a built one, with the five deliverable colors in its highlights and grid. Each bento card has a small CSS illustration of its deliverable. The wordmark has an arc mark (three quarters of a ring) in the action color.

## Tokens (`src/styles/tokens.css`, OKLCH)

| Token | Value | Use |
|-------|-------|-----|
| `--color-paper` | `oklch(97.2% 0.004 270)` | Page background, input fill |
| `--color-paper-2` | `oklch(94.5% 0.006 270)` | Quiet fills, placeholders |
| `--color-card` | `oklch(100% 0 0)` | Cards |
| `--color-ink` | `oklch(19% 0.015 275)` | Text, header pill, footer panel, "we" card |
| `--color-ink-muted` | `oklch(45% 0.015 275)` | Body copy in cards, small print |
| `--color-rule` | `oklch(91% 0.006 270)` | Card borders, FAQ hairlines |
| `--color-accent` | `oklch(50% 0.25 278)` | Electric violet, the "arc". Buttons, arc mark, focus ring |
| `--hue-strategy` … `--hue-support` | L 50 to 52 %, five hues | One per deliverable: number chip, illustration, hero highlights |
| `--color-error` | `oklch(48% 0.19 25)` | Form errors |

Rules:
- The accent appears on buttons, the arc mark, focus and the open FAQ icon only.
- Deliverable hues appear only inside their own card and in the hero visual.
- Tints use `color-mix(in oklab, …)`. OKLCH mixing with white drifts toward pink, because white has hue 0.

## Type

- **Open Runde** (rounded grotesk, OFL) for everything, weights 400 / 600 / 700. Self-hosted from `public/fonts/`, subset to Latin with fonttools: about 22 KB per weight.
- **Instrument Serif Italic** (OFL) for one phrase per headline, wrapped in `<span class="serif">`, at 1.12 em so its x-height matches. In section titles the serif phrase sits on its own line.
- Scale: display `clamp(2.5rem … 4.75rem)`, line height 0.95, tracking −0.04 em. h2 `clamp(2rem … 3.5rem)`, −0.035 em. h3 1.5 rem / 600. Body 17 px, line height 1.6. Small 14 px. Label 12 px uppercase, +0.12 em.
- License files ship next to the fonts (`public/fonts/OFL-*.txt`). Neither font has a Reserved Font Name.

## Layout

- Container 72 rem, gutter `clamp(1.25rem, 5vw, 3rem)`. Hero, statement and section titles are centred. Reading blocks cap at 34 to 38 rem.
- Section order: hero, statement (#for), bento (#build), we / you cards (#roles), founder note (#us), FAQ card (#questions), form card (#start), footer panel.
- Bento: 1 column on phones; 2 + 3 columns from 48 rem (desktop 3 + 3 of a 6-column grid, first row two wide cards).
- Radii: cards 1.75 rem, inner panels concentric (1.75 − 0.75 inset = 1 rem), inputs 0.75 rem, buttons and the header as pills.

## Components

- Header: a floating dark pill, centred, sticky. Wordmark with the arc mark, then "Book a call". On phones (< 48 rem) that same link becomes a floating pill at the bottom of the screen. It hides while the hero button or the form is on screen (`IntersectionObserver` in `Base.astro`). There is only one "Book a call" link in the page.
- Buttons: pill, the accent color, an arrow drawn in CSS (`content: "→" / ""`, so screen readers skip it). Hover nudges the arrow 2 px; press scales to 0.97.
- Footer: a dark rounded panel inside the container.
- FAQ: `<details>` rows in one white card, with a round + icon that turns into × when open.
- Form: inside a white card, intro left and fields right on desktop. Inputs filled with the page color, border at 3:1 contrast, violet border and ring on focus.

## Motion

- Scroll reveal is CSS only (`animation-timeline: view()`) and moves cards by transform, never opacity, so text never drops below its contrast. Browsers without support show everything at rest.
- Transitions are 150 ms, ease `0.2, 0.6, 0.2, 1`, and name their properties. No `transition: all`.
- `prefers-reduced-motion: reduce` turns off the reveal, smooth scroll and all transitions.

## Not used, on purpose

- No intro splash, no WebGL, no live counters (no real data yet), no prices, no countdown.
- No new copy. Every word on the page is from `COPY.md`.

## Verified

See `PLAN.md`, "Visual layer v2" for the run that checked this design.
