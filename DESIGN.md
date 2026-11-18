# DESIGN.md

Direction A2, "Daylight bento, bolder", with the dark pill header. Chosen on 18 Nov 2026. It builds on Direction A ("Daylight bento", in git at `4bb7d88`) and replaces Direction B ("Plan on a desk", in git at `720b426`).

The page has one job: the visitor starts the application. Most visitors arrive from a phone, inside an in-app browser about 650 px tall.

All words live in `src/content/site.ts`. Components read from it and hold no copy of their own, `aria-label` text included.

## 1. Principles

1. One action, one label, one colour. Orange is "Start your application". It is also the brand: the arc and the "r" of the logo, and the large arc behind the form.
2. Show it, then say it. A fact that can be a picture is a picture: the 12 weeks are a timeline, the deliveries are cards with a day number and a small drawing, the price range is one card, the refund is three figures.
3. Big type on the left, colour in blocks. Weight comes from scale and from cards in full brand colour, not from a dark page.
4. Motion with a reason. The logo draws on, the first screen arrives once, sections enter as they are reached, cards answer touch, the character walks. Nothing loops. Nothing is hidden waiting for JavaScript.
5. Pixel art is one thing only: the little Zyade and the 24 tiles he walks. Everything else is round and smooth.
6. Phone first. At 360 to 414 px wide and 650 px tall, the name field, the email field and the button show without scrolling.

## 2. Tokens (`src/styles/tokens.css`)

Every colour, size and curve is a token. No raw colour value appears outside `tokens.css`.

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `oklch(96.2% 0.004 85)` | Page |
| `--color-card` | `#FFFFFF` | Cards, the form, the stage of the character module |
| `--color-field` | `#FAFAF8` | Inputs |
| `--color-ink` | `#1A1A1A` | Text, the header pill, one delivery card |
| `--color-ink-muted` | `#5F5A54` | Secondary text. 6.5:1 on paper |
| `--color-accent` | `#E8722E` | The action button, the logo arc and "r", the large arc |
| `--color-accent-text` | `#D45E00` | Orange for large text and drawings only (3.9:1 on white) |
| `--color-on-accent` | `#FFFFFF` | Button label, only at 19 px bold or larger (3.05:1) |
| `--color-sage` | `#597058` | Card block, founding places, the Sci-fi season |
| `--color-clay` | `#A34945` | Card block, the video poster, the price card, errors, the Anime season |
| `--color-taupe` | `#8C7B6B` | Tints and drawings |
| `--color-taupe-deep` | `#6F6154` | Taupe that carries text or white text on it, the Western season |
| `--color-focus` | `#C65100` | Focus ring, 3 px |

Type: Open Runde, self-hosted (400, 600, 700), one family for everything. `--text-display` is the headline (48 to 116 px), `--text-2xl` the section titles, `--text-base` is 17 px. Headings are never italic and no word inside a heading is coloured.

Shape: `--radius-lg` 28 px on cards, `--radius-md` 16 px inside them, pills on buttons, chips and the header. Two shadows, `--shadow-card` and `--shadow-lift`; blocks of full colour carry none.

Motion: `--ease-out` for state changes, `--spring` (a `linear()` curve with a small overshoot) for entrances, `--dur-fast` 150 ms for hover and press.

## 3. Style files

Loaded in this order by `src/layouts/Base.astro`:

1. `tokens.css`: fonts and tokens.
2. `base.css`: reset, button, cards, header, first screen, delivery cards and their drawings, the mechanics of the character module, motion.
3. `look.css`: the A2 look on top: large type on the left, the arc, cards in full colour, bigger figures.
4. `sections.css`: each section of the home page, the small pages, form errors, the short-phone first screen.

## 4. The page

Ten sections, in this order (`src/content/sections.ts`):

