# Reference: rainbrand.com

Captured 2026-11-20 with the Claude in Chrome extension at 1440 px: computed styles, DOM geometry, stylesheet rules and frame sequences. The 390 px layout comes from the page's server HTML rendered with scripts removed, so it shows no JS motion. The URL had no parameters. Mechanics only: no code, text, images, gradients or font files were taken.

## 1. What it is

- A one-page product site built with Next.js, Tailwind v4 and Framer Motion.
- 8,064 px tall at 1440, with about 756 words across 10 sections. The busiest section has 173 words; the first screen has 24.

## 2. Frame and grid

- The page is a grey frame (`#d9d9d9`). Every section is a white or black "window" card: the viewport minus a 40 px gutter on each side, capped at 1360 px, radius 20. On phones the gutter is 12 px.
- Nested media sits in a 6 px inset. Inner cards use radius 16.
- There is no 12-column grid. Each section has its own split: FAQ about 1/3 to 2/3, customers 3 cards of 422 px with 40 px gaps.
- A 2 px `currentColor` "spine" runs down the page centre in a per-section SVG and branches at 45° to off-centre cards. Filled SVG "pipes" with inverse corners join the cards.

## 3. Type

- One variable text face at weight 400, plus a mono for 11 to 12 px uppercase labels and item numbers.
- The three display headlines are vector art, with the real text in a visually hidden span.
- Desktop sizes: 56/58 (−1.96 px), 48/52.8, 40/40, 30/36, 22/30, 17/26 (answers in ink at 80%), 16/24, 14/20, 13/16 (tabs), 11 to 12 mono.
- Phone sizes: h2 44/46, then 32/34 and 28/28.

## 4. Colour

- The system is monochrome: ink `#0a0a0a`, white, grey `#d9d9d9`, muted `#5c5c5c`. Ink also appears at 60, 75 and 80% for secondary text and at 4% for chips and tab lists.
- Colour comes only from content: WebGL gradients, customer banners, the cursor trail and three marker pills.

## 5. Section patterns

- **First screen:**
  - The nav sits inside the first card, as a centred white link pill.
  - Below it: the headline, then a 2-line subline with 4 inline chips (25 px tall, 4% ink).
  - Then a black and a grey pill button (46 px tall), and a small tab-shaped card hanging from the bottom edge.
- **Cursor effect:**
  - A canvas behind the hero content, drawn at 0.75 resolution.
  - `pointermove` and rAF draw soft rounded squares snapped to a grid.
  - The trail fades about 0.8 s after the pointer stops, and a static seed image returns about 1.8 s after.
- **3-in, hub, 2-out:** a black card holding 3 input cards (342x202, staggered), a central ticket-shaped hub and 2 output cards. They are joined by filled pipes and nothing animates. On phones it restacks: inputs grouped in one card, then the hub, then the outputs.
- **Features:** a 268x140 thumbnail in a 6 px frame, a 30 px line with one highlighted keyword, and small links with ↗.
- **Gallery:**
  - A cover-flow with perspective 1400 px. Side cards are rotated ±50° and set at Z −160 px.
  - It advances one card about every 2.5 s, with a step of about 0.6 s.
  - On a category change, cards deal in over 0.24 s with a 30 ms stagger.
- **Tabs with numbered steps:**
  - The tab list has a 4% tint, radius 14, padding 4. Tabs are 34 px tall, radius 10.
  - The active tab is a black pill. Switching is instant: no slide, no height tween.
  - Each step has a 20 px number square, one line and one action (a button or a code field with a copy button).
- **FAQ:**
  - Native `details`/`summary`, 6 numbered items, the first open.
  - The 36 px icon box fills ink when open (150 ms).
  - Height animates about 200 ms ease-out, in both directions.

## 6. Motion

- **State changes:** 150 ms `cubic-bezier(.4,0,.2,1)` for colour, background and scale. Press scale is 0.97, hover scale 1.01.
- **Entrances:** `cubic-bezier(.23,1,.32,1)`. Swapped text rises 4 px over 0.22 s and leaves in 0.15 s.
- **Header:** after the hero, the in-card nav strip morphs into a fixed white pill (about 900x50, top 16) in about 300 ms, with a slight spring.
- **Reduced motion:** fade only.

## 7. What Arcbuildr takes

- **Candidates (2026-11-20, for the home page rebuild):**
  - the grey frame with window cards;
  - the monochrome system with colour only from content;
  - mono numbers and labels;
  - one spine line;
  - a static in, hub, out diagram;
  - chips in the subline;
  - the header that becomes a pill;
  - numbered steps in tabs;
  - the numbered `details` FAQ;
  - two motion curves.

  All of these can be done in CSS.
- **Not taken:**
  - the WebGL gradients and the rainbow cursor trail;
  - the display face and vector headlines;
  - their illustrations and connector paths;
  - the 3D carousel;
  - any wording;
  - chat widget and pixel.

## How it is built (captured 21 Nov 2026)

Mechanics only, from the page's exported scripts. The deeper bundle analysis timed out, so this is partial.

- Next.js with React, built with Turbopack. Utility-style classes (Tailwind in at least one embedded component).
- Motion (Framer Motion) is in the bundle: in-view activation through IntersectionObserver, hover and tap states, and the native Web Animations path. Accordions animate their height with the native API. The header changes state on scroll through an observer.
- No GSAP, ScrollTrigger, Lottie, Rive, anime or Lenis was found.
- Not determined: which effects run on load or on scroll, and the stylesheet's keyframes. No frame recording was made of this site in this run.
