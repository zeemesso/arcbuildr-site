# Reference: context-con.com

Captured 2026-10-26 with Playwright (computed styles, resource list, screenshots at 1440 x 900 and 390 x 844). Mechanics only. No code, text or assets are copied from this site.

What it is: a single-founder event page. One action (vote for a city), live social proof, and the founder's own voice at the end. Next.js, Clerk for login, Mapbox GL for the globe.

## Layout grid

- One centred column. Container max width 1152 px (72 rem) on desktop, 448 px (28 rem) on mobile, with 20 px side padding.
- The hero and the statement sections are centred text at 768 px or less. Text blocks cap at about 410 to 520 px, so a line stays at 55 to 65 characters.
- The body of the page is a **2 x 3 bento grid** of equal cards, 548 px each, with a 12 px gap. Each card holds one idea: an icon chip, a coloured kicker, a heading, 3 to 5 check-list lines, then media or a live widget at the bottom.
- The founder note is a narrow card (about 460 px) with a polaroid stack overlapping its top-right corner. It breaks the grid on purpose.
- FAQ: a single 768 px column of rows split by hairlines.
- Closing band: a full-width dark rounded panel ("built in N hours") before a small sign-off.

## Type

- One family, **Open Runde** (a rounded grotesk), weights 400 / 500 / 600 / 700. Display and body share it. The rounded terminals make it read friendly.
- Scale (px, size / line height / tracking):
  - Display h1 72 / 68.4 / −2.88 (−0.04 em), weight 700. Line height below 1.
  - Section h2 60 / 57 / −2.4, weight 700. Statement block 48 / 45.6 / −1.92.
  - Card heading 24 to 28 / 32 to 38.5, weight 600, tracking −0.72.
  - Kicker 24 / 600, coloured.
  - Body 17 / 27.6 (1.625). Lead paragraph 18 / 28. Small 14 / 20. Micro 12 / 16.
  - All text tracks tight (−0.16 px even at body size).
- The headline tracking scales with size: about −0.04 em on display, −0.01 em on body.

## Spacing

- Section rhythm: 80 px top and bottom on desktop, 48 px on mobile. The hero has 144 px of top padding under a floating nav.
- Card internals: 28 px radius, 1 px light border, white card on a #F7F7F7 page.
- Small gaps: 2 / 4 / 8 / 12 / 16 px. The 12 px gap repeats everywhere (cards, lists, chips).

## Color logic

- Neutral base: page `#F7F7F7`, cards `#FFFFFF`, ink `#111111`, muted text `#6B6B6B`, chips `#EFEFEF`.
- **One action color:** orange-red `#ED4407`. It is used on the main button, the nav "Vote" pill and one big statement headline set entirely in it.
- **Per-card kicker colors**: green `#1DA462`, blue `#2F6BFF`, orange, amber `#E89B12`. Each card's icon chip uses its color at 10 % opacity, and its check marks and kicker use the full color. This color-codes the topics without competing with the CTA.
- Dark accents: the floating nav pill and the closing panel are `#111`.

## Motion

- **Intro splash** (about 6 s or more on mobile): a sentence, then the wordmark builds letter by letter, with a polaroid stack sliding in from the bottom. The page sits inside a rounded "card" frame during it.
- Scroll reveal: content fades and translates in when it enters the viewport. A full-page screenshot before scrolling shows a blank page.
- Transitions: 150 ms color and background on buttons (ease `0.4, 0, 0.2, 1`). One 700 ms transform ease-out on the polaroids.
- Live elements: a countdown pill, a live "votes / here now" counter with a pinging dot (`ping` keyframe), an avatar stack, and a leaderboard with rank-change arrows.
- Globe: Mapbox GL in WebGL, a 1100 px canvas cropped by the fold so only the top of the globe shows.

## Section patterns

1. Floating pill nav, dark, centred, about 500 px wide: wordmark, three links, ghost "Log in", orange CTA pill.
2. Hero: countdown pill, two-line display headline, 3-line lead, one big pill CTA (56 px tall, 36 px side padding, 18 px / 600), live counters, avatar stack, then a half globe as the visual.
3. Stat strip: 4 small bordered cells (number on top, label under).
4. Bento grid of 6 topic cards, each with a check list, and a live widget or a tilted photo in a rounded frame with a shadow.
5. Statement block: a three-line headline in the action color, a short paragraph, the same CTA again.
6. Founder note: avatar, name and role, a letter in plain paragraphs, a signature with the handle, and a polaroid stack.
7. FAQ accordion, then the closing dark panel, then a sign-off.

## Mobile

- The same single column. Bento cards stack. The intro splash plays full screen and delays the content by several seconds.

## What transfers to Arcbuildr

- The bento grid with color-coded kickers fits the five deliverables (strategy, identity, profile, content, support), one card each.
- The founder note with polaroids fits "Who we are" (Zyade and Hanane), once the photo exists.
- One action color, everything else neutral.
- Live, honest counters only where we have real data. We have none yet, so skip them.
- Skip: the long intro splash (Instagram in-app visitors leave), the WebGL globe, login.