| Section | What it shows |
|---|---|
| `top` | Who it is for, the headline, one line, the form on the orange arc, the founding places as dots, the founder video slot |
| `problem` | 12 unrelated posts as a grid of tiles, beside three questions a viewer is left with |
| `season` | "Choose your season": the pixel character, four costumes, the 24 tiles |
| `offer` | The 12 weeks as a timeline, six delivery cards, three sizes, the price range as one card |
| `ai` | One block: what an AI plan gives, what ours starts from |
| `proof` | The Show Audit as a page drawing, one script as a teaser with a link to `/sample`, the refund as three figures |
| `evidence` | One line, then four findings behind one tap, and what we could not find |
| `fit` | For you, not for you |
| `questions` | Four questions, closed |
| `apply` | The form again |

Other pages: `/sample` (one full script), `/booked` (after the booking: the invite line, the confirmation video slot, the call's agenda), `/privacy`, 404.

`/booked` has one more state, for a booking made from a chat (`via=chat` or the chat event's slug in the address): the note under "Have ready" becomes one line saying the 8 questions come first, with a button to them. The button carries the first name and the email from the address, and only when each passes its check. Without those parameters, or without JavaScript, the page is the standard one.

Header: a dark pill, sticky. The logo alone at first. "Start your application" slides into the pill once neither form's button is on screen, so there is one action on screen at a time. Without JavaScript it is a plain link to `#apply`.

## 5. The character module

- Sprites: `public/sprites/zyade.png` (7 frames by 5 outfits, 32 by 48 px cells) and `public/sprites/poof.png`. Both are built by `scripts/sprites/build.mjs`, where every pixel is written out by hand. No photo is in the repo.
- Always scaled by a whole number, with `image-rendering: pixelated`, so every pixel stays square.
- Four seasons: Anime, Sci-fi, Western, Detective. Each costume is an original design. None borrows an outfit, hairstyle, weapon, logo or name from an existing film, show, anime or game.
- Picking a season changes the costume behind a short puff, turns the block to the season's colour and restarts the walk across the 24 tiles. The counters read the same facts as the page: episode 3 by day 10, episode 24 by day 42.
- No JavaScript is needed: radio buttons and `:has()` do the work. JavaScript only waits to start the first walk until half the stage is on screen.
- The walk ends in under 5 seconds and does not loop, so it needs no pause button.

## 6. Motion

| What | How | Without motion |
|---|---|---|
| Logo | Each stroke draws on, the orange "r" last | Drawn |
| First screen | Headline lines rise, the arc draws, the form tilts in. Settled in about 1.3 s | In place |
| Sections | `[data-reveal]` rises with a small turn as it comes on screen, once (`src/scripts/motion.ts`) | Visible |
| Cards and buttons | Lift on hover, press on touch | No movement, colour only |
| Character | Costume change, walk, tiles fill, counters count | Finished state: all 24 tiles, day 42 |

Rules: with `prefers-reduced-motion: reduce`, nothing moves and everything is shown. With JavaScript off, nothing is hidden. Scroll is never taken over. Entrance animations use `translate`, `rotate` and `opacity`; the header button is the one place a size animates.

## 7. Video slots

`VideoCard.astro` shows a poster (the pixel Zyade on a block of clay) until a file is set in `src/config.ts` (`FOUNDER_VIDEO`, `CONFIRMATION_VIDEO`). With a file, a play button appears; the video element is created on the press, so a phone downloads no video until asked. Without JavaScript the button opens the file. A file must be under 25 MiB (the host's limit per file) and should carry burned-in captions.

## 8. Not used, on purpose

- No dark first screen, no gradient text, no glass, no stock icons, no emoji.
- No monospace labels and no all-caps labels above headings.
- No pixel art outside the character module.
- No Tailwind, no animation library. React loads only for the feedback toolbar on preview builds.
- Title Case and "no first person" from the web interface guidelines: the voice is sentence case and says "we".

## 9. Verified by tests

`npm run check`: no sideways scroll from 320 to 1440 px on every page; the first screen at 650 px tall; tap targets of 44 px on phones; axe with every answer open and in every costume; reduced motion; JavaScript off; the home page's own scripts under 3 KB gzipped; a budget of 850 words on load and 1,100 with every answer open.
