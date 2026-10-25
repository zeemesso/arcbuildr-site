# Reference: onefactor.ai/kallaway/launch

Captured 2026-10-26 with Playwright (computed styles, keyframes, resource list, screenshots at 1440 x 900 and 390 x 844). The link we received carried a personal ManyChat token and an `fbclid`; both were stripped and are not stored anywhere. Mechanics only. No code, text or assets are copied.

What it is: a creator's cohort sales page for a personal-brand program. Instagram traffic through ManyChat (`utm_medium=manychat`), one action (reserve a spot), long-form argument with heavy proof. It is a hand-built HTML page hosted inside a page builder (the content scrolls inside an inner container, 13,380 px tall).

## Layout grid

- Content container max width **1160 px**. Reading blocks narrow to **640 px** (long letter-style sections), 520 px (lead paragraph), 720 to 780 px (centred headings and their intro lines).
- Hero: a 2-column grid, 512 px text + 520 px media (a framed video with a play button and duration).
- Section openers are centred: heading, then a one or two-line intro. Bodies then switch layout per section:
  - long single-column letter (640 px),
  - a profile-stats card (avatar + 5 numbers),
  - a horizontal carousel of case cards (4 visible, the 4th cut off to show it scrolls),
  - a 2-column definition table inside one bordered panel (label 210 px, description 466 px),
  - an alternating zig-zag roadmap (media left, text right, then swapped),
  - a mock video-call UI as the visual for "live calls",
  - a 6-column wall of 9:16 video tiles with view counts,
  - a value-stack price card (440 px, label left, value right, total, then the price).
- Section rhythm: **120 px** top and bottom padding, every section. The hero has 104 / 84 px.

## Type

- Pairing: **Inter Tight** (400 / 500 / 600 / 700) for everything, plus **Instrument Serif Italic** for one emphasis phrase per headline.
- The serif phrase is set at **1.12 x** the sans headline size (73.9 px inside a 66 px h1), so its x-height matches. It usually sits on its own second line, or ends the first line.
- Scale (px, size / line height / tracking):
  - h1 66 / 66 / −1.98 (−0.03 em), weight 600. Line height 1.0.
  - h2 58 / 58 / −1.74, weight 600. h3 40 / 40 / −1.2.
  - Lead 21 / 32.5. Body 16 / 27.2 (1.7). Small 14 / 21.7.
  - Labels: 11 to 12 px, weight 600, uppercase, tracking 0.15 to 0.2 em (pills, card kickers, stat labels, button text).
- Bold inside body paragraphs carries the argument: a skimmer reads only the bold phrases and still gets it.

## Color logic

- Dark navy theme. Base gradient `165deg, #16243F to #0A1324`, a radial vignette from the top, a faint square grid and film-grain noise over everything.
- Text: white for headings, white at 70 % for body, white at 60 % for small print.
- One accent family: periwinkle `#8FB0F4` for kickers, stats and links, and royal blue `#1A4283` for the button.
- Surfaces: cards are navy with a 1 px inset white hairline at 9 to 15 % and a soft outer shadow. Glass-like, no blur.
- Radii: 16 px cards, 22 px media frames, 8 px inner tiles, 4 px buttons. Avatars round, with a 1.5 px white ring.

## Motion

- **Scroll reveal in pure CSS:** `.rv` runs a 700 ms `rvIn` animation (ease `0.2, 0.6, 0.2, 1`) fired once by a scroll trigger on `view()`. No JavaScript animation library is loaded.
- Hover: 200 to 280 ms transform and opacity on cards and buttons.
- A marquee strip under the hero ("past and present members", avatar + name + follower count) scrolls sideways.
- A countdown pill ("doors close …") with a dot.

## Section patterns (order)

1. Sticky header: wordmark left, CTA right (a text button + a square arrow button joined as one unit).
2. Hero: deadline pill, headline with a serif phrase, lead with bold key outcomes, the split CTA, then a founder avatar and a 3-number stat bar. Video on the right.
3. Members marquee.
4. "The problem" letter in the founder's voice (640 px, bold carries it).
5. Founder proof: big claim headline, a profile card styled like an Instagram header with 5 numbers.
6. Case carousel: one card per client niche, each with a "before" line in serif italic, "now" video tiles, and a result line.
7. "What you get": a definition table panel.
8. Roadmap: zig-zag rows, "Days 1–2:" in sans + the step name in serif italic.
9. Live calls: a mock call UI.
10. Community wall: a grid of 9:16 tiles with view counts and niche tags.
11. Bonuses, then pricing as a value stack, then "Before you buy" (FAQ), then a closing CTA.
- The CTA repeats after almost every section.

## Mobile

- One column. Video tiles become a 2-column grid. A **full-width sticky CTA bar** sits at the bottom of the screen the whole time.

## What transfers to Arcbuildr

- The type pairing mechanic: one grotesk plus one serif italic phrase per headline. It gives a personal-brand voice without the generic "all serif" look.
- The long argument with bold-carried paragraphs, and the section order: problem, founder proof, cases, what you get, roadmap, FAQ, CTA.
- The roadmap pattern fits our build order (strategy, identity, profile, content, support).
- The mobile sticky CTA bar fits Instagram in-app traffic.
- The pure-CSS reveal keeps us at zero animation dependencies.
- Hold until real data exists: the member marquee, the case carousel, the view-count wall, follower stats (COPY.md #9: no approved proof yet).
- Hold, per CLAUDE.md: the pricing value stack (no prices unless Zyade provides them) and the deadline countdown (no real deadline).
