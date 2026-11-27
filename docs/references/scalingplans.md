# Reference: scalingplans.com (AI lead magnet page)

Captured 2026-11-27 with Playwright (Chromium, 1532x784 and 390x844). The URL had no parameters. I measured geometry, computed styles and the page's parts. The form was not opened past its first screen and nothing was submitted. Mechanics only: no code, text or images were taken.

## 1. What it is

- One long page for one free offer: a custom plan written by a model from the visitor's answers. 9 bands, about 9,500 px on desktop and 14,000 px on a phone.
- Zyade named it on 2026-11-27 as the example of how an AI lead magnet looks to the visitor. The logic behind our version is the magnet engine (`MAGNET-PLAN.md`).

## 2. Order of the page

1. **Hero.** Logo left, one small pill button right (not sticky). Pill eyebrow with a status dot. Headline (18 words, two lines). One sentence under it (30 words). The video. One button. One line of reassurance under the button (8 words: time, no call, free).
2. **The form.** Heading (7 words). A bordered note that tells the visitor how to answer (about 110 words, with one bad answer and one good answer side by side). Then the form itself in a frame. One caption line.
3. **What you get.** A looping, muted, square clip of the deliverable on one side; 6 titled points on the other.
4. **How it works.** A vertical timeline, 6 steps, each a small card on a line with a node. Button.
5. **What the model was trained on.** 4 number tiles, then 5 short cards. Button.
6. **Versus.** 2 columns: a generic answer against this one.
7. **Who is behind it.** Photo and short bio. Button.
8. **Questions.** 6 collapsed items, about 540 words in all.
9. **Last call.** Heading, one sentence, button.

Every button on the page goes to the same place: the form band (`#apply`). There is no second action anywhere. 5 buttons after the hero, one per band or every second band.

## 3. The video

- A hosted player (Wistia) in a 16:9 frame, 585 px wide on desktop, 335 px on a phone. 2 min 41 s. Starts muted with an "unmute" control on top; captions are burnt into the picture.
- It sits above the button, inside the first screen: on a 784 px tall window the button is still visible under it.
- Behind the frame, 4 tilted pictures of pages of the deliverable fan out left and right (2 on a phone). They show what the visitor will get before any word explains it.

## 4. The form

- It is an embedded third-party form (Typeform, live embed) in a frame about 830x560 px, not a native form. One question per screen.
- It sits in the second band, right after the hero, not at the bottom. The page under it is for people who are not convinced yet; each of its buttons brings them back up.
- The note above it sets the standard for answers before the first question: it says the result depends on the detail given, and shows a vague answer against a specific one.
- What happens after the last question (confirmation page, delivery by email or on screen) was not observed.

## 5. Look

- **Colour logic.** Black page, white text at full strength, one accent (a light green) used for: the status dot, the hero glow, thin borders at 16 to 20% strength, the button's glow. Surfaces are two near-black greys. No second colour.
- **Type.** One sans family for everything, weight 400 even in headings. A serif italic is used for 3 or 4 words inside a heading, as the only emphasis. Sizes: headline 36.8 px (25.6 on a phone), band headings 32 px, lead sentence 18 px, body 16 px, small lines 13.5 px.
- **Layout.** Max width 1180 px. Text column in the hero and form bands about 830 px, centred. Band padding 96 px top and bottom (36 px on a phone).
- **Shapes.** Buttons are full pills, 58 px tall, 16 px text, weight 600, light fill on the dark page, with a soft coloured glow under them. Cards have a 14 px radius and a 1 px border.
- **Background.** A faint grid, a soft beam of the accent colour from the top centre, and a vignette. Alternate bands mirror the background (`band--r`).
- **Motion.** Headings and blocks get a class when they enter the window (a reveal). The clip of the deliverable loops by itself. Nothing else moves.

## 6. Phone

- Same order, one column. No horizontal scroll.
- The eyebrow switches to a shorter text. The header button stays.
- The video is the full column width (335 px) and the button is still on the first screen at 844 px tall.
- The form frame keeps its height (529 px) at 309 px wide.

## 7. What we take

- The order: video, then the form in the second band, then the proof for people who scroll.
- One action for the whole page.
- The note that teaches the visitor how to answer, placed right above the first question. Our writer model's result depends on the same thing.
- Pages of the deliverable shown around the video.

## 8. What we do differently

- Our form is native (`MagnetForm.astro`), one question per screen, so the answers go straight to our own database and no third party holds them.
- Our look is Arcbuildr's own tokens, not this page's black and green.
- We show what happens after the form (the result page and the email) and say so before the first question.
