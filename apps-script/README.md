# The leads sheet

What the site sends to the Google Sheet "Arcbuildr leads", and what the sheet's script answers. The script is bound to the sheet and is kept outside this public repository. The Worker follows the script, not the other way round: change `src/lib/sheets.ts` when the script's columns change.

## What the Worker posts

Both endpoints post JSON to the Apps Script web app at `SHEETS_URL`. The body carries `token`, which must equal the script property `TOKEN` (`SHEETS_TOKEN` on the Worker).

**`POST /api/lead`**, when someone gives a name and an email: `{ token, lead }`.

- `lead` holds 16 text values, in the order of the Leads tab: `timestamp`, `name`, `email`, `phone`, `instagram`, `language`, `channel`, `budget`, `decisionMaker`, `need`, `timing`, `heardAbout`, `referredBy`, `timeZone`, `sourcePage`, `utm`.
- The script adds one row to the Leads tab with the status `new` and answers `{ "ok": true }`.

**`POST /api/apply`**, when someone answers the 8 questions: `{ token, lead, application }`.

- `application` holds `kind` (`application`, or `prep` for the form answered after a booking made from a chat), `id`, `submittedAt`, `name`, `email`, `timeZone`, `sourcePage`, `utm` and `answers`, a list of `{ id, question, answer }` in the form's order.
- After the 8 answers comes one the visitor does not type: `{ id: "outcome", question: "Outcome", answer }`. The answer is `Calendar shown`, `Budget under the lowest price: no calendar shown`, or `Booked from a chat` for `prep`. The script finds no column for it and makes one at the right, headed "Outcome".
- The question texts come from the deck. The script finds a column by its exact heading first, then by a pattern for the answer's `id`, so a reworded question keeps its column and the old heading stays until someone renames it.
- A script that knows applications adds one row to the answers tab ("Tally application", or "Tally prep" for `prep`), under the headings already there. An `id` it already has adds nothing. It answers `{ "ok": true, "application": true }`. Its own sync then adds the Leads row with the status `applied`.
- A script that does not know applications saves `lead` as a Leads row with the status `new` and answers `{ "ok": true }`. `lead` carries the same answers, so nothing is lost.
- Any other answer means not saved. The form then says so, keeps what was typed on the visitor's device and offers another try with the same `id`.

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
