# DESIGN.md

Direction B, "Plan on a desk". Decided at Gate 2, 18 Nov 2026. It replaces Direction A ("Daylight bento", in git history at `4bb7d88`).

The page has one job: the visitor starts the application. First impression: technical, modern, leading. Every line is understood in one read.

All words live in `src/content/site.ts`. Components read from it and hold no copy of their own.

## 1. Principles

1. One action, one label, one colour. The orange is used for "Start your application", for the moving figure in the season animation and for the arc in the logo. Nothing else on the page is orange.
2. Paper, ink, thin rules. The page reads like a specification sheet: labels in a monospace face, tables, numbered rows. No cards with illustrations, no gradients, no shadows except one hard offset on the sample document.
3. Calm. One animation (the season map). No scroll reveals, no intro, nothing that loops. Text is never hidden waiting for JavaScript.
4. Phone first. The first screen at 375 x 667 holds the small line, the headline, the line under it, both fields and the button.
5. Square. Radius 3px on buttons and inputs, 0 elsewhere. The season map is pixel art, so the page keeps hard edges.

## 2. Tokens (`src/styles/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#FAFAF8` | Page |
| `--color-sheet` | `#FFFFFF` | Inputs, the sample document |
| `--color-ink` | `#1A1A1A` | Text, filled tiles, the closing panel |
| `--color-ink-muted` | `#5F5A54` | Secondary text. 6.5:1 on paper |
| `--color-rule` | `rgb(26 26 26 / 0.14)` | Thin rules between sections and rows |
| `--color-rule-strong` | `rgb(26 26 26 / 0.55)` | Input borders, empty tile outlines. At least 3:1 on paper |
| `--color-accent` | `#E8722E` | The action button, the figure. Ink on it is 5.7:1 |
| `--color-accent-hover` | `#F08A4B` | Button hover. Lighter, so ink text keeps its contrast |
| `--color-on-accent` | `#1A1A1A` | Button label. Never white: white on this orange is 3.05:1 |
| `--color-error` | `#B3261E` | Field errors. 6.5:1 on paper |
| `--color-focus` | `#1A1A1A` | Focus ring: 2px solid, 2px offset. On the ink panel the ring is paper |

Removed: sage, taupe, clay, the deliverable hues, orange headline words, card and lift shadows, the spring easing, pill radii.

Spacing scale stays (`--space-2xs` to `--space-3xl`). `--page-max: 72rem`. `--gutter: clamp(1.25rem, 5vw, 3rem)`. `--tap: 2.75rem`.

## 3. Type

Two files, both self-hosted, both OFL 1.1 (licences in `public/fonts/`):

- **Geist** (`/fonts/geist-latin-wght.woff2`, variable 100 to 900, 29 KB) for all text. Weights used: 400 and 600.
- **Geist Mono** (`/fonts/geist-mono-latin-wght.woff2`, variable, 23 KB) for codes: kickers, days, index numbers, source lines, table heads.

`font-display: swap`. Preload Geist only. Fallback stacks: `system-ui, -apple-system, "Segoe UI", sans-serif` and `ui-monospace, "SF Mono", Menlo, monospace`.

Open Runde is removed from the page: delete its three font files and its licence file. The logo is drawn from strokes (`Logo.astro`) and stays as it is.

The fonts' Latin subset has no right arrow glyph. Draw arrows as inline SVG. `↓` (U+2193) and `·` are in the subset.

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| h1 | `clamp(2.5rem, 1.6rem + 3.8vw, 4rem)` | 600 | 1.0 | -0.035em |
| h2 | `clamp(1.75rem, 1.3rem + 1.9vw, 2.75rem)` | 600 | 1.08 | -0.025em |
| h3 | 1.1875rem | 600 | 1.3 | -0.01em |
| Lede | `clamp(1.0625rem, 1rem + 0.4vw, 1.25rem)` | 400 | 1.5 | 0 |
| Body | 1.0625rem (17px) | 400 | 1.55 | 0 |
| Small | 0.875rem | 400 | 1.45 | 0 |
| Kicker and codes (mono) | 0.75rem, uppercase | 500 | 1.4 | 0.06em |
| Mono inline (days, table codes) | 0.8125rem | 500 | 1.4 | 0.02em |

Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. Reading blocks cap at 38rem. Numbers in tables use `font-variant-numeric: tabular-nums`.

