# Reference: aesthetory.com, the pricing section only

Captured 2026-11-23 with Playwright (Chromium) at 1440 x 900 and 390 x 844: computed styles and DOM geometry of the three plan cards, and one still of each width. The URL had no parameters. Mechanics only: no code, text, images or font files were taken, and the stills are not in this repo.

## 1. What it is

- Three plan cards side by side in one row, the middle one marked as the most chosen. The section sits on the page's dark ground with no heading of its own in view: the cards are the section.

## 2. Layout at 1440

- The row is a flex row, 996 px wide, centred, 20 px between cards, cards centred on the row's middle line.
- Each card is about 320 px wide. The two outer cards are 580 px tall; the middle one is 776 px, so it stands about 100 px above and below its neighbours.
- The outer cards are turned by about 0.3 degrees, away from the middle, as if the three were fanned. The middle card is straight.
- A card is two blocks split by a full-width hairline: the promise and what is included above, the price and the button below. The lower block is about a third of the card.

## 3. Inside a card, top to bottom

1. The tier's name: 20/22, weight 700, tracking -0.5 px.
2. The outcome in one sentence of about 10 words: 18/27, weight 400, at 60% of the text colour. It is the largest block of text on the card after the price.
3. A dashed hairline.
4. Three included things, each 16/21 in full text colour with a small ringed tick before it, about 22 px between items. Each is one sentence of 4 to 20 words.
5. The solid split line, then the price: the figure 40/48, weight 600, and its unit beside it at 33 px, weight 400, 70%. Centred.
6. One short note under the price, 16 px, centred.
7. One button, a full pill 56 px tall, centred, the card's width minus its padding.

## 4. How the middle card is marked

- A two-word flag at the top right of the card, above the tier's name: 15/18, weight 500, at 60%, with a small spark icon after it. It has no fill and no border: it is plain text.
- The card is taller (more room above and below its blocks) and its text is one step larger in the stills.
- Its button is the only filled one (the page's lightest colour, with an arrow). The outer cards' buttons are ghost pills in a dim fill. So the page has one loud button per row.

## 5. Phone (390)

- One card at a time. A row of three tabs above the card names the tiers, and the middle tier is open first. The card's inner order is the same.

## 6. What we take, in our own design

- Three cards in one row, a tier label on each, the flag on the middle one as plain text, the outcome first, then what is included, one button each, one filled button in the row.
- The middle card stands taller than its neighbours.
- A card in two parts split by a line: the label, the name, the outcome and the items above; the price, the smaller price line and the button below.
- On a phone, one card at a time under three tabs, the middle one open first. Ours are radio buttons, so they work without a script; a browser that cannot follow them stacks the three cards.
- What we leave: the tilt, the dark ground, the ringed ticks as icons.
