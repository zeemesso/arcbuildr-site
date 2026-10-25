# PROTOTYPE.md

Step 5 (ASCII prototype). Draft 1, 2026-10-24. Waiting for Zyade's review.

Structure only. No visual design yet: no colors, fonts or images are decided here. All text comes from `COPY.md`; where a frame is too narrow for a full line, it shows the start of the line and `...`.

## How to read this

- Mobile frames are 40 characters wide, about a 375 px phone screen. They are the main design. Most visitors arrive from the Instagram in-app browser.
- Desktop notes under each section say what changes at 1024 px and wider.
- `[ Button ]` is a button. `( field )` is a form input. `+` / `-` is a collapsed / open FAQ item.
- `#id` is the anchor for each section, so links like `/#start` work.

## Pages

```
arcbuildr.co
├── /          Home: the whole argument and the form
├── /thanks    After the form: book the call
└── /privacy   What we collect and why
```

Short links (from the approved funnel), each a redirect to `/` that adds a source tag the form saves to Notion:

| Link | Goes to | Used in |
|------|---------|---------|
| `/ig` | `/?src=ig` | Instagram bio |
| `/dm` | `/?src=dm` | Links sent in DMs |
| `/tt` | `/?src=tt` | TikTok bio |

---

## Home `/` (mobile)

### Header (sticky)

```
+----------------------------------------+
| Arcbuildr               [ Book a call ]|
+----------------------------------------+
```
- Wordmark links to `/`. Button jumps to `#start`.
- Stays at the top while scrolling, so the call to action is always one tap away.
- Desktop: same, wider. No menu links.

### 1. Hero `#top`

```
+----------------------------------------+
|                                        |
| We build your                          |
| personal brand from                    |
| your real story.                       |
|                                        |
| Arcbuildr is a personal brand service  |
| for business-driven people. We take    |
| your story and what you know, and      |
| build the brand and content that show  |
| it on Instagram, and on TikTok when it |
| fits you.                              |
|                                        |
| [       Book an intro call           ] |
| Free, 30 minutes. We'll tell you on    |
| the call if we're a fit.               |
|                                        |
+----------------------------------------+
```
- Headline, subhead, button and line under it all fit in the first screen on a 375 x 667 phone.
- Button is full width and jumps to `#start`.
- Desktop: headline larger, text column about 680 px wide, left aligned. Button keeps its text width instead of full width.

### 2. Who it's for `#for`

```
+----------------------------------------+
| For people who build businesses        |
|                                        |
| You run a business, or you're building |
| one. You know your field well. Your    |
| Instagram shows a small part of that,  |
| or none of it, because your time goes  |
| into the work.                         |
|                                        |
| We don't split clients by industry.    |
| Each brand starts from the person      |
| behind it, so two clients in the same  |
| field end up with different brands.    |
+----------------------------------------+
```
- Desktop: same single text column.

### 3. What we build `#build`

```
+----------------------------------------+
| What we build, in the order we build it|
|                                        |
| 1  Brand Strategy                      |
|    We start with your story and your   |
|    expertise. Together we decide who   |
|    you speak to, what you want to be   |
|    known for, and what you have to ... |
| -------------------------------------- |
| 2  Visual Identity System              |
|    Your colors, type and templates for |
|    posts and stories, so everything... |
| -------------------------------------- |
| 3  Profile Audit & Optimization        |
|    We go through your Instagram        |
|    profile as it is today and fix ...  |
| -------------------------------------- |
| 4  Content Strategy & Production       |
|    A content plan, a story sequence    |
|    system, suggested highlights, ...   |
| -------------------------------------- |
| 5  Ongoing Support                     |
|    We stay with you after we deliver.  |
|    When you have a question, you ...   |
+----------------------------------------+
```
- A numbered list with thin dividers. All five are open; nothing hides behind a tap.
- Number in a narrow left column, text beside it.
- Desktop: same list, number column wider. The heading can sit to the left of the list in a two-column split.

### 4. Who does what `#roles`

```
+----------------------------------------+
| Who does what                          |
|                                        |
| We build the strategy, the identity    |
| and the content, and hand it to you    |
| ready to post.                         |
|                                        |
| You publish it on your own account.    |
| We don't post for you. Your account    |
| stays yours, and the conversations     |
| with your audience stay with you.      |
|                                        |
| For some clients we also edit their    |
| videos. We'll tell you on the call     |
| whether that makes sense for you.      |
+----------------------------------------+
```
- Desktop: the first two paragraphs sit side by side as "We" and "You" columns. The video line runs under both.

### 5. Who we are `#us`

```
+----------------------------------------+
| Who we are                             |
|                                        |
| +------------------------------------+ |
| |                                    | |
| |      [Photo of you both]           | |
| |      placeholder until launch      | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| Arcbuildr is Zyade and Hanane. We      |
| started it on September 23, 2026, and  |
| you work with the two of us directly.  |
|                                        |
| We're new. That's why this page lays   |
| out every step of how we work. On the  |
| call, we open your profile together    |
| and show you what we'd build for it.   |
|                                        |
| Zyade   [one line, placeholder]        |
| Hanane  [one line, placeholder]        |
+----------------------------------------+
```
- Photo is 4:3, full width on mobile.
- Desktop: photo left, text right.