## 4. Layout

- Container 72rem with the gutter. A 12-column grid from 64rem. One column below it.
- Every section: top rule 1px `--color-rule`, `padding-block: clamp(3.5rem, 8vw, 6.5rem)`, then a mono kicker, then the h2.
- Two section shapes from 64rem:
  - **split**: kicker and h2 in columns 1 to 5, content in columns 7 to 12.
  - **stack**: kicker and h2 on top (h2 max 22ch wide), content below at full width.
- In split sections, from 64rem and when the viewport is at least 44rem tall, the heading block is `position: sticky; top: calc(56px + 2rem)` inside its own grid cell, so the section's question stays in view while its content scrolls.
- No horizontal scroll from 320px to 1440px.

| # | Section | id | Shape | Content |
|---|---|---|---|---|
| 00 | Header | | | Logo left, compact action button right. Sticky from 64rem only. On the home page the action is hidden while the top entry button is on screen (see Header) |
| 01 | First screen | `top` | hero | Text and entry block in columns 1 to 5, season map in columns 6 to 12, centred vertically against the text. On phones the map sits under the entry block |
| 02 | Before you pay | `before` | stack | Three columns, each: mono label, bold title, body. One column on phones |
| 03 | The problem | `problem` | split | Left: h2 and the "12 posts vs one season" picture. Right: four quotes, the cause line, the three undecided things as numbered rows, the closing line |
| 04 | The evidence | `evidence` | split | Right: intro, four findings as rows (claim, detail, the `whyLabel` kicker on its own line above the `why` sentence, mono source), the limit block with a 2px ink left rule, the role line |
| 05 | The method | `method` | stack | Three numbered rows. Each row from 64rem: index, plain name (the only `<h3>`), the `getLabel` kicker above the document name and body, the `fixesLabel` kicker above one or two quotes. The first baselines of the three text columns line up. Under 64rem they stack in that order. Then the "Why this order?" block |
| 06 | A sample | `sample` | stack | Intro. Then the script document in columns 1 to 8 and the "place in the season" panel in columns 9 to 12. Then the after line, the action button and its note |
| 07 | Why not just AI | `ai` | split | Right: intro, four numbered points in a 2 x 2 grid (one column on phones) |
| 08 | The offer | `offer` | stack | Intro, sizes table, note, timeline table, "Your part" and "Not included" side by side, price line with its link, action button, founding line |
| 09 | The guarantee | `guarantee` | split | Right: body, three label rows, the "do not guarantee" block |
| 10 | Who it is for | `fit` | stack | Two columns: "For you if" with pixel ticks, "Not for you if" with pixel crosses, in muted text |
| 11 | Who you work with | `founder` | split | Right: two paragraphs. No photo |
| 12 | Questions | `questions` | split | Right: `<details>` rows, the first open. Each row has the `id` from the content file |
| 13 | Apply | `apply` | panel | Full-width ink panel, paper text. h2, body, entry block (max 28rem), notes, founding line |
| | Footer | | | Logo, Privacy link, rights line. On paper, under the panel |

## 5. Components

### Action button
- Orange fill, ink label, 600, 17px. Height 52px (40px in the header). Radius 3px. Padding inline 1.5rem.
- A 16px ink arrow after the label, inline SVG, `aria-hidden`.
- Hover `--color-accent-hover`. Active: `translate: 0 1px`. Focus-visible: the ring.
- Full width inside entry blocks and on phones. Auto width elsewhere from 64rem.
- The label is always `action` from the content file.

