# Reference: ryansterling.com

Captured 2026-11-02 with Playwright (the site is a JS single-page app; WebFetch returns only the title). Mechanics only. No text or assets copied. One-line visual note: plain, light, utilitarian layout.

## 1. Pages visited

- `https://www.ryansterling.com/` (home = coaching waitlist page)
- `https://www.ryansterling.com/breakthrough` (retired free course; redirect-style notice)
- `https://www.ryansterling.com/content-compass` (the only live product page)
- `https://www.ryansterling.com/sign-in` (linked, not opened: login, out of scope)
- Probed `/waitlist`, `/coaching`, `/courses`, `/products`, `/sitemap.xml`: all return the same app shell (catch-all), so no further pages found. **UNVERIFIED** that none exist behind sign-in.

The home page links only to two things: "Free Course" and "Sign In". There is no product menu.

## 2. Page-by-page section map

### `/` (home): 1:1 coaching, closed, waitlist

1. Top bar: "Free Course" link + "Sign In" (text links only, no CTA button).
2. Offer title "1:1 Content Coaching" with the **price shown: $2,000/month**.
3. Status line: "not accepting new clients right now", then "join the waitlist below".
4. How it works: 3 ticks (send link on WhatsApp after each post; get a voice note with feedback; improve each post). Purpose: make the service concrete and low-ceremony.
5. One paragraph of belief ("months of posting and hoping" versus "real skill").
6. Waitlist application form (see section 3).
- No testimonials, no logos, no FAQ, no footer proof. Page is about one screen tall.

### `/breakthrough`: dead-end rerouter

- Notice that the course is retired, then one card pointing to the newer product with one link. Purpose: keep old links alive and funnel to the current product.

### `/content-compass`: digital product page (about 7,300 px tall)

1. Fixed header: product name left, "Get Access" right (always visible, also on mobile).
2. Hero: claim ("a few small tweaks can 10x your views"), 2-sentence mechanism, price block `$79` struck to `$37` with label "Launch Price", CTA "Get Access Now".
3. "Scroll to see how it works" cue + 45-second demo video.
4. 3-step mechanism (voice-dictate, AI reframes, auto-saves to Notion).
5. Pain/empathy block ("you have ideas all day, then they're gone") and the "what if" turn.
6. What's included: 4 items (template, audience profile, setup guide of 4 videos, AI prompts), each with a one-line job.
7. "Get set up in minutes": 4 numbered video steps.
8. FAQ: 11 accordion items (see below).
9. Repeat price block + CTA, with the micro-line "Instant access after purchase".

## 3. Conversion mechanics

- **CTA wording:** "Get Access" (header) / "Get Access Now" (hero, close). 3 placements on the product page, all to one checkout. Coaching: "Join Waitlist" only.
- **Qualification (coaching):** the form is the filter. Fields: Name, Email, Instagram handle (all required); "Who do you create content for, and what problem does it solve for them?" (long answer); "How often are you currently posting?" (dropdown: daily+, few a week, weekly, less, not posting); "What are you struggling with?" (long answer). Six fields. Free text lets him screen for a clear audience and real posting rhythm.
- **Product page:** no gate. FAQ qualifies by cost and skill ("paid AI accounts?", "technical skills?", "starting with no audience?").
- **Price:** shown in both offers. Coaching $2,000/month (anchor, closed). Product $79 struck to $37 ("Launch Price").
- **Urgency:** only the "Launch Price" label; no countdown, no cap. Scarcity on coaching is real: closed intake.
- **Proof:** none on either page (no testimonials, no numbers). The page relies on a demo video and clarity.
- **Risk reversal:** none. FAQ states no refunds because the product is digital. Honest, but the opposite of reassurance.
- **Cross-sell logic:** retired product to current product; closed premium offer to waitlist; free course removed. A visible ladder: free, then low-price product, then premium coaching.
- **FAQ topics (11):** how is it different from using AI alone; paid AI accounts; paid Notion; technical skills; no audience; format; mobile; setup time; subscription; updates; refunds. Answers are short and literal, include costs of third-party tools.

## 4. Copy patterns

- Headline formula (product): a small action producing a large multiple. Sentences are short, second person, almost no adjectives.
- Process before outcome: the product page explains the mechanism in 3 steps before listing contents. Contents are named by what they are ("Notion Template", "Audience Profile"), each with one line on the job it does.
- The offer is named with a plain compound noun ("The Content Compass"); parts are plain nouns, no brand-coined names.
- Coaching copy states the exact delivery channel and rhythm (WhatsApp, voice note, every post). Concrete cadence replaces adjectives.
- Quote (under 15 words): "I'm not accepting new clients right now."

## 5. Mobile (VERIFIED at 390 px)

- Product page: the only fixed element is the top header with "Get Access", so the CTA is permanently reachable. No sticky bottom bar. Accordion FAQ. Home: single column form.

## 6. Relevant to Arcbuildr

- Show a "how it works" in 3 ticks with a concrete channel and cadence. Fits Arcbuildr's ongoing support (WhatsApp or voice-note review).
- A waitlist or application form with open-text questions ("who do you create for, what problem does it solve") screens high-ticket buyers better than name and email alone. Add one posting-rhythm dropdown.
- Closed-capacity state with a form keeps the page alive when the team is full; stating that you are not taking clients raises perceived value.
- For the future digital product: a mechanism in 3 steps, "what's included" with one-line jobs, a setup-time FAQ, a mobile-works answer, and a plain "instant access" micro-line. A fixed header CTA works on phones.
- Retired-page rerouter: keep one page that redirects dead offers to the live one.
- FAQ about the buyer's real costs (tools, subscriptions) removes late surprises.

**Avoid:** zero proof (he relies on an existing audience; a new brand cannot). A no-refund line with no reassurance. Showing a price on the premium page only works if Zyade approves prices (CLAUDE.md: no prices).
