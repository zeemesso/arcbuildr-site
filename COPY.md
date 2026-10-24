# COPY.md

Step 2 (Copy). Draft 1, 2026-10-24. Waiting for Zyade's review.

Sources: Zyade's brief (see `.agents/product-marketing.md`). Skills used: product-marketing, site-architecture, copywriting, marketing-psychology, cro, humanizer.

Diagnosis (copywriting skill): situation A. Blank brief, no existing copy. Angle is open; facts come only from the brief.

## [ASSUMED] items

Everything the brief does not cover. Each tag in the copy points to a number below. Confirm, change or cut each one.

1. **Main call to action.** Book an intro call. The visitor fills a short form, then picks a time.
2. **The call.** Free, 30 minutes, and we say on the call whether we're a fit.
3. **Traffic sources.** Instagram bio link, links we send in DMs, TikTok bio link, direct links. Most visitors are on a phone and have seen at least one of our posts.
4. **The visitor's problem.** They know their field, and their Instagram shows little of it because they've been busy doing the work.
5. **Build order.** Strategy, then identity, then profile, then content, then support.
6. **What three deliverables include.** The details under Brand Strategy, Visual Identity System and Profile Audit & Optimization. The brief names them but doesn't describe them.
7. **Why the client posts.** Their account stays theirs, and they stay in the conversation with their audience.
8. **Working with both founders.** The client works with Zyade and Hanane directly.
9. **Proof.** With no approved client proof, the page says we're new, shows the full process, and offers to look at the visitor's profile together on the call.
10. **Founder details.** One line on each of you, and a photo of you both. Placeholders below.
11. **Price answer.** We give a price after the call.
12. **What the client brings.** A few conversations about their story and work, and their current profile.
13. **No guarantees.** We don't promise follower or sales numbers.
14. **Timeline answer.** We give a timeline on the call.
15. **Form fields.** Name, email, Instagram handle, business, and one optional question.
16. **Thanks page.** After the form, a page with the booking calendar.
17. **Data use and privacy.** The line under the form and the privacy page contents. Final wording depends on the tools picked in step 4.
18. **Handles and email.** @arcbuildr on Instagram and TikTok, and an email address. Placeholders.
19. **Page list.** One selling page, plus a thanks page and a privacy page. No menu links in the header.

## Page list (site-architecture)

The fewest pages that sell: one. Everything that sells is on the home page. The two other pages exist because the form needs somewhere to land, and the form and any tracking need a privacy page. [ASSUMED 19]

```
arcbuildr.co
├── Home (/)           sells: the whole argument, the form
├── Thanks (/thanks)   after the form: pick a call time
└── Privacy (/privacy) required by the form and any tracking
```

| Page | URL | Reached from | Purpose |
|------|-----|--------------|---------|
| Home | `/` | Instagram bio, DMs, TikTok bio, direct links [ASSUMED 3] | Explain the service and get the visitor to send the form |
| Thanks | `/thanks` | Form submit only | Book the call, confirm next step [ASSUMED 16] |
| Privacy | `/privacy` | Footer, link under the form | Say what we collect and why [ASSUMED 17] |

Navigation:
- Header: wordmark (links to `/`) and one button, "Book a call", which jumps to the form. No other links, so the page has one path.
- Footer: Instagram, TikTok, email, Privacy.

The section order on the home page follows the argument below. Step 5 (ASCII prototype) will shape the layout around it.

---

## Home (`/`)

**Page title:** Arcbuildr | Personal brand service for business-driven people
**Meta description:** We build your personal brand and Instagram content from your real story and expertise. Brand strategy, visual identity, profile audit, content and ongoing support.

### Header

Arcbuildr · [Book a call] [ASSUMED 1]

### 1. Hero

**Headline:** We build your personal brand from your real story.

**Subhead:** Arcbuildr is a personal brand service for business-driven people. We take your story and what you know, and build the brand and content that show it on Instagram, and on TikTok when it fits you.

**Button:** Book an intro call [ASSUMED 1]

**Under the button:** Free, 30 minutes. We'll tell you on the call if we're a fit. [ASSUMED 2]

Alternatives:
- Headline B: "Your story and your expertise, built into a brand people remember." Rationale: puts the client first, but "remember" is a softer promise.
- Headline C: "Personal brands for business-driven people, built from who you are." Rationale: names the audience in the headline, at the cost of a flatter line.
- Button B: "Apply for an intro call." Rationale: signals we choose clients, which fits "business-driven people only". Adds friction.
- Button C: "Send us a DM." Rationale: lowest effort for Instagram traffic, but we lose the form details and the tracking.

### 2. Who it's for

**Heading:** For people who build businesses

**Body:**
You run a business, or you're building one. You know your field well. Your Instagram shows a small part of that, or none of it, because your time goes into the work. [ASSUMED 4]

We don't split clients by industry. Each brand starts from the person behind it, so two clients in the same field end up with different brands.

### 3. What we build

**Heading:** What we build, in the order we build it [ASSUMED 5]

**1. Brand Strategy**
We start with your story and your expertise. Together we decide who you speak to, what you want to be known for, and what you have to say about it. [ASSUMED 6]

**2. Visual Identity System**
Your colors, type and templates for posts and stories, so everything you publish looks like it comes from the same person. [ASSUMED 6]

