# Reference: attentioncompound.com

Captured 2026-11-05 with REA (`capture_browser_scenario`, Chrome, 1440x900 and 390x844: accessibility tree, screenshots, network) and the built-in browser for computed styles and the embed config. URL stripped of `utm_*` and `fbclid`. Mechanics only. Nothing was booked.

## 1. What it is

- One-page agency site (Webflow, Lenis smooth scroll) for "media growth" for finance and AI companies. Linked from their Instagram bio.
- About 9,500 px tall on desktop. Dark page (`#040404`) with cream sections (`#FFF8E7`) alternating for rhythm.

## 2. Section map (desktop, top in px)

1. **Header** (fixed): logo tile left, nav pill right with 4 anchor links (Case Studies, Work, System, Testimonials). Active link turns accent gold. No header CTA.
2. **Hero** (0, 1016 tall): small pill eyebrow ("Scale organically"), two-line H1 where line two switches to an italic serif, one-line subhead, two buttons: ghost "See How It Works" (to the system section) and filled gold "Book a Call" (to `#cal-embed`). Large soft ring shapes and a few outline icons as decoration.
3. **Logo strip** (1016): "Trusted by", a row of square tiles (faces and logos), marquee.
4. **Case studies** (1234, cream): heading with one italic serif phrase; 3 dark cards. Each card opens with a gold uppercase metric pill ("100M+ views on short-form"), 2 to 4 lines of story, then avatar + client name.
5. **System** (2905, dark): pill "Our system", heading with an italic serif half, two short paragraphs left; a "distribution flywheel" diagram right (concentric rings, platform icons orbiting).
6. **Testimonials** (4160, cream): pill, a marquee of dark quote cards.
7. **Work** (4605) and **Podcast trailers** (5295): rows of 4 embedded vertical videos (Gumlet/Wistia iframes).
8. **Services** (5974): tabs by audience ("For Finance Companies" / "For AI Companies"); each panel: package name, who it's for, checklist of what's included (with volume, e.g. videos per month), outcome line, "Book a Call". No prices.
9. **CTA band** (7482): one line of value, one line of promise, "Book a Discovery Call".
10. **Get in Touch** (8013): see section 3.
11. **Footer**: legal entity and address, email, phone, 4 anchor links, 3 socials, legal pages.

## 3. The Get in Touch section (the part Zyade wants)

- Structure, centered: gold pill eyebrow "Get in Touch", H2 "Let's have a conversation", then the booking calendar directly on the page. No form, no intro paragraph, no extra step.
- Every "Book a Call" on the page is an anchor to this section (`#cal-embed`), so booking happens without leaving the page.
- Calendar: Cal.com **inline** embed, `layout: "month_view"`, `useSlotsViewOnSmallScreen: "true"`, `hideEventTypeDetails: false`.
  - Desktop: one white card about 1040 px wide, 3 columns: event details (host, title, 3 to 6 lines on what the call is for, length, video tool, time zone), month grid with available days filled, time slots list with a 12h/24h switch.
  - Phone (390 px): the same card stacks: event details, then the month, then the slots.
- Event copy pattern: what the call covers ("roadblocks and goals", "explain our process", "see if we are a good fit") in plain words. 20 minutes, Zoom.
- Pill style: 10 px, weight 700, uppercase, letter-spacing 2 px, padding 4 px 16 px, fully rounded, accent text on the accent at 30% opacity.

## 4. Type, color, spacing

- One sans (Manrope, 500 body, 14 px base) plus an italic display serif for one phrase per heading.
- H1 64 px desktop / 40 px phone, letter-spacing -1 px. Muted body text `#999` on dark.
- Accent: gold `#F1CA6D` for the filled button, pills and active nav. Buttons fully rounded, padding 10 px 32 px.
- Cards: dark gradient, 16 px radius, thin border.

## 5. Conversion mechanics

- One action across the whole page ("Book a Call"), repeated in the hero, the services and the CTA band, always pointing to the inline calendar.
- Proof first: logos right after the hero, then 3 metric-led case studies before any explanation of the method.
- Qualification lives in the booking itself (the event description says the call checks fit). No form fields before booking.

## 6. What Arcbuildr takes

- **Taken (2026-11-05):** the Get in Touch layout. `#start` is now a centered pill + heading + Cal.com inline month view, with the same embed settings. Every "Book a call" already points to `#start`.
- **Kept from our side:** the lead form, collapsed under the calendar ("Rather write first?"), so leads can still reach Notion and people without a free slot have a way in. The calendar loads only when the visitor scrolls near it, so phones from Instagram don't load Cal.com up front.
- **Not taken:** the dark/cream alternation and gold (we have Direction A), metric case studies (we have no results to show), video walls, the tabs by audience (one offer).
- **To do on Zyade's side:** in Cal.com, add booking questions (Instagram handle, business) so a direct booking carries what the form used to ask.
