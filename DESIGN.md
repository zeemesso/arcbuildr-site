# DESIGN.md

Direction A, "Daylight bento". Chosen by Zyade on 2026-10-26 from two directions built on real references. Replaces the task 3 design (cream paper, roman serif, sienna), which was picked with no references and read as generic.

References (mechanics only, nothing copied): `docs/references/context-con.md` (layout, bento, founder note, one action color) and `docs/references/onefactor-kallaway.md` (type pairing, section order, mobile CTA, CSS-only reveal).

## Direction

- Audience: business owners who find Arcbuildr on Instagram, mostly on a phone in the in-app browser.
- Job: one action, book an intro call.
- Feel: bright, friendly, built. Light paper page, white cards, the brand orange as the one action color. The page has to look finished with no client proof yet, so the cards and the small illustrations carry it instead of photos and numbers.
- Signature: the hero shows a scattered profile behind a built one, with the five deliverable colors in its highlights and grid. Each bento card has a small CSS illustration of its deliverable.

## Tokens (`src/styles/tokens.css`)

Colors come from the earlier Arcbuildr kit (orange, sage, ink, paper, taupe), checked for contrast and given fixed jobs.

| Token | Value | Use | Contrast |
|-------|-------|-----|----------|
| `--color-accent` | `#E8722E` (brand orange) | Buttons, logo arc and "r", open FAQ icon, hero accents | Ink text on it 5.70:1. White on it 3.05:1, so never white text |
| `--color-on-accent` | `#1A1A1A` | Button text | |
| `--color-sage` | `#597058` | The "we" card, the first deliverable | White text 5.41:1 |
| `--color-ink` | `#1A1A1A` | Text, header pill, footer panel | |
| `--color-ink-muted` | `#5F5A54` (taupe, darkened) | Body copy in cards, small print | 6.84:1 on white |
| `--color-taupe` | `#8C7B6B` | Decorative only | 4.07:1 on white, too low for body text |
| `--color-paper` | `oklch(96.2% 0.004 85)` | Page background, a shade under brand paper so white cards separate | |
| `--color-field` | `#FAFAF8` (brand paper) | Input fill | |
| `--color-card` | `#FFFFFF` | Cards | |
| `--color-focus` | `#C65100` | Focus ring | 4.08:1 on the page |
| `--hue-*` | sage, orange, ink, clay `#A34945`, taupe | One per deliverable: chip tint, illustration, hero highlights. Decorative; chip text stays ink | |

Rules:
- Orange is the one action color. It also marks the brand (arc, "r"), never body text.
- Deliverable hues appear only inside their own card and in the hero visual.
- Tints use `color-mix(in oklab, …)`. OKLCH mixing with white drifts toward pink, because white has hue 0.

## Logo

- The brand arc (`arcbuildr-symbol.svg`: a thick half circle with round caps) inline as SVG in the header, then "arcbuild" with an orange "r", set live in Open Runde 700 so it renders the same on every device. The old SVG files set the text in system fonts, which differ by device.
- The favicon is the brand favicon (orange rounded square, white arc).

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

- Header: a floating dark pill, centred, sticky. The logo, then "Book a call". On phones (< 48 rem) that same link becomes a floating pill at the bottom of the screen. It hides while the hero button or the form is on screen (`IntersectionObserver` in `Base.astro`). There is only one "Book a call" link in the page.
- Buttons: pill, brand orange with ink text, an arrow drawn in CSS (`content: "→" / ""`, so screen readers skip it). Hover nudges the arrow 2 px; press scales to 0.97.
- Footer: a dark rounded panel inside the container.
- FAQ: `<details>` rows in one white card, with a round + icon that turns into × when open.
- Form: inside a white card, intro left and fields right on desktop. Inputs filled with the page color, border at 3:1 contrast, orange border and a dark-orange ring on focus.

## Motion

- Scroll reveal is CSS only (`animation-timeline: view()`) and moves cards by transform, never opacity, so text never drops below its contrast. Browsers without support show everything at rest.
- Transitions are 150 ms, ease `0.2, 0.6, 0.2, 1`, and name their properties. No `transition: all`.
- `prefers-reduced-motion: reduce` turns off the reveal, smooth scroll and all transitions.

## Not used, on purpose

- No intro splash, no WebGL, no live counters (no real data yet), no prices, no countdown.
- No new copy. Every word on the page is from `COPY.md`.

## Verified

See `PLAN.md`, "Visual layer v2" for the run that checked this design.