### 6. Questions `#questions`

```
+----------------------------------------+
| Questions                              |
|                                        |
| - How much does it cost?               |
|   It depends on how much content you   |
|   need. We'll give you a price after   |
|   the call, once we know what you need.|
| -------------------------------------- |
| + Do you post for me?                  |
| -------------------------------------- |
| + Do you edit videos?                  |
| -------------------------------------- |
| + Which platforms do you work on?      |
| -------------------------------------- |
| + Do you work with my industry?        |
| -------------------------------------- |
| + What do I need to give you?          |
| -------------------------------------- |
| + Can you guarantee followers or sales?|
| -------------------------------------- |
| + How long does it take?               |
+----------------------------------------+
```
- 8 items. Each opens and closes on tap. The first one starts open.
- Each question is a real button for keyboard and screen readers. Answers stay in the page HTML, so search engines and Ctrl+F find them.
- Desktop: same list, about 760 px wide.

### 7. Book the call `#start`

```
+----------------------------------------+
| Start with a call                      |
|                                        |
| Tell us about you and your business.   |
| On the next screen, you pick a time.   |
|                                        |
| Your name                              |
| (                                    ) |
|                                        |
| Email                                  |
| (                                    ) |
|                                        |
| Instagram handle                       |
| ( @                                  ) |
| So we can look at your profile before  |
| the call.                              |
|                                        |
| Your business                          |
| (                                    ) |
| One line is enough.                    |
|                                        |
| What should your personal brand do for |
| your business? (optional)              |
| (                                    ) |
| (                                    ) |
| A sentence or two.                     |
|                                        |
| [      Send and pick a time          ] |
| We use your details only to prepare    |
| for the call. Privacy                  |
|                                        |
| Prefer Instagram? Send us a DM at      |
| @arcbuildr.                            |
+----------------------------------------+
```
- Labels sit above fields. No placeholder-only labels.
- Mobile keyboards: `email` type for Email; no autocorrect or capitals on the Instagram handle.
- Hidden, not shown: source tag (from `?src=`), page referrer, time sent, and an empty spam-trap field.
- "Privacy" links to `/privacy`. "@arcbuildr" links to the Instagram profile.
- Desktop: two columns. Heading and intro text on the left, form on the right.

Form states:

```
Error (shown under the field, on submit)
| Email                                  |
| ( hanane@gmail                       ) |
| ! Check your email address. It needs   |
|   a full domain, like name@gmail.com.  |

Sending
| [      Sending...                    ] |   button disabled, no double submit

Server failed (Notion or network down)
| ! We couldn't send your details. Try   |
|   again, or DM us at @arcbuildr.       |
|   What you typed is still here.        |
```
- On success, the browser goes to `/thanks` with name and email passed along, so the booking calendar is prefilled.
- The three state messages above are new copy, written in the same voice. They need your OK with the prototype.

### Footer