### Entry block (`EntryBlock.astro`, used twice: `id="top"` and `id="bottom"`)
- A real form: `method="get"`, `action={APPLICATION_URL}`. Exactly two named controls, `name` and `email`, so the browser opens `https://tally.so/r/M1aKGp?name=…&email=…` with nothing else in the URL. Same tab.
- Labels above the fields, always visible. Inputs 48px high, 16px text, sheet fill, 1px `--color-rule-strong` border, radius 3px.
- `name`: `type="text"`, `autocomplete="name"`, `autocapitalize="words"`, `enterkeyhint="next"`, `required`, `maxlength="200"`.
- `email`: `type="email"`, `autocomplete="email"`, `inputmode="email"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="go"`, `required`, `maxlength="320"`.
- Without JavaScript: native validation, then the browser goes to the application.
- With JavaScript (the form gets `novalidate`): on submit, trim both values and check them (name not empty; email matches `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`). On error: show the message under the field (`aria-describedby`, `aria-invalid`), focus the first bad field, stop. An error clears when the field is edited. On success: put the trimmed values back in the fields, swap the button label for `entry.opening` (announced with `aria-live="polite"`), block a second submit, send the entry beacon, and let the native submit go ahead. Restore the button on `pageshow` so the Back button gives a working form.
- Entry beacon: `navigator.sendBeacon("/api/lead", body)` where body is a `URLSearchParams` with `name`, `email`, `src` (from `?src=` on the page URL, else `direct`), `tz` (`Intl.DateTimeFormat().resolvedOptions().timeZone`), `page` (`location.pathname`), `utm` (every `utm_*` parameter of the page URL as a query string), `sent_at` (ISO time). Fire and forget: the visitor's path never waits for it or depends on it.
- On the ink panel: labels and notes in paper, inputs keep the sheet fill, the ring is paper.

### Header
- 56px high on phones, 64px from 64rem. Paper background, 1px bottom rule. Logo left. Action button right, 40px high, 15px label, no arrow under 26rem.
- Sticky from 64rem only. On phones it scrolls away and the bottom bar takes over.
- One orange button on the first screen. On pages with the top entry block (`body:has(#top-entry)`): under 64rem the header action is `display: none`. From 64rem it keeps its place but is `visibility: hidden` (not focusable) while any part of the top entry button is on screen, and fades in over 150ms once that button has scrolled out (`src/scripts/actions.ts` sets a data attribute on `.site-header`; no transition under reduced motion). Without JavaScript it is always visible from 64rem. On `/privacy` and the 404 page it is always visible.
- The header button, the bottom bar button and every in-page action button are links to `#apply` with `data-apply`. Without JavaScript they jump to the closing panel. With JavaScript: if any part of the top entry block is on screen, focus its "Your name" field. Otherwise scroll the bottom entry block to the middle of the screen and focus its "Your name" field (`focus({ preventScroll: true })`, then `scrollIntoView`). Smooth scroll unless reduced motion.
- A skip link to `#main` is the first focusable element.

### Bottom bar (phones only, under 64rem)
- Fixed to the bottom, paper background, 1px top rule, padding 0.75rem plus `env(safe-area-inset-bottom)`. One full-width action button.
- Hidden at load. Shown when the top entry block's button has left the screen and neither entry block is on screen (`IntersectionObserver`). It moves with `translate` only.
- `main` gets bottom padding equal to the bar's height on phones, so the bar never covers the footer.
- Without JavaScript it stays hidden.

### Season map (`SeasonMap.astro`)
Built separately, see section 10. Interface:
- `<SeasonMap variant="hero" />`: the animated map.
- `<SeasonMap variant="mini" mark={1} />`: a small static map, tiles in outline, the marked tile filled ink. Used in the sample section.
The component owns its own styles and script and takes all words from `seasonMap` in the content file.

