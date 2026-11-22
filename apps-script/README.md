# The leads sheet

What the site sends to the Google Sheet "Arcbuildr leads", and what the sheet's script answers. The script is bound to the sheet and is kept outside this public repository. The Worker follows the script, not the other way round: change `src/lib/sheets.ts` when the script's columns change.

## What the Worker posts

Both endpoints post JSON to the Apps Script web app at `SHEETS_URL`. The body carries `token`, which must equal the script property `TOKEN` (`SHEETS_TOKEN` on the Worker).

**`POST /api/lead`**, when someone gives a name and an email: `{ token, lead }`.

- `lead` holds 16 text values, in the order of the Leads tab: `timestamp`, `name`, `email`, `phone`, `instagram`, `language`, `channel`, `budget`, `decisionMaker`, `need`, `timing`, `heardAbout`, `referredBy`, `timeZone`, `sourcePage`, `utm`.
- The script adds one row to the Leads tab with the status `new` and answers `{ "ok": true }`.

**`POST /api/apply`**, when someone sends the 8 questions: `{ token, lead, application }`. The questions are a form on Tally; when it is sent, the site reads the answers Tally hands the page and posts them here, so the sheet is filled the same way as before.

- `application` holds `kind` (`application`, or `prep` for the form answered after a booking made from a chat), `id`, `submittedAt`, `name`, `email`, `timeZone`, `sourcePage`, `utm` and `answers`, a list of `{ id, question, answer }` in the form's order.
- After the 8 answers comes one the visitor does not type: `{ id: "outcome", question: "Outcome", answer }`. The answer is `Calendar shown`, `Budget under the lowest price: no calendar shown`, or `Booked from a chat` for `prep`. The script finds no column for it and makes one at the right, headed "Outcome".
- The question texts come from the deck. The script finds a column by its exact heading first, then by a pattern for the answer's `id`, so a reworded question keeps its column and the old heading stays until someone renames it.
- A script that knows applications adds one row to the answers tab ("Tally application", or "Tally prep" for `prep`), under the headings already there. An `id` it already has adds nothing. It answers `{ "ok": true, "application": true }`. Its own sync then adds the Leads row with the status `applied`.
- A script that does not know applications saves `lead` as a Leads row with the status `new` and answers `{ "ok": true }`. `lead` carries the same answers, so nothing is lost.
- The plain form (a name, an email and one button: what a visitor gets when Tally cannot be reached, or when no script ran) posts to the same endpoint. So does the site when the sheet refuses a whole application, for example when a choice on Tally reads differently from the deck's. With all 8 answers valid it is saved as above. Otherwise the Worker sends `{ token, lead }` alone, as `POST /api/lead` does: one Leads row with the status `new`, whose `need` starts with `Plain form: the questions did not run or did not save`, followed by the answers that came along. The script needs no change for it.
- Any other answer means not saved. The site keeps the answers on the visitor's device and sends them again with the same `id` from the next page that loads, `/booked` included.

## Dates

`timestamp` and `submittedAt` are the Worker's time, in UTC, as ISO text (`2026-11-21T10:00:00.000Z`). The Leads tab keeps its columns as text, so they show exactly like that.

## Secrets

Set once per Worker. Paste each value at the private prompt. Never put them in a file of this repository, in a command argument or in browser code.

```sh
npx wrangler secret put SHEETS_URL
npx wrangler secret put SHEETS_TOKEN
```

`SHEETS_URL` is the web app URL of the deployment "Site lead form v1", ending in `/exec`. `SHEETS_TOKEN` is the script property `TOKEN`.

## After a change to the script

In the script editor: **Deploy > Manage deployments**, select the deployment, **Edit** (pencil icon), **Version > New version**, **Deploy**. The web app URL stays the same, so the Worker's secrets do not change.

## Test leads

Use a name starting with `TEST`, send it from a preview address, never from the live domain, and delete the row afterwards.
