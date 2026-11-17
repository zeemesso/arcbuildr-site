# Application starts tracker

The Worker sends one row when someone opens the application from the entry block. Rows count starts, including repeat starts by the same person. They do not confirm a completed application.

## Setup (about 15 minutes)

1. Create a new spreadsheet named "Arcbuildr application starts". Use a fresh sheet for these columns rather than an old tracker with a different layout.
2. Click **Extensions > Apps Script**. Select `Code.gs`, replace its contents with [Code.gs](Code.gs), and click **Save project**.
3. In the toolbar function selector, choose `setup`, then click **Run**. Click **Review permissions**, select your account, and allow the requested spreadsheet access. If an unverified-app screen appears, review your own script before continuing through **Advanced**.
4. Return to the spreadsheet. The `Leads` tab has these columns, in order: `received_at`, `name`, `email`, `src`, `tz`, `page`, `utm`, `status`. The header is frozen and the status dropdown contains `opened`, `applied`, `booked`, `held`, `won`, `lost`. New rows start as `opened`.
5. In the script editor, click **Project Settings** (gear icon), then find **Script Properties**. Copy the generated `TOKEN` value privately for step 7.
6. Click **Deploy > New deployment**. Click **Select type** (gear icon), choose **Web app**, set **Execute as** to **Me** and **Who has access** to **Anyone**, then click **Deploy**. Complete authorization if prompted. Copy the **Web app URL**, ending in `/exec`. The shared token is still required to write a row.
7. From the site repository directory, run each command below. At each private prompt, paste the corresponding value. Use the web app URL for `SHEETS_URL` and the script property `TOKEN` for `SHEETS_TOKEN`. Never put either value in repository files, command arguments, or browser code.

   ```sh
   npx wrangler secret put SHEETS_URL
   npx wrangler secret put SHEETS_TOKEN
   ```

   Or, without a terminal: in the Cloudflare dashboard open **Workers & Pages**, click `arcbuildr`, then **Settings > Variables and secrets > Add**. Choose type **Secret**, and add `SHEETS_URL` and `SHEETS_TOKEN` one at a time.

8. Submit the site's entry block with a test name and email. Confirm a row appears with `status` set to `opened`, then delete that test row. If storage is not configured, the entry block still opens the application and no row is saved.

## Count starts for a date range

`received_at` stores the server time as UTC ISO text. Each data row counts as one application start, regardless of its current status. To count starts from November 1 through November 7, 2026, put this formula in an empty cell outside columns A through H:

```text
=COUNTIFS(Leads!A2:A,">=2026-11-01T00:00:00.000Z",Leads!A2:A,"<2026-11-08T00:00:00.000Z")
```

Replace the dates with the UTC start and the day after the final day you want to include. The upper bound is exclusive. Do not filter on status when counting starts: a person who later applied still opened the application.

## Update the script

After saving changes, click **Deploy > Manage deployments**, select the web app, click **Edit** (pencil icon), choose **Version > New version**, then click **Deploy**. The web app URL stays the same. Run `setup` again only when needed to restore the headers or dropdown.