### Posts vs season picture (`PostsVsSeason.astro`)
- Two 4 x 3 grids of square tiles, inline SVG, `shape-rendering="crispEdges"`, `role="img"` with `problem.picture.alt`.
- Left: 12 tiles, each with a different simple pixel pattern (stripes, dots, checker, diagonal, a block, blank, and so on), ink at mixed opacities, slightly uneven spacing so it looks unplanned.
- Right: 12 even tiles, ink fill, paper mono numbers 01 to 12.
- Under each grid: the mono code and the line from the content file.
- Static. Ink only, no orange.

### Tables and rows
- Sizes table: a real `<table>` from 40rem, with the head from the content file. The recommended row has a 2px ink left rule, 600 weight and the tag (mono, ink outline box) after the size. Under 40rem each size is a stacked block.
- Timeline: a definition-style grid. The "when" column is mono, 6.5rem wide, ink. Rows split by thin rules.
- Label rows (guarantee): mono label column 9rem, text right. Stacked under 40rem.

### Sample document (`SampleScript.astro`)
- A sheet: `--color-sheet`, 1px solid ink border, no radius, `box-shadow: 6px 6px 0 rgb(26 26 26 / 0.12)`.
- Top strip: the mono code on the left, the stamp on the right. The stamp is mono, 600, uppercase, 13px, in a 1.5px ink outline box. It is large and plain, never small print.
- Then the title (h3, 1.5rem), then the meta items in mono, split by `·`.
- Then the table: columns time (mono, 3.5rem), SAY, SHOW. Head row in mono with an ink bottom rule. SAY text is body size ink. SHOW text is 0.9375rem muted. Rows split by thin rules.
- Under 48rem each row stacks: time and SAY, then SHOW under it with a small mono "SHOW" tag.
- Last row: the caption label (mono) and the caption.
- The place panel: mono label, the mini season map, the code line (mono), the job line, then the two next titles in muted small text.

### Questions
- `<details>` with `<summary>` rows at least 56px high, 600 weight. A pixel plus sign on the right that becomes a minus when open (CSS, no icon font).
- Answers in body text, max 38rem. All answers are in the HTML.

### Closing panel
- Background ink, text paper, muted text `rgb(250 250 248 / 0.72)`. Rules `rgb(250 250 248 / 0.2)`.
- The action button keeps its orange and ink label.

## 6. Motion

- The season map: see its own section in the build task. It plays once, replays on tap, and is still under reduced motion.
- Buttons: 120ms colour change. Details: the browser's default.
- `prefers-reduced-motion: reduce`: no smooth scroll, no transitions, the season map shows its final frame.
- Removed: the logo intro curtain, hero entrances, scroll reveals, loops, the magnetic button, the header fold.

## 7. Accessibility

- One h1. One h2 per section, tied with `aria-labelledby`. Landmarks: header, main, footer.
- Text contrast at least 4.5:1, large text and boundaries at least 3:1.
- Tap targets at least 44px. Inputs 16px so phones do not zoom.
- Every picture has a text alternative. The map's changing numbers are hidden from screen readers; its meaning is in the alternative and the caption.
- Works without JavaScript: all content shows, the entry block submits, the map shows its final frame.

## 8. Performance

- No framework JavaScript on the main build. React loads only for the feedback toolbar on preview branches.
- Two font files (52 KB), no images, no video, no third-party script except the cookieless Cloudflare Web Analytics beacon when `PUBLIC_CF_ANALYTICS_TOKEN` is set.
- Inline scripts stay small: the entry block, the action links and bottom bar, the season map. The home page ships about 2.3 KB of JavaScript gzipped, and `scripts/verify-main-build.mjs` fails the build above 3 KB.

## 9. Never

Curtains, microphones, spotlights, stages, masks, clapperboards, film reels, director's chairs, popcorn, red carpets, marquee bulbs, tickets, velvet, typewriters, "on air" signs. No stills, logos, characters or looks from any real series, film or game. No platform names. No invented proof.

