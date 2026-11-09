# SL-P1: lead capture path (plan)

Branch: `sl-p1-lead-capture`, cut from `claude/build` at 8595d59. Written 2026-11-08.

## Findings

- Stack: Astro 7 static pages, served by one Cloudflare Worker (`src/worker.ts`). `POST /api/lead` runs `handleLead` in `src/lib/lead.ts`.
- Today the lead goes to Notion (`src/lib/notion.ts`), then a Resend alert. The form is `src/components/LeadForm.astro`. It works without JavaScript (plain POST, 303 to `/thanks`). With JavaScript it does inline checks and a fetch.
- The landing page (`src/views/Home.astro`, section `#start`) shows an inline Cal.com calendar first. The form sits folded underneath it.
- `/thanks` (`src/views/Thanks.astro`) shows the Cal.com embed, prefilled with name and email from the URL.
- The site is in English only (French removed 2026-11-09). UI strings are in `src/i18n/en.ts`. Design tokens are in `src/styles`, and classes `.card`, `.btn`, `.pill` are reused.
- Tests: Vitest for `lead.ts`, Playwright on mobile (Pixel 7) and desktop (1280 px). `npm run check` runs everything.

## Build plan

1. `src/data/application.ts`: one config file with every question label, help line and answer option marked DRAFT. The form, the server check and the sheet all read it.
2. `src/config.ts`: `WHATSAPP_NUMBER` and `PHONE_NUMBER` placeholders, next to `CAL_LINK`. While they are empty, the call-now buttons stay hidden.
3. `src/lib/phone.ts`: one phone rule, shared by the page and the Worker. It accepts `+` or `00`, then the country code. Spaces, dots, dashes and brackets are allowed. It stores `+<8 to 15 digits>`.
4. `src/lib/sheets.ts`: the Worker posts `{ token, lead }` to the Apps Script web app. `SHEETS_URL` and `SHEETS_TOKEN` are Worker secrets. The token never reaches the browser.
5. `src/lib/lead.ts`: new fields, each checked against the config. Google Sheets replaces Notion as the place where the lead is saved. The existing Resend alert stays, with the new fields. Delete `notion.ts` and its test.
6. `apps-script/Code.gs` + `apps-script/README.md`:
   - Checks the token, then appends one row in the fixed column order.
   - `status` is set to `new`, with a dropdown on that cell.
   - A `setup()` function writes the headers.
   - Cell values that start with `= + - @` get a leading `'`, so they can't run as formulas.
7. `LeadForm.astro`:
   - The new fields: radio groups for the multiple-choice questions, `type="tel"` for the phone.
   - Hidden fields: time zone, page URL, UTM parameters.
   - On failure it retries once by itself, then shows an error with the WhatsApp link.
8. `Home.astro` `#start`: the form becomes the main element. The calendar moves behind the form, so booking happens only after the lead is saved.
9. `Thanks.astro`: two choices. "Talk now" offers WhatsApp and a phone link. "Pick a time" is the Cal.com embed, prefilled; Cal.com shows times in the visitor's own time zone.
10. Privacy text: Google Sheets replaces Notion; the new fields are listed.
11. Tests:
    - Unit: phone rule, `parseLead`, `handleLead` with a mocked Apps Script.
    - e2e: success, failure, retry then success, retry then failure with the WhatsApp link, validation, keyboard only.
    - Layout checked at 375 px and 1280 px.

## Out of scope

Reminders, alerts beyond the existing one, emails, WhatsApp or Instagram automation, payment, Cal.com settings, CRM.
