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

## 10. The home page from 21 Nov 2026

Sections 4 to 6 describe the pages that keep Direction A2: `/sample`, `/booked`, `/privacy` and the 404 page. The home page was rebuilt around the two fields and the application, and follows this section instead.

- **Files.** `src/layouts/Home.astro`, `src/components/home/`, `src/scripts/home.ts` and `src/styles/home/`: `frame.css` (structure and motion), `feature.css` (the five sample screens), `rest.css` (the lower sections).
- **Frame.** A grey canvas holds rounded white windows. One dark band carries the diagram. Labels are in the system mono font; everything else is Open Runde.
- **Order.** The first screen (headline, one line, the two fields), five sample screens, the diagram with "Your profile" at its centre, the iceberg, the install tabs, the price, five closed questions, the two fields again, the footer.
- **Colour.** Only the names in `tokens.css`. A tint is mixed from those names with `color-mix`, never written as a raw value.
- **Words.** At most 25 on the first screen and 450 on load. `e2e/home.spec.ts` counts them. Every sample screen is labelled a sample.
- **Motion.** Two curves: entrances ease out, moves between two places ease in and out. Exits are shorter than entrances, pressed controls scale to 0.97, list rows follow each other 30 ms apart, and nothing bounces. With reduced motion the page shows its finished state at once.
- **The application.** One question per screen, in `src/components/application/` and `src/scripts/apply.ts`. The page reaches it only through `startApplication()` in `src/scripts/application.ts`, so another form can replace it by changing `APPLICATION_MODE` in `src/config.ts`.
- **Script budget.** 10 KB gzipped on the production build, checked by `scripts/verify-main-build.mjs`. It was 3 KB before the page carried its own form.

## 11. The page from 22 Nov 2026 (L1-P11)

Section 10 is history. The home page and `/booked` follow this section; `/privacy` and the 404 page keep Direction A2. `/sample` is gone.