## 10. The season map

The page's one picture. It shows the offer without words: one season is 24 episodes on one arc (the Arc in Arcbuildr), the first 3 are written by day 10, all 24 by day 42.

Original pixel art, drawn by hand in inline SVG. No image file, no video, no library.

### Grid

Tiles are squares on a whole-number grid (`shape-rendering="crispEdges"`). The arc is a pixel arch: 24 cells, each touching the next by a side or a corner. Cells are `(column, row)`, row 0 at the top. Episode 1 is the bottom left, episode 24 the bottom right.

**Wide** (18 columns x 9 rows), used when the map is at least 34rem wide:

```
01 (0,8)   02 (0,7)   03 (0,6)   04 (1,5)   05 (1,4)   06 (2,3)
07 (3,2)   08 (4,1)   09 (5,1)   10 (6,0)   11 (7,0)   12 (8,0)
13 (9,0)   14 (10,0)  15 (11,0)  16 (12,1)  17 (13,1)  18 (14,2)
19 (15,3)  20 (16,4)  21 (16,5)  22 (17,6)  23 (17,7)  24 (17,8)
```

**Tall** (10 columns x 11 rows), used when the map is narrower than 34rem (phones):

```
01 (0,10)  02 (0,9)   03 (0,8)   04 (0,7)   05 (0,6)   06 (0,5)
07 (1,4)   08 (1,3)   09 (2,2)   10 (2,1)   11 (3,0)   12 (4,0)
13 (5,0)   14 (6,0)   15 (7,1)   16 (7,2)   17 (8,3)   18 (8,4)
19 (9,5)   20 (9,6)   21 (9,7)   22 (9,8)   23 (9,9)   24 (9,10)
```

Both are mirror images left to right, and the column never goes down from one episode to the next, so the figure always faces and moves right.

- Cell pitch 34 units, tile 30 units, so the gap is 4. Wide viewBox about 612 x 330, tall about 340 x 400 (grid plus 2 units of ground line plus breathing room). The SVG scales to its container width; at 335px wide the tall tiles are about 29px.
- A 2-unit ink ground line runs under the bottom row, the full width of the arch.
- Switch layouts with a container query on the figure (or render both and show one). One script drives whichever is shown.

### Tiles

- Not written yet: sheet fill, 1.5-unit `--color-rule-strong` outline, the episode number (`01` to `24`) in Geist Mono 500, ink, about 11 units.
- Written: ink fill, paper number.
- No radius.

### The figure

An original small walker, 9 x 11 pixels at 2 units per pixel (18 x 22 units), orange with one paper eye pixel. Two frames, swapped on every hop.

```
frame A        frame B
..ooooo..      ..ooooo..
..ooooo..      ..ooooo..
..ooopo..      ..ooopo..
..ooooo..      ..ooooo..
.ooooooo.      .ooooooo.
.ooooooo.      .ooooooo.
.ooooooo.      .ooooooo.
..ooooo..      ..ooooo..
..oo.oo..      ...ooo...
.oo...oo.      ...ooo...
.oo...oo.      ...oo....
```

`o` orange, `p` paper, `.` empty. It may be refined as long as it stays this plain: a block head, a block body, two legs. It must not look like any known character: no hat or cap, no overalls, no moustache, no spiky hair, no ghost, alien or animal shape, no weapon, no cape.

- It stands centred on the tile it is on. That tile is ink, so the figure is orange on ink.
- Start position: on the ground inside the arch, in the cell right of episode 1 (wide `(1,8)`, tall `(1,10)`).
- End position: on the ground inside the arch, in the cell left of episode 24 (wide `(16,8)`, tall `(8,10)`), so number 24 stays readable.
- A hop moves in 3 stepped positions (`steps()` or whole-pixel keyframes) with a rise of about 6 units in the middle. No easing curves, no blur, no rotation.

