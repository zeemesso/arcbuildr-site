# DESIGN.md

Task 3, 2026-10-25. Chosen with the hallmark skill under the working mode (no screenshots received, so Zyade corrects through Agentation in step 9).

## Direction

- Audience: business owners who find Arcbuildr on Instagram, mostly on a phone in the in-app browser.
- Job: one action, book an intro call. Tone: austere editorial. Plain, direct, nothing loud.
- Macrostructure: Long Document (one reading column, sections in order). Theme: custom, light paper, roman serif, warm accent.

## Tokens (`src/styles/tokens.css`, OKLCH)

| Token | Value | Use |
|-------|-------|-----|
| `--color-paper` | `oklch(97% 0.012 85)` | Page background |
| `--color-paper-2` | `oklch(94% 0.016 85)` | Footer, quiet panels |
| `--color-ink` | `oklch(22% 0.02 60)` | Text |
| `--color-ink-muted` | `oklch(42% 0.02 60)` | Small print |
| `--color-rule` | `oklch(84% 0.015 80)` | Dividers |
| `--color-accent` | `oklch(48% 0.14 38)` | The one button color (burnt sienna) |
| `--color-focus` | `oklch(40% 0.17 255)` | Focus ring, never animated |
| `--color-error` | `oklch(46% 0.17 28)` | Form errors (task 6) |

The accent appears on buttons only. Everything else is paper and ink.

## Type

- Display: Newsreader Variable, roman only, weight 500. Fluid size `--text-display` (2.5 to 4.75 rem).
- Body: Instrument Sans Variable, 16 px minimum, line height 1.6, measure 40 rem.
- Both fonts are self-hosted from npm (`@fontsource-variable/*`, Latin and other subsets as shipped by the package). No request to Google Fonts.

## Rules

- 4 pt spacing scale: `--space-2xs` to `--space-3xl`.
- Tap targets at least 44 px (`--tap`). Buttons, header link, footer links all meet it.
- Header: sticky, wordmark left, "Book a call" right, jumps to `#start`. No menu links. Hidden on `/thanks` with the `cta` prop.
- Footer: paper-2 band. Handles are as in the prototype; the email stays `[email]` until launch (#18).
- Motion: one 120 ms background fade on buttons. Reduced motion turns it and smooth scroll off.
- Preview builds show a small "Preview build" line in the footer. Main shows none.

## Verified (2026-10-25)

- Playwright at phone (412 px) and desktop (1280 px): axe reports no WCAG 2 A, AA or 2.2 AA violations; header stays at the top after scrolling; body text 16 px; every link at least 44 px tall.