```
+----------------------------------------+
| Arcbuildr. Personal brand service.     |
|                                        |
| Instagram @arcbuildr                   |
| TikTok @arcbuildr                      |
| [email]                                |
| Privacy                                |
|                                        |
| © 2026 Arcbuildr                       |
+----------------------------------------+
```
- Handles and email stay placeholders until launch (#18).
- Desktop: one row, links on the right.

---

## Thanks `/thanks` (mobile)

```
+----------------------------------------+
| Arcbuildr                              |
+----------------------------------------+
|                                        |
| Thanks. We've got your details.        |
|                                        |
| Pick a time for your call below. We'll |
| look at your profile before we talk.   |
|                                        |
| +------------------------------------+ |
| |                                    | |
| |      Cal.com booking calendar      | |
| |      name and email prefilled      | |
| |                                    | |
| |      (scrolls inside the page,     | |
| |       no inner scroll box)         | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| If no time works, email us at [email]  |
| or send a DM to @arcbuildr on          |
| Instagram.                             |
|                                        |
+----------------------------------------+
| footer (same as home)                  |
+----------------------------------------+
```
- Header has the wordmark only. No "Book a call" button: the visitor is already booking.
- If the calendar fails to load, the fallback line under it is still there.
- A direct visit with no name or email still works; the calendar just isn't prefilled.
- Not indexed by search engines.
- Desktop: calendar about 760 px wide, centered.

---

## Privacy `/privacy` (mobile)

```
+----------------------------------------+
| Arcbuildr               [ Book a call ]|
+----------------------------------------+
|                                        |
| Privacy                                |
| Last updated: [date]                   |
|                                        |
| Who we are                             |
| ...                                    |
|                                        |
| What we collect                        |
| ...                                    |
|                                        |
| Why we collect it                      |
| ...                                    |
|                                        |
| Who else sees it                       |
| ...                                    |
|                                        |
| How long we keep it, and how to ask    |
| us to delete it                        |
| ...                                    |
|                                        |
+----------------------------------------+
| footer (same as home)                  |
+----------------------------------------+
```
- Plain text page, five sections from the `COPY.md` outline.
- The tools are now known, so "Who else sees it" names them: Cloudflare (hosting, cookieless analytics), Notion (stores form details), Resend (sends us the new-lead email), Cal.com (booking).
- Full text gets written in the build and needs a legal check before launch.
- Desktop: text column about 680 px.

---

## Across all pages

- No cookie banner (no pixel and cookieless analytics, per the approved stack).
- Agentation toolbar appears on non-main branch previews only, bottom right. Never on the live site.
- Tap targets at least 44 px tall. Body text at least 16 px, so iPhone doesn't zoom into form fields.

---

# Hub (draft 2, 2026-10-26)

Zyade, 2026-10-26: arcbuildr.co is the hub that sells Arcbuildr, and the build is not limited by the approved text. New pages use `COPY.md` lines where they exist. Anything else is a visible `[Placeholder: …]` for Zyade to write. No invented claims, results, prices or client names.

```
arcbuildr.co
├── /              Home: the whole argument and the form (built)
├── /method        How we build: the five deliverables in order, in depth
├── /about         Zyade and Hanane, why Arcbuildr exists, how we work
├── /notes         Notes: short posts on personal brands, the proof we can show before client proof
│   └── /notes/<slug>
├── /thanks        (built)
└── /privacy       (built)
```

Left out on purpose: a work or case-study page (no client proof is approved), a link-in-bio page (the bio link goes straight to Home via `/ig`), and a standalone form page (the form stays at `/#start`).

Every new page ends with the same call band linking to `/#start`. The short links do not change.

## Header (all pages)

```
mobile                                    desktop
+----------------------------------------+  +--------------------------------------------------------+
| (arc) arcbuildr               [ Menu ] |  | (arc) arcbuildr   Method  Notes  About  [ Book a call ]|
+----------------------------------------+  +--------------------------------------------------------+
         ... page ...
      [   Book a call   ]   <- bottom dock, as built
```
- Mobile "Menu" opens a sheet (HTML `popover`, no JavaScript): Method, Notes, About, then Book a call. Esc or a tap outside closes it.
- The current page's link is marked `aria-current="page"`.

## Method `/method` (mobile)

```
+----------------------------------------+
| HOW WE BUILD                           |
| Five builds,                           |
| in order.                    <- .hl    |
| [Placeholder: one-line lede]           |
| [     Book an intro call     ]         |
+----------------------------------------+
| 01  (art)  Brand Strategy              |
| <COPY.md line for the deliverable>     |
| What you give us                       |
|  - [Placeholder]                       |
| What you get                           |
|  - [Placeholder]                       |
+----------------------------------------+
| 02 ... 05, same card, own hue and art  |
+----------------------------------------+
| What we don't do                       |
|  - We don't publish for you.           |
|  - No LinkedIn, no YouTube.            |
+----------------------------------------+
| Call band  [ Book an intro call ]      |
+----------------------------------------+
```
- The five deliverables come from one shared data file, used by Home's bento and this page, so names and lines never drift.
- Cards stack with a vertical line joining the numbers (the order matters). Desktop: number and art on the left, text on the right.
- The hero button has `.hero__action`, so the dock hides while it is on screen.

## About `/about` (mobile)

```
+----------------------------------------+
| ABOUT                                  |
| Two founders,                          |
| one method.                  <- .hl    |
| Founded September 23, 2026.            |
+----------------------------------------+
| [photo]  Zyade     [Placeholder: role] |
|          [Placeholder: one line]       |
| [photo]  Hanane    [Placeholder: role] |
|          [Placeholder: one line]       |
+----------------------------------------+
| Why Arcbuildr                          |
| [Placeholder: the story, 2-3 lines]    |
+----------------------------------------+
| How we work (3 cards)                  |
|  Your real story / No niche template / |
|  We stay after delivery                |
+----------------------------------------+
| Call band                              |
+----------------------------------------+
```
- The three principles are the brief's differentiators, so they are not placeholders.

## Notes `/notes` and `/notes/<slug>` (mobile)

```
/notes                                  /notes/<slug>
+--------------------------------------+ +--------------------------------------+
| NOTES                                | | Oct 26, 2026 · 3 min read            |
| [Placeholder: h1]                    | | <note title>                         |
| [Placeholder: lede]                  | | <summary>                            |
+--------------------------------------+ +--------------------------------------+
| Oct 26, 2026 · 3 min                 | | <body, 38 rem measure>               |
| <note title>                         | | ...                                  |
| <one-line summary>             ->    | +--------------------------------------+
+--------------------------------------+ | Call band                            |
| ... newest first                     | +--------------------------------------+
+--------------------------------------+
```
- Notes are Markdown files in `src/content/notes/` (`title`, `summary`, `date`, `draft`). Drafts show on previews and are left out of the main build, so placeholder notes never go live.
- Notes are in the sitemap; drafts are not.