### The readout

Centred inside the arch, Geist Mono, hidden from screen readers (`aria-hidden`):

```
DAY 10                    large (about 40 units wide layout, 32 tall layout), ink, tabular numbers
3 OF 24 WRITTEN           small, ink
[REPLAY]                  the replay button, shown only when the animation has ended
```

The words come from `seasonMap` in the content file: `day`, `of`, `written`, `replay`, `replayLabel`.

Above the picture, inside the `<figure>` and always visible: `seasonMap.title` in the sans face, 1rem, weight 600. It gives the word "episode" its plain meaning before the picture uses it.

### Timeline (about 6.2 seconds)

| Time | What happens | Readout |
|---|---|---|
| 0 ms | Start state. All tiles unwritten. Figure at the start position | `DAY 1` `0 OF 24 WRITTEN` |
| 0 to 700 ms | The day counts 1 to 7, one step every 100 ms. The figure waits (frames swap) | `DAY 7` |
| 700, 1050, 1400 ms | Hop onto episodes 1, 2, 3. Each tile turns ink when the figure lands | `DAY 8` `1 OF 24`, `DAY 9` `2 OF 24`, `DAY 10` `3 OF 24` |
| 1400 to 2400 ms | Hold | unchanged |
| 2400 ms on | Episodes 4 to 24, one hop every 170 ms. Day for episode k is `10 + round((k - 3) * 32 / 21)` | counts up to `DAY 42` `24 OF 24 WRITTEN` |
| about 5970 ms | Lands on 24, then hops down to the end position | then the replay button appears |

The day never shows a tile as written before day 8: nothing is written before the Brand Strategy arrives on day 7.

### Behaviour

- Plays once, the first time at least half of the map is on screen (`IntersectionObserver`). On a desktop that is at load.
- Replays when the replay button is pressed. A click or tap anywhere on the map also replays it once it has ended. A press during play does nothing.
- The replay control is a real `<button type="button">` with visible text `REPLAY` and `aria-label` from `replayLabel`. It is at least 44px tall, and it is `hidden` until the animation has ended.
- `prefers-reduced-motion: reduce`: no animation. The map shows the final state and no replay button.
- No JavaScript: the server-rendered HTML is the final state (all 24 written, `DAY 42`, `24 OF 24 WRITTEN`, figure at the end position).
- With JavaScript and motion allowed there is no flash of the final state before the animation starts. Use the `js` class that the head script sets on `<html>`.
- The picture is `role="img"` with `aria-label` from `seasonMap.alt`. The caption lines (`seasonMap.caption`) sit under the map in a `<figcaption>`, mono, muted, visible to everyone, with `text-wrap: balance` so a line never ends on one short word.
- The root element exposes `data-state="idle|playing|done"` and each tile `data-tile="1..24"` with `data-written="true|false"`, so tests can read the state.
- Script under 2.5 KB minified. No dependencies. No layout shift: the SVG keeps its aspect ratio from the first paint.

### Mini map (`variant="mini"`)

Static. The wide layout at any width, tiles as outlines without numbers, the marked tile ink. A mono tag (`seasonMap.tag` and the `mark` number, for example `EPISODE 1`) sits inside the arch near the marked tile, at least 8 units clear of every tile for every mark from 1 to 24 (`tagPoint`, unit-tested). No figure, no readout, no script. `role="img"` with the `alt` passed in as a prop.

### Layout maths (`src/lib/seasonMap.ts`)

Pure functions and data, unit-tested: the two cell lists, `dayAt(k)`, the timeline as a list of `{ at, tile, day, written }` steps. Tests: 24 unique cells per layout, each next cell touches the previous one, columns never decrease, each layout is its own mirror image, `dayAt(3) === 10`, `dayAt(24) === 42`, days never decrease, nothing is written before day 8.
