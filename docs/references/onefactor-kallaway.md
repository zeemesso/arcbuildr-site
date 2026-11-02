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

---

# Extension 2026-11-02 (structure and conversion mechanics)

Re-checked with Playwright (desktop and 390 px). **VERIFIED** unless marked.

## 1. Pages visited

- `https://onefactor.ai/kallaway/launch` (single page; no sub-pages exist)
- Only other link: `https://onefactor.ai/` ("Powered by onefactor" badge, footer). A "Back" button has no href (JS).
- Contact: one mailto in the pricing block (founder's company address).
- **State change:** the page is now in **waitlist mode**. A top pill reads "Doors are closed". Every CTA is "Join the waitlist". The 2026-10-26 capture was the open-cohort version.

## 2. Section map as it is now (14 blocks, page height about 13k px)

| # | Section | Purpose | Element type |
|---|---|---|---|
| 1 | Status pill, headline, subline, CTA | State outcome + time box ("in 4 weeks"), name what happens (live cohort + 5 calls), end with a concrete deliverable (next 10 videos) | Hero |
| 2 | "By [founder]" + 3 numbers (views, followers, revenue) | Authority in one line | Proof bar |
| 3 | Marquee of members: name + follower count | Volume of past members | Logo/name strip |
| 4 | "Stop wasting hours on videos that will never work" | Founder confession, then "formula" claim, then his program as a speedrun | Problem letter |
| 5 | "0 to 150k in 6 months" + 5 stats | Prove he did it under hard conditions (new channel, crowded niche, 5 h/week) | Founder proof card |
| 6 | "Proven to work across any niche" + 6 cases | Each: niche label, "before" line, 3 view counts, follower result | Case cards |
| 7 | What you get (4 items) | Lessons, live calls, community, tools | Offer stack (no prices) |
| 8 | 4-week roadmap, 6 phases | Each phase: day range, name, pain line, outcome, and a count of videos live by day X | Roadmap |
| 9 | Implementation calls | Show the live layer | Mock call visual |
| 10 | Community wall | Social proof by niche + total views | Tile grid |
| 11 | Bonuses (6) | Each has a price struck to FREE | Bonus stack |
| 12 | Pricing "value stack" | Program lines, bonus lines, total value, then price **withheld**: "goes to the waitlist first" | Pricing (hidden) |
| 13 | "Still deciding? email ..." + FAQ "Before you join" (9 Qs) | Human fallback, objection handling | Contact + FAQ |
| 14 | Closing CTA + footer | | |

## 3. Conversion mechanics

- **CTA:** 7 or more placements: sticky header, hero, after cases, after roadmap, after community, pricing, closing, plus a fixed bottom bar. One wording ("Join the waitlist"). One action.
- **Form:** one field, email. Plus a hidden honeypot text field named `website`. No name, no niche, no qualifying question.
- **Qualification:** none by form. Done by FAQ ("too new or too advanced?", "never on camera?", "does it work for my niche?") and by case diversity (chef, gym designer, B2B sales).
- **Urgency:** scarcity is the closed door itself ("The waitlist hears first when doors reopen"). Earlier version: deadline countdown.
- **Proof types:** founder numbers, member names with follower counts, per-niche view-count tiles, "videos live by day N" milestones in the roadmap.
- **Risk reversal:** FAQ "Refunds?" is the last question. Answer text not verified.
- **Price:** the value stack shows every line price and the $11,225 total, but hides the actual price. Anchoring without committing.

## 4. Copy patterns

- Headline formula: `[Outcome] in [time box]`. Subline = format + what you leave with, counted ("your next 10 videos").
- Phases are written as `Days X to Y: [verb phrase]`, then a pain line ("what kills most channels is..."), then a measurable result with a day number.
- Bonuses: noun phrase name + what it removes ("Stop losing viewers in the first three seconds") + struck price.
- First person from the founder, short sentences, concrete numbers in nearly every paragraph. Quote: "Doors are closed".

## 5. Mobile (VERIFIED, 390 px)

- Fixed bottom CTA bar plus fixed top pill/header. Marquee keeps scrolling. One column.

## 6. Relevant to Arcbuildr (additions)

- Roadmap with a measurable result per phase ("X assets live by day N") fits a done-for-you build: swap video counts for deliverables by week.
- Waitlist or closed-door state is a legitimate high-ticket device when capacity is real: a one-field email form with a promise of first notice.
- Show a value stack without the final price if prices are not yet approved (still needs Zyade's approval; CLAUDE.md says no prices).
- Mixed-niche case set answers "does this work for me" without a long FAQ.
- A human fallback line ("Still deciding? Email ...") next to the FAQ lowers friction for a high-ticket buyer.

**Avoid:** invented "total value" numbers and fake FREE strikethroughs; a follower-count marquee we cannot fill honestly.
