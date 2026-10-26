# DESIGN.md

Direction A, "Daylight bento". Chosen by Zyade on 2026-10-26 from two directions built on real references. Replaces the task 3 design (cream paper, roman serif, sienna), which was picked with no references and read as generic.

References (mechanics only, nothing copied): `docs/references/context-con.md` (layout, bento, founder note, one action color) and `docs/references/onefactor-kallaway.md` (section order, mobile CTA, CSS-only reveal).

## Direction

- Audience: business owners who find Arcbuildr on Instagram, mostly on a phone in the in-app browser.
- Job: one action, book an intro call.
- Feel: bright, friendly, built. Light paper page, white cards, the brand orange as the one action color. The page has to look finished with no client proof yet, so the cards and the small illustrations carry it instead of photos and numbers.
- Signature: the hero shows a scattered profile behind a built one, with the five deliverable colors in its highlights and grid. Each bento card has a small CSS illustration of its deliverable.

## Tokens (`src/styles/tokens.css`)

Colors come from the earlier Arcbuildr kit (orange, sage, ink, paper, taupe), checked for contrast and given fixed jobs.

| Token | Value | Use | Contrast |
|-------|-------|-----|----------|
| `--color-accent` | `#E8722E` (brand orange) | Buttons, logo arc and "r", open FAQ icon, hero accents | White on it 3.05:1: passes only as large text, so buttons are 19 px bold |
| `--color-on-accent` | `#FFFFFF` | Button text (Zyade: white on dark buttons, dark on light ones) | |
| `--color-accent-hover` / `--color-accent-text` | `#D45E00` | Button hover (white 3.88:1), orange headline words | |
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

- **Open Runde** (rounded grotesk, OFL) is the only font, weights 400 / 600 / 700. Self-hosted from `public/fonts/`, subset to Latin with fonttools: about 22 KB per weight. License in `public/fonts/OFL-open-runde.txt`, no Reserved Font Name.
- Headline emphasis is color, not a second font (Zyade, 2026-10-26): one phrase per headline in `<span class="hl">`, colored `--color-accent-text` (`#D45E00`: 3.47:1 on the page, 3.88:1 on white, so headlines only, where large-text 3:1 applies). In section titles the phrase sits on its own line.
- Scale: display `clamp(2.5rem … 4.75rem)`, line height 0.95, tracking −0.04 em. h2 `clamp(2rem … 3.5rem)`, −0.035 em. h3 1.5 rem / 600. Body 17 px, line height 1.6. Small 14 px. Label 12 px uppercase, +0.12 em.

## Layout

- Container 72 rem, gutter `clamp(1.25rem, 5vw, 3rem)`. Hero, statement and section titles are centred. Reading blocks cap at 34 to 38 rem.
- Section order: hero, statement (#for), bento (#build), we / you cards (#roles), founder note (#us), FAQ card (#questions), form card (#start), footer panel.
- Bento: 1 column on phones; 2 + 3 columns from 48 rem (desktop 3 + 3 of a 6-column grid, first row two wide cards).
- Radii: cards 1.75 rem, inner panels concentric (1.75 − 0.75 inset = 1 rem), inputs 0.75 rem, buttons and the header as pills.

## Components

- Header: a floating dark pill, centred, sticky. Below 64rem it folds on scroll: the links and wordmark text collapse (max-width / margin / padding / opacity, 0.3s), and on phones (< 48rem) the "Book a call" button also hides at the top. When scrolled, the logo collapses to a favicon tile (arc icon in an orange rounded square, 2.75rem / 44px) and the button unfolds. At 64rem and up, the pill stays full width with all items always visible.
- Buttons: pill, brand orange, white text at 19 px / 700 (large text, so 3:1 is the bar), an arrow drawn in CSS (`content: "→" / ""`, so screen readers skip it). Hover nudges the arrow 2 px; press scales to 0.97.
- Footer: a dark rounded panel inside the container with the logo, Privacy and the copyright. No tagline, handles or email (Zyade, 2026-10-26).
- Logo: `src/components/Logo.astro`, used by the header and the footer.
- FAQ: `<details>` rows in one white card, with a round + icon that turns into × when open.
- Form: inside a white card, intro left and fields right on desktop. Inputs filled with the page color, border at 3:1 contrast, orange border and a dark-orange ring on focus.

## Motion

Added 2026-10-26 after Zyade: "we lack animations and motion, it doesn't feel like context-con". No library: CSS plus two small inline scripts in `Base.astro`.

- **Intro** (home, first visit per session, about 2 s, any tap or key skips): the brand arc draws, "arcbuild" rises letter by letter, the orange "r" lands last, then the page lifts away like a curtain and the header pill drops in. A head script sets `.intro` before first paint; reduced motion never gets it.
- **Hero entrance:** headline and lede wipe up (clip and translate), the button pops on a spring, both profile cards fly in and settle.
- **Living hero:** a story ring spins around the avatar, highlights pop in turn, tiles fill one by one, a shine crosses the grid every 5 s, the back card floats.
- **Scroll reveal:** `.reveal` fades and rises as it enters (`IntersectionObserver` adds `.is-in`), staggered with `--d` in the bento. Anything on screen at load is shown at once with no transition, so axe never sees half-transparent text. Without JS nothing is hidden (`.js` gate). No scale on reveals, so tap targets keep their 44 px.
- **Bento drawings:** the target pings, swatches rise and spread on hover, the grid's focus tile walks, the carousel fans out on hover, the chat bubbles pop in turn. Loops pause until the card is in view. Cards lift 4 px on hover.
- **Polaroids** drop and settle when the founder note arrives, and straighten on hover. **FAQ** answers open smoothly where the browser can animate to `auto` (`::details-content`, `interpolate-size`).
- Easing: `--spring` (a `linear()` spring with a small overshoot), `--ease-out`, `--ease-in-out`. Text moves by clip and translate only.
- **Header fold:** the pill closes inward on scroll below 64rem (links, wordmark, and on phones the button), folded parts hidden via visibility with delayed transitions (transition-delay) so they leave the tab order and don't fade mid-animation.
- `prefers-reduced-motion: reduce` turns off the intro, the entrances, the loops, the reveals, smooth scroll and all transitions, including the header fold.

## Not used, on purpose

- No WebGL, no live counters (no real data yet), no prices, no countdown. The intro is about 2 s and once per session, not context-con's 6 s on every visit.
- No new copy. Every word on the page is from `COPY.md`.

## Verified

See `PLAN.md`, "Visual layer v2" for the run that checked this design.
