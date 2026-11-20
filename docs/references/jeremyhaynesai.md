# Reference: jeremyhaynesai.com (the iceberg)

Captured 2026-11-20 with the Claude in Chrome extension. I measured computed styles, geometry, stylesheet rules and the observer script, and replayed the reveal. The 1440 and 390 px views come from the page's server HTML rendered with scripts removed. The URL had no parameters. Mechanics only: no code, text or images were taken.

## 1. Where it is

- The iceberg is a card in the "what's included" section of a long sales page (about 27,500 px).
- It is not in `#masterclasses`: that anchor is a grid of covers further down.
- The site is built with Astro. The iceberg is HTML and CSS plus one short script, not an image.

## 2. How it is drawn

- **Card:** 1024x896, radius 16, a 1 px border in ink at 10%, a light grey background.
- **Screen readers:** a visually hidden one-sentence summary describes the whole graphic.
- **Layout:** a two-zone grid with columns `35fr 65fr` over 1024 px, and one column under it.
  - The sky has a white radial glow behind the tip.
  - The sea has a cyan wash (12% → 3% → clear) and a top border.
- **Tip:** an inline SVG (`viewBox 0 0 100 60`) of 3 flat polygons (white, pale grey, pale cyan) and one outline, with a soft drop shadow. Width is `var(--berg)`: 335 px desktop, `min(100%, 300px)` on phones.
- **Mass:** 8 stacked spans, each cut with `clip-path: polygon()`.
  - Each band's bottom edge equals the next band's top edge, so the outline is continuous and narrows to a point.
  - Three bands carry extra points for an irregular edge.
  - Fill darkens in near-equal steps from bright cyan to near black.
  - A second span per band, in ink at 16%, clips the right part to draw a sloping shaded facet.
- **Band height = text height.** Each band shares a grid row with its text, so every slice is as tall as its item and the two can never drift apart. The top band is a cap aligned with the "below" heading.
- **Leaders:** 1 px lines from the band centre to the text, white inside the berg and ink at 22% outside, ending in small dots.
- **Text:**
  - Zone labels: 13 px, weight 600, ink at 55%.
  - Zone headlines: 26/32.5.
  - Above-water items: 16/22 with 17 px line icons.
  - Below-water items: 16/24, each a bold lead phrase plus a plain detail.
  - About 160 visible words.

## 3. Motion

- **Reveal:** an IntersectionObserver on the sea (threshold 0.12) adds a class once.
  - It is skipped under reduced motion, and when the sea is already in view at load.
  - Bands drop in from −14 px over 0.6 s, `cubic-bezier(.2,.7,.2,1)`, staggered 95 ms.
  - Texts rise from 10 px over 0.6 s, 180 ms after their band.
  - Leaders draw with `scaleX` over 0.5 s, 300 ms after their band.
  - The whole sequence takes about 1.5 s.
- **Ambient:** a 30%-wide cyan glint crosses the waterline in an 8 s linear loop, and the shape has a faint 9 s flash. Both turn off under reduced motion.
- **Hover** (fine pointers only): `:has()` dims every other band and text to opacity 0.38 over 0.2 s.

## 4. Phone

- One column: the above-water list, then the tip (237 px), then the berg with uniform 46 px bands, then the below-water list.
- The leaders are hidden. Each item gets a 13x13 colour key (radius 4) matching its band.

## 5. What Arcbuildr takes

- **Candidate (2026-11-20, for the home page rebuild):**
  - free above the line, the season below;
  - drawn in CSS as clipped bands that share grid rows with their text;
  - colour keys on phones;
  - a one-shot reveal and a hover that isolates a row.
- **Rules:**
  - Every item comes from our own facts.
  - Every band has a real count or none.
  - No platform names.
  - The colour ramp comes from our tokens, not their cyan.
- **Not taken:** the wording, the item list, the counts, the cyan palette, the tip drawing.

## Feature cards: "Everything you get when you join." (captured 21 Nov 2026)

Mechanics only. Measured from a scripted recording at 1440 × 900 and 390 × 844, with the page's own animation clocks read through the Web Animations API. Nothing of the site's code, text or assets is used.

**Build.** Astro with Vite and Tailwind utilities. The product screens are HTML, inline SVG and images with custom CSS. No animation library was found: the loops are CSS keyframes. One small script fits each screen to its stage with a ResizeObserver.

**Card pattern.** 11 numbered cards, full width, 20 px apart on desktop (16 px on phones). Each card: a product screen on one side (56% of the card), and a small number, a large heading (34 px) and one paragraph (18 px) on the other. On phones the screen sits above the words. Cards are white with 24 px corners on a pale grey section.

**Screen pattern.** Each screen is a simplified mock of the product: a few real labels, the rest grey placeholder bars (about 8 px tall, pill ends, 9% ink). 6 of the 11 screens loop; the rest are still.

**Loop timing.** Loops last 8 to 12 seconds and run forever.
- The build is fast and the finished state holds: one screen builds in about 2 seconds, then holds for 7.35 seconds of a 10 second loop.
- Rows enter one after another: 90 ms apart for result bars (300 ms each), 192 ms apart for list rows (360 ms each).
- Panels fade in and rise 12 px over 300 to 600 ms.
- Typing is a stepped mask over text that is already there, about 22 ms a character.
- A drawn cursor moves at about 190 to 280 px a second, presses, and the pressed control crossfades two labels in about 270 ms.
- The reset is a 350 ms fade just before the loop restarts.
- Easing: cubic-bezier(0.4, 0, 0.2, 1) for most moves, linear for progress bars.

**Phone iceberg.** One picture: a pale tip drawn as an SVG, a 2 px waterline, then a cap and 7 stacked bands (46 px each) that narrow and darken to a point. The free list sits above the picture. Under it: a "below the water" label, a heading, and the list, each item with a 13 px colour square matching its band.

**What we take.** The card pattern, the fast build with a long hold, rows one after another, and the one-picture phone iceberg with a colour key. Our screens show our own product with our own words, colours and timings (see `src/styles/frames/feature.css`), and they stop when off screen and under reduced motion.

**Not determined.** What first starts each loop, how the cards behave under reduced motion, and hover on each control.