- **Words.** Every word comes from the deck, `~/fable-sprint/L1-P10/deck-v2.md`. `node scripts/deck/sync.mjs` copies it into `src/content/deck.json`; components read a line by the deck's own name for it (`src/content/deck.ts`), so a renamed or removed line stops the build. `--check` says whether the page is in sync. The few interface words the deck has no line for (button labels of the form, "Pause the gallery", "Close", "Day 1") live in `src/content/site.ts`. There is no word budget any more: the deck decides the words.
- **Files.** `src/layouts/Home.astro`, `src/components/page/` (one component per section, `screens/` for the 11 live screens), `src/scripts/page.ts`, and `src/styles/page/`: `frame.css` (the frame, the first screen, motion), `cards.css` and `screens.css` (section 5), `sections.css` (2 to 4), `more.css` (6 to 12), `booked.css`.
- **Frame.** Frame 1: a warm grey canvas, rounded windows, the dark pill header, Open Runde, one orange action. Small mono labels with an orange dot name each section. Words the deck puts in [brackets] are tinted chips.
- **No section looks like the one before it.** 1 a white window. 2 type straight on the canvas. 3 a white window with a dark video poster. 4 a dark window. 5 the canvas with white cards. 6 a taupe-tinted window (once it has a piece). 7 a white window with the colored iceberg. 8 the canvas with a white stack sheet, a dark price box and a white sizes window. 9 a sage-tinted window. 10 a white window with two tinted columns. 11 the canvas with white question rows. 12 a dark window. `e2e/home.spec.ts` checks that no two neighbors share a surface.
- **Live screens.** Each of the 11 cards has a screen that builds, holds and resets in 10 s (`figure.screen[data-loop]`, steps marked `data-at`). It plays only while on screen. With reduced motion, or without scripts, it shows its finished state. A screen shows what an owner would read: never a file name, a time stamp, a version or a check code.
- **Real pieces only.** A screen or a gallery card is fed by a real piece (`src/content/proof.ts`, files in `src/content/proof/` and `public/proof/`, both ignored by git). `node scripts/proof/import.mjs` brings them in from `~/fable-sprint/L13-P1/proof/INDEX.md`. Until a piece exists a card's screen shows grey bars and, at most, words of its own card. The gallery (section 6) is not on the page at all until the first real gallery piece is brought in; then it shows by itself, with a tab only for a kind that has a piece.
- **His face.** A real photo (`FOUNDER_PHOTO` in `src/config.ts`, or the imported `founder-photo` piece), or his initials in a circle. Never the pixel character, never a generated picture.
- **The marks.** Claude's and ChatGPT's own files, unchanged, each whole in its own white disc: on the first screen's second button, on the diagram's second output, in the corner of card 10's screen. `AI_MARKS = "names"` in `src/config.ts` removes them.
- **The iceberg.** One picture (the free tip above the waterline, nine colored bands below), then the list, each line keyed to its band by color. On a wide screen the line at mid-screen lights its band. The band colors are mixed from the tokens.
- **Motion.** The first screen arrives piece by piece from the style sheet alone, so its words never wait for a script. Sections rise in on scroll; the diagram's five steps turn by themselves; the gallery steps every 2.5 s and has a pause button, when it holds more pieces than fit. With reduced motion nothing moves and everything is shown.
- **The form and the booking.** Name, email, then the 8 questions, one per screen. After the save the same layer shows the calendar (Cal.com's inline embed, name and email filled) or, for a budget under 750 USD, the deck's closing lines and no calendar. A finished booking sends the visitor to `/booked`. If the calendar does not load in 12 s a link to the booking page shows instead.
- **`/booked`.** The heading with the first name, two practical lines, the confirmation video slot (a poster with his initials until `CONFIRMATION_VIDEO` is set), then what happens next in two steps.
- **Phone.** Each section has its own phone layout. No sideways scroll from 320 px; targets of 44 px or more.


## 12. The quiet folio, from 22 Nov 2026 (L1-P11 redesign)

Zyade rejected section 11's look: too big, too crowded, too many boxes. This section replaces its frame, its type and its spacing. Where the two disagree, this one wins. Part 1 rebuilt the first screen, the wins row, the iceberg and the offer; the other sections keep section 11's build under the new scale until they are rebuilt from deck-v3.

- **Direction.** One sheet of warm paper (`--color-paper`), read like a creative director's portfolio: small type, long air, hairlines, and a clear sales spine (callout, wins, video, offer, apply). A section sits on the paper itself. Only a few things are a surface: the video, the iceberg's picture, the product card, the bonus items, and a painted panel that never runs the full width of the screen.
- **Type scale** (`frame.css`, `:root`). One family, Open Runde, at 400 and 600; 700 only on a button. Headline `--h1`: 34 to 56 px. Section heading `--h2`: 26 to 36 px. Lead `--lead`: 17 to 19 px. Body 16 px on 1.6. Labels: system mono, 11 px, wide-spaced capitals. Nothing on the page is larger than the headline; one figure, the price, is as large. `e2e/home.spec.ts` measures it.
- **Air** (`--air`): 72 to 152 px between two sections. Text runs 36rem wide at most (`--measure`); the page 70rem (`--page`).
- **Colour.** Ink on paper. Orange is the action and one small mark per section. Words the deck puts in [brackets] are said in ink at 600 inside a muted line, never boxed. The iceberg has its own sky, water and ice names in `tokens.css`; nothing else uses them.
- **First screen** (`First.astro`, `Vsl.astro`). Centered: the callout, the headline, one line, then the sales video, then the button. The video is 16:9 and gives up width on a short screen so the button stays in view. `VSL_VIDEO` in `src/config.ts`: empty shows the poster (his photo once there is one, a dark sheet with his name until then) with the play mark only drawn, because there is nothing to play; with a file the mark is a button, and the player's own controls take over. Without scripts the player shows its controls from the start.
- **Wins** (`Wins.astro`). Three columns under the first screen, a hairline above each. Their words are the deck's (section 1, `win 1` to `win 3`); until the deck has them, three grey bars each.
- **The iceberg** (`Berg.astro`). One drawing, 360 by 560: sky, a waterline, a small faceted tip above it, the big mass below it cut into nine bands, water all around and deepening. The bands run from pale ice to deep water; each list line carries its band's color as a key. On a wide screen the picture stays beside the list and a line lights its band; on a phone the picture comes first, then the keyed list. The bands come down one by one, and a glint crosses the waterline every 8 s; neither runs with reduced motion. Mechanics from `docs/references/jeremyhaynesai.md`; the drawing, the colors and the words are ours.
- **The offer** (`Price.astro`, `Product.astro`, `Bonuses.astro`). The deck's stack is shown as three kinds of thing, told apart by what stands where a price would: a figure alone is a piece of the service (the ledger: name, figure, hairline); a sentence with a figure is the product we also sell alone (the product card: a drawn cover, its name, its value); no figure is a bonus (the bonus stack: one item above the other, each with a cover, its number, its name and its value). Then the total, quiet, and the price, large.
- **No company's mark.** `AI_MARKS` is `"names"`: the Claude and ChatGPT files are not on the page.
- **Motion.** Calmer than section 11: a section rises 16 px, with no scale.
