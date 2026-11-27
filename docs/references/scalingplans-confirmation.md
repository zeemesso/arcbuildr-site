# Reference: the confirmation page after an AI lead magnet form

Captured 2026-11-27 with Playwright (Chromium, 1532x784 and 390x844). The page is on `jeremyhaynestraining.com`; the URL had no parameters. It is the page a visitor lands on after the form of the scalingplans.com magnet (see `scalingplans.md`). I measured geometry, computed styles and the page's parts, and watched the bar for about 75 seconds. The video was not played. Mechanics only: no code, text or images were taken.

## 1. What it is

- One short page with one job: keep the visitor busy and calm while the plan is written, and get them to watch a video. 1,465 px tall on desktop, 1,520 px on a phone. About 190 words in all.
- No header, no menu, no footer, no button. One link in the text (back to the form).
- Built on a funnel builder (LeadConnector); the video is a hosted player (Wistia).

## 2. Order of the page

1. **The progress block**, at the very top.
2. **A small heading and one long paragraph** for people who do not see the email (about 160 words).
3. **A large heading** that tells the visitor to watch the video while they wait (14 words, capitals).
4. **The video**, 16:9, in a white card.

## 3. The progress block

- 920 px wide, centred, 79 px tall. Two rows.
- **Top row.** Left: a 12 px dot that pulses (1.8 s loop) and a label that says the plan is being generated (22 px, in the accent green). Right: a status line that names the current stage (26 px, muted brown) and a percentage (18 px, green).
- **Bottom row.** A pill track, 34 px tall, white, with the fill inset by 7 px. The fill is 20 px tall, a vertical green gradient, with a light band that sweeps across it (1.8 s loop). Its width changes with a 0.25 s linear transition.
- **Pace.** About 13% after 25 seconds, 17% after 65 seconds, 18% after 75 seconds: quick at the start, then slow. The text below says the plan takes 10 to 12 minutes. The bar looks timed to that wait, not tied to the real job [inferred: the page showed the same pace with no form submitted].
- **End state.** A hidden block replaces the bar when it finishes: a check icon, a bold line that says to check the email, and a small line that it can take a few minutes to arrive.

## 4. The text under the bar

- Small heading (16 px, weight 500) aimed at people who do not see the email.
- One paragraph, 20 px. It does three things: says how the plan is made and that this is why it is slow (10 to 12 minutes); says where to look if the email is missing (promotions, spam, search for the sender's address); gives a support address.
- It contains the page's only link, back to the form.

## 5. The video

- Heading 48 px, weight 700, all capitals, centred (24 px on a phone).
- Player 1,134x638 px on desktop, inside a white card with a 14 px radius. 339x191 px on a phone.
- On desktop the player starts at 774 px, so it is below the first screen (784 px tall). On a phone it starts at 1,281 px: the long paragraph (810 px tall there) comes first.

## 6. Look

- White page, black text, one green for the bar, the dot, the percentage and the link.
- Text column about 1,120 px wide on desktop. No images besides the video.

## 7. Phone

- Same order, one column, no horizontal scroll.
- The progress block is 284 px wide. The status line wraps to two lines (21 px) and moves under the label.

## 8. What we take

- A progress bar at the top that names stages in words, with a percentage.
- "Watch this while you wait" as the single thing to do on the page.
- The reassurance text: how long it takes, where to look for the email, who to write to.
- A clear end state: check your email.

## 9. What we do differently

- Our bar reads the real state of the job (queued, screened, written, sent) from the engine, so it never shows 100% for a plan that was not written.
- The video sits right under the bar on every screen size. The "can't find the email" text goes under the video, collapsed on a phone.
- People who are screened out get an honest end state: no plan was written and why. The form page says before the first question that only serious answers get a plan (Zyade's rule of 2026-11-27).
- Our look is Arcbuildr's own tokens.