**3. Profile Audit & Optimization**
We go through your Instagram profile as it is today and fix what gets in the way: your name field, bio, link and pinned posts. [ASSUMED 6]

**4. Content Strategy & Production**
A content plan, a story sequence system, suggested highlights, carousels and short-form pieces. We choose the format for each piece based on what it has to say.

**5. Ongoing Support**
We stay with you after we deliver. When you have a question, you get an answer. When something needs to change, we revise it.

### 4. Who does what

**Heading:** Who does what

**Body:**
We build the strategy, the identity and the content, and hand it to you ready to post.

You publish it on your own account. We don't post for you. Your account stays yours, and the conversations with your audience stay with you. [ASSUMED 7]

For some clients we also edit their videos. We'll tell you on the call whether that makes sense for you.

### 5. Who we are

**Heading:** Who we are

**Body:**
Arcbuildr is Zyade and Hanane. We started it on September 23, 2026, and you work with the two of us directly. [ASSUMED 8]

We're new. That's why this page lays out every step of how we work. On the call, we open your profile together and show you what we'd build for it. [ASSUMED 9]

[Zyade: one line on who you are and what you do in Arcbuildr.] [ASSUMED 10]
[Hanane: one line on who she is and what she does in Arcbuildr.] [ASSUMED 10]
[Photo of you both.] [ASSUMED 10]

### 6. Questions

**Heading:** Questions

**How much does it cost?**
It depends on how much content you need. We'll give you a price after the call, once we know what you need. [ASSUMED 11]

**Do you post for me?**
No. We hand you everything ready to post, and you publish it on your account.

**Do you edit videos?**
For some clients, yes. It depends on you and the content. We'll tell you on the call.

**Which platforms do you work on?**
Instagram first. TikTok for some clients, when it fits who you are and who you want to reach. We don't work on LinkedIn or YouTube.

**Do you work with my industry?**
We work with business-driven people in any field. The work starts from you, whatever your industry.

**What do I need to give you?**
Time for a few conversations about your story and your work, and your current profile. You don't need anything ready before the call. [ASSUMED 12]

**Can you guarantee followers or sales?**
No. We agree on the work up front, deliver it, and stay with you after. Followers and sales also depend on how often you post and what you do with the content. [ASSUMED 13]

**How long does it take?**
It depends on how much content we're making. You'll get a timeline on the call. [ASSUMED 14]

### 7. Book the call

**Heading:** Start with a call

**Body:** Tell us about you and your business. On the next screen, you pick a time. [ASSUMED 16]

**Form** [ASSUMED 15]

| Field | Required | Helper text | Why we ask |
|-------|----------|-------------|------------|
| Your name | Yes | | So we know who we're talking to |
| Email | Yes | | To confirm the call |
| Instagram handle | Yes | So we can look at your profile before the call. | We prepare by reading the profile |
| Your business | Yes | One line is enough. | Shows whether you're business-driven |
| What should your personal brand do for your business? | No | A sentence or two. | Gives the call a starting point |

**Button:** Send and pick a time [ASSUMED 16]

**Under the button:** We use your details only to prepare for the call. [Privacy] [ASSUMED 17]

**Below the form:** Prefer Instagram? Send us a DM at @arcbuildr. [ASSUMED 18]

### Footer

Arcbuildr. Personal brand service.
Instagram @arcbuildr · TikTok @arcbuildr · [email] · Privacy [ASSUMED 18]
© 2026 Arcbuildr

---

## Thanks (`/thanks`) [ASSUMED 16]

**Page title:** Pick a time | Arcbuildr

**Headline:** Thanks. We've got your details.

**Body:** Pick a time for your call below. We'll look at your profile before we talk.

[Booking calendar]

**Below the calendar:** If no time works, email us at [email] or send a DM to @arcbuildr on Instagram. [ASSUMED 18]

---

## Privacy (`/privacy`) [ASSUMED 17]

Outline only. The full text waits for step 4, because it has to name the tools we pick (form, booking, analytics, pixel). It needs a legal check before launch.

**Headline:** Privacy

Sections:
1. Who we are: Arcbuildr, run by Zyade and Hanane, and how to contact us.
2. What we collect: what you type in the form, and what the booking tool and any analytics or pixel record.
3. Why: to prepare for and hold the call, and to measure the site.
4. Who else sees it: the tools named in step 4.
5. How long we keep it, and how to ask us to delete it.

---

## Notes for review

Psychology and CRO choices behind the draft (marketing-psychology, cro):
1. **One action.** One button, repeated in the header, the hero and the form, and no menu links. Fewer choices, fewer exits (Hick's Law).
2. **Honest about being new.** With no approved proof, the page admits it and shows the full process instead. A plainly stated weakness tends to raise trust (Pratfall Effect). [ASSUMED 9]
3. **Who does what.** "Do you post for me?" is likely the first question from someone who expects an agency, so it gets its own section as well as an FAQ entry.
4. **Small form.** Four required fields, each with a reason. The Instagram handle lets us prepare, which also makes the call worth more to the visitor.
5. **No prices on the page.** The price question is answered directly, without a number, so it doesn't read as hiding.

Humanizer pass: checked for contrast reveals, negation lists, one-line closers, forced triads, staged openers, sales words and dashes. Each "don't" in the copy answers a question a visitor would ask.
