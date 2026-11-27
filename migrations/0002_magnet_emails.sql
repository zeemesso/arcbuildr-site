-- Emails to magnet leads (MAGNET-PLAN.md, task 8).

-- A second random code per lead, used only to stop the emails. It is not the result token,
-- so an unsubscribe link in a forwarded email opens nothing.
ALTER TABLE magnet_leads ADD COLUMN unsub TEXT;
ALTER TABLE magnet_leads ADD COLUMN unsubscribed_at TEXT;
-- Tries at writing the lesson emails, so a lead that keeps failing is left alone.
ALTER TABLE magnet_leads ADD COLUMN followup_tries INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX magnet_leads_unsub ON magnet_leads (unsub);

-- Step 0 is the "it's ready" link. Steps 1 and up are the lesson emails.
CREATE TABLE magnet_emails (
  lead_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  -- pending, sending, sent, failed, cancelled.
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT,
  sent_at TEXT,
  error TEXT,
  PRIMARY KEY (lead_id, step)
);

CREATE INDEX magnet_emails_due ON magnet_emails (status, due_at);
