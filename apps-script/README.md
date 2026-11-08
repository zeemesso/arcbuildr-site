# Lead tracker: Google Sheets + Apps Script

The site's Worker sends each lead to this script, which appends one row to the sheet. The token lives in two places only: the script's properties and the Cloudflare secret. It is never in the browser or in the repo.

## Set up (about 15 minutes)

1. Create a Google Sheet named "Arcbuildr leads".
2. In the sheet: Extensions, Apps Script. Delete what is in `Code.gs` and paste [Code.gs](Code.gs). Save.
3. Make a token. In a terminal, run `openssl rand -hex 24` and copy the result.
4. In Apps Script: Project Settings (gear icon), Script Properties, Add script property. Property `TOKEN`, value = the token. Save.
5. Back in the editor, choose the function `setup` in the toolbar and click Run. Allow access when Google asks: it is your own script and your own sheet. A tab named `Leads` appears, with the headers and the status dropdown.
6. Deploy, New deployment, type Web app. Execute as: Me. Who has access: Anyone. Deploy, then copy the Web app URL. It ends in `/exec`.
7. In Cloudflare: Workers & Pages, `arcbuildr`, Settings, Variables and Secrets. Add two secrets:
   - `SHEETS_URL` = the Web app URL
   - `SHEETS_TOKEN` = the token
8. Test from a terminal, with your own values:
   ```bash
   curl -sL -X POST "$SHEETS_URL" -H "Content-Type: application/json" -d '{"token":"'"$SHEETS_TOKEN"'","lead":{"name":"TEST setup"}}'
   ```
   It should print `{"ok":true}` and add a row named `TEST setup`. Delete that row.

"Anyone" means anyone with the URL can reach the script. Without the token, the script answers `unauthorized` and writes nothing.

## Editing the script later

After any change to `Code.gs`: Deploy, Manage deployments, the pencil icon, Version: New version, Deploy. The URL stays the same.

## Columns

timestamp, name, email, phone, Instagram, language, channel, budget, decision maker, need, timing, heard about us, referred by, time zone, source page, UTM, status, next call date, notes.

- `status` starts as `new`. The dropdown allows: new, booked, showed, closed, no-show, follow-up.
- You fill in `next call date` and `notes` by hand.
- The answer options come from `src/data/application.ts`. Changing a `value` there changes what new rows show; old rows keep the old value.
