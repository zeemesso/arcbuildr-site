import { checkBrief, type MagnetBrief } from "../../magnets/types";

// Everything the magnet engine reads or writes in the database. The SQL lives here only.
// `Sql` is the small part of Cloudflare D1 this file uses, so tests can run the same SQL on
// an in-memory SQLite database (tests/helpers/memory-db.mjs).

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}
export interface Sql {
  prepare(query: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<{ meta: { changes?: number } }[]>;
}

export type LeadStatus = "queued" | "running" | "done" | "rejected" | "held" | "failed";
type LeadState = { status: LeadStatus; attempts: number };

export interface NewLead {
  id: string;
  token: string;
  magnet: string;
  createdAt: string;
  name: string;
  email: string;
  instagram: string;
  phone: string;
  answers: Record<string, string>;
  page: string;
  utm: string;
  rr: string;
  tz: string;
  /** Random code for the stop-the-emails link. */
  unsub: string;
}

export interface Lead extends NewLead, LeadState {
  startedAt: string | null;
  score: number | null;
  setterNote: string | null;
  screenReason: string | null;
  deliverable: string | null;
  costMicroUsd: number;
  error: string | null;
  unsubscribedAt: string | null;
}

type Row = {
  id: string;
  token: string;
  magnet: string;
  created_at: string;
  name: string;
  email: string;
  instagram: string;
  phone: string;
  answers: string;
  page: string;
  utm: string;
  rr: string;
  tz: string;
  status: LeadStatus;
  attempts: number;
  started_at: string | null;
  score: number | null;
  setter_note: string | null;
  screen_reason: string | null;
  deliverable_md: string | null;
  cost_microusd: number;
  error: string | null;
  unsub: string | null;
  unsubscribed_at: string | null;
};

const toLead = (row: Row): Lead => ({
  id: row.id,
  token: row.token,
  magnet: row.magnet,
  createdAt: row.created_at,
  name: row.name,
  email: row.email,
  instagram: row.instagram,
  phone: row.phone,
  answers: JSON.parse(row.answers) as Record<string, string>,
  page: row.page,
  utm: row.utm,
  rr: row.rr,
  tz: row.tz,
  status: row.status,
  attempts: row.attempts,
  startedAt: row.started_at,
  score: row.score,
  setterNote: row.setter_note,
  screenReason: row.screen_reason,
  deliverable: row.deliverable_md,
  costMicroUsd: row.cost_microusd,
  error: row.error,
  unsub: row.unsub ?? "",
  unsubscribedAt: row.unsubscribed_at,
});

/** A lead stuck in "running" this long was dropped mid-run and may be taken again. */
export const STALE_RUN_MS = 20 * 60 * 1000;

/** Tries per lead before we stop and tell Zyade. */
export const MAX_ATTEMPTS = 3;

/** Stores a new lead. False when this email already has this magnet; nothing is changed then. */
export async function insertLead(db: Sql, lead: NewLead): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO magnet_leads
         (id, token, magnet, created_at, name, email, instagram, phone, answers, page, utm, rr, tz,
          unsub)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (magnet, email) DO NOTHING`,
    )
    .bind(
      lead.id,
      lead.token,
      lead.magnet,
      lead.createdAt,
      lead.name,
      lead.email,
      lead.instagram,
      lead.phone,
      JSON.stringify(lead.answers),
      lead.page,
      lead.utm,
      lead.rr,
      lead.tz,
      lead.unsub,
    )
    .run();
  return result.meta.changes === 1;
}

export async function getLead(db: Sql, id: string): Promise<Lead | null> {
  const row = await db.prepare("SELECT * FROM magnet_leads WHERE id = ?").bind(id).first<Row>();
  return row ? toLead(row) : null;
}

export async function getLeadByToken(db: Sql, token: string): Promise<Lead | null> {
  const row = await db
    .prepare("SELECT * FROM magnet_leads WHERE token = ?")
    .bind(token)
    .first<Row>();
  return row ? toLead(row) : null;
}

export async function getLeadByEmail(db: Sql, magnet: string, email: string): Promise<Lead | null> {
  const row = await db
    .prepare("SELECT * FROM magnet_leads WHERE magnet = ? AND email = ?")
    .bind(magnet, email)
    .first<Row>();
  return row ? toLead(row) : null;
}

/**
 * Takes a lead for writing. True for one caller only: the lead must be queued or held, or
 * running for so long that the earlier run is gone. Counts the attempt.
 */
export async function claimLead(
  db: Sql,
  lead: Pick<Lead, "id" | "status" | "attempts">,
  now: Date,
): Promise<boolean> {
  const stale = new Date(now.getTime() - STALE_RUN_MS).toISOString();
  const result = await db
    .prepare(
      `UPDATE magnet_leads
          SET status = 'running', attempts = attempts + 1, started_at = ?
        WHERE id = ? AND status = ? AND attempts = ? AND attempts < ?
          AND (status IN ('queued', 'held') OR
               (status = 'running' AND (started_at IS NULL OR started_at < ?)))`,
    )
    .bind(now.toISOString(), lead.id, lead.status, lead.attempts, MAX_ATTEMPTS, stale)
    .run();
  return result.meta.changes === 1;
}

export interface Screen {
  score: number;
  setterNote: string;
  reason: string;
}

export async function saveScreen(
  db: Sql,
  id: string,
  attempt: number,
  screen: Screen,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE magnet_leads SET score = ?, setter_note = ?, screen_reason = ?
        WHERE id = ? AND status = 'running' AND attempts = ?`,
    )
    .bind(screen.score, screen.setterNote, screen.reason, id, attempt)
    .run();
  return result.meta.changes === 1;
}

/** One model call's use. Added to the lead's totals. */
export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
}

function usageUpdate(db: Sql, id: string, usage: Usage): SqlStatement {
  return db
    .prepare(
      `UPDATE magnet_leads
          SET model = ?, input_tokens = input_tokens + ?, output_tokens = output_tokens + ?,
              cost_microusd = cost_microusd + ?
        WHERE id = ?`,
    )
    .bind(usage.model, usage.inputTokens, usage.outputTokens, usage.costMicroUsd, id);
}

export async function reserveSpend(
  db: Sql,
  day: string,
  microUsd: number,
  capMicroUsd: number,
): Promise<boolean> {
  await db
    .prepare("INSERT INTO magnet_spend (day) VALUES (?) ON CONFLICT (day) DO NOTHING")
    .bind(day)
    .run();
  const result = await db
    .prepare("UPDATE magnet_spend SET microusd = microusd + ? WHERE day = ? AND microusd + ? <= ?")
    .bind(microUsd, day, microUsd, capMicroUsd)
    .run();
  return result.meta.changes === 1;
}

export async function settleSpend(
  db: Sql,
  day: string,
  reservedMicroUsd: number,
  actualMicroUsd: number,
  lead?: { id: string; usage: Usage },
): Promise<void> {
  const ledger = db
    .prepare("UPDATE magnet_spend SET microusd = MAX(0, microusd - ? + ?) WHERE day = ?")
    .bind(reservedMicroUsd, actualMicroUsd, day);
  // A failed write leaves the original reservation in place.
  if (lead) await db.batch([ledger, usageUpdate(db, lead.id, lead.usage)]);
  else await ledger.run();
}

/** The UTC day a spend is counted on, as YYYY-MM-DD. */
export const dayOf = (now: Date) => now.toISOString().slice(0, 10);

export async function spentOn(db: Sql, day: string): Promise<number> {
  const row = await db
    .prepare("SELECT microusd FROM magnet_spend WHERE day = ?")
    .bind(day)
    .first<{ microusd: number }>();
  return row?.microusd ?? 0;
}

export interface LeadStatsCounts {
  finished: number;
  written: number;
  screened_out: number;
  hot: number;
  cost_microusd: number;
}

const HOT_SCORE = 4; // Same threshold as the sweep digest.

/** Counts every lead created in [from, to), grouped by UTC day and magnet. */
export async function leadStatsByDayAndMagnet(db: Sql, from: Date, to: Date) {
  // Accepted screens also save a reason, so only the rejected status identifies a refusal.
  const { results } = await db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, magnet, COUNT(*) AS finished,
              COUNT(CASE WHEN status = ? OR deliverable_md IS NOT NULL THEN 1 END) AS written,
              COUNT(CASE WHEN status = ? AND deliverable_md IS NULL THEN 1 END) AS screened_out,
              COUNT(CASE WHEN score >= ? THEN 1 END) AS hot,
              SUM(cost_microusd) AS cost_microusd
         FROM magnet_leads WHERE created_at >= ? AND created_at < ?
        GROUP BY day, magnet`,
    )
    .bind("done", "rejected", HOT_SCORE, from.toISOString(), to.toISOString())
    .all<LeadStatsCounts & { day: string; magnet: string }>();
  return results;
}

type StatsPersonRow = Pick<
  Row,
  "name" | "email" | "instagram" | "magnet" | "status" | "score" | "screen_reason" | "created_at"
> & {
  run: string | null;
  stage: string;
  hot: number;
  finished_at: string | null;
};

/** Only the fields the dashboard shows, for the newest leads in [from, to). */
export async function statsPeople(db: Sql, from: Date, to: Date) {
  const { results } = await db
    .prepare(
      `SELECT name, email, instagram, magnet, NULLIF(rr, '') AS run, status, stage,
              score, COALESCE(score >= ?, 0) AS hot, screen_reason, created_at, finished_at
         FROM magnet_leads WHERE created_at >= ? AND created_at < ?
        ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(HOT_SCORE, from.toISOString(), to.toISOString(), 200)
    .all<StatsPersonRow>();
  return results.map((row) => ({ ...row, hot: row.hot === 1 }));
}

export async function statsHealth(db: Sql) {
  const row = await db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM magnet_leads WHERE status = ?) AS queued,
              (SELECT COUNT(*) FROM magnet_leads WHERE status = ?) AS running,
              (SELECT COUNT(*) FROM magnet_leads WHERE status = ?) AS failed,
              (SELECT COUNT(*) FROM magnet_emails WHERE status = ?) AS emails_pending,
              (SELECT COUNT(*) FROM magnet_emails WHERE status = ?) AS emails_failed`,
    )
    .bind("queued", "running", "failed", "pending", "failed")
    .first<{
      queued: number;
      running: number;
      failed: number;
      emails_pending: number;
      emails_failed: number;
    }>();
  // The SELECT always returns one row, including when the tables are empty.
  return row!;
}

/** Changes a lead only while it still has the state this run expects. */
export async function finishLead(
  db: Sql,
  id: string,
  expected: LeadState,
  end: {
    status: Exclude<LeadStatus, "running">;
    deliverable?: string;
    error?: string;
    screen?: Screen;
    link?: NewEmail;
  },
  now: Date,
): Promise<boolean> {
  const closed = end.status === "queued" || end.status === "held" ? null : now.toISOString();
  const finish = db
    .prepare(
      `UPDATE magnet_leads
          SET status = ?, deliverable_md = COALESCE(?, deliverable_md), error = ?, finished_at = ?,
              score = COALESCE(?, score), setter_note = COALESCE(?, setter_note),
              screen_reason = COALESCE(?, screen_reason)
        WHERE id = ? AND status = ? AND attempts = ?`,
    )
    .bind(
      end.status,
      end.status === "done" ? (end.deliverable ?? null) : null,
      end.error ?? null,
      closed,
      end.screen?.score ?? null,
      end.screen?.setterNote ?? null,
      end.screen?.reason ?? null,
      id,
      expected.status,
      expected.attempts,
    );
  if (!end.link) return (await finish.run()).meta.changes === 1;
  const [, result] = await db.batch([emailInsert(db, id, [end.link], expected), finish]);
  return result?.meta.changes === 1;
}

/** Leads that wait for a run: held ones, and ones a dropped run left behind. Oldest first. */
export async function waitingLeads(db: Sql, now: Date, limit = 20): Promise<string[]> {
  const stale = new Date(now.getTime() - STALE_RUN_MS).toISOString();
  const { results } = await db
    .prepare(
      `SELECT id FROM magnet_leads
        WHERE status = 'held' OR (status IN ('queued', 'running') AND created_at < ? AND
              (started_at IS NULL OR started_at < ?))
        ORDER BY created_at LIMIT ?`,
    )
    .bind(stale, stale, limit)
    .all<{ id: string }>();
  return results.map((row) => row.id);
}

export async function getBrief(db: Sql, slug: string): Promise<MagnetBrief | null> {
  const row = await db
    .prepare("SELECT brief_json FROM magnet_briefs WHERE slug = ?")
    .bind(slug)
    .first<{ brief_json: string }>();
  if (!row) return null;
  try {
    const brief = { ...(JSON.parse(row.brief_json) as MagnetBrief), slug };
    return checkBrief(brief).length ? null : brief;
  } catch {
    return null;
  }
}

export async function putBrief(db: Sql, brief: MagnetBrief, now: Date): Promise<void> {
  await db
    .prepare(
      `INSERT INTO magnet_briefs (slug, brief_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (slug) DO UPDATE SET brief_json = excluded.brief_json,
                                        updated_at = excluded.updated_at`,
    )
    .bind(brief.slug, JSON.stringify(brief), now.toISOString())
    .run();
}

// ---- Emails to leads ----

export interface NewEmail {
  step: number;
  dueAt: string;
  subject: string;
  body: string;
}

/** Stores emails for a lead. A step that already exists is left as it is. */
export async function scheduleEmails(db: Sql, leadId: string, emails: NewEmail[]): Promise<void> {
  if (emails.length) await emailInsert(db, leadId, emails).run();
}

function emailInsert(
  db: Sql,
  leadId: string,
  emails: NewEmail[],
  expected?: LeadState,
): SqlStatement {
  const rows = emails.map(() => "(?, ?, ?, ?, ?)").join(", ");
  const guard = expected
    ? "EXISTS (SELECT 1 FROM magnet_leads WHERE id = ? AND status = ? AND attempts = ?)"
    : "1";
  return db
    .prepare(
      `WITH emails (lead_id, step, due_at, subject, body) AS (VALUES ${rows})
       INSERT INTO magnet_emails (lead_id, step, due_at, subject, body)
       SELECT lead_id, step, due_at, subject, body FROM emails WHERE ${guard}
       ON CONFLICT (lead_id, step) DO NOTHING`,
    )
    .bind(
      ...emails.flatMap((email) => [leadId, email.step, email.dueAt, email.subject, email.body]),
      ...(expected ? [leadId, expected.status, expected.attempts] : []),
    );
}

export interface DueEmail {
  leadId: string;
  step: number;
  dueAt: string;
  subject: string;
  body: string;
  to: string;
  unsub: string;
}

/** A send that was claimed this long ago and never closed was dropped; it may go again. */
export const STALE_SEND_MS = 30 * 60 * 1000;

/** Emails whose time has come, oldest first. Leads who stopped the emails get none. */
export async function dueEmails(
  db: Sql,
  now: Date,
  limit: number,
  leadId?: string,
): Promise<DueEmail[]> {
  const stale = new Date(now.getTime() - STALE_SEND_MS).toISOString();
  const { results } = await db
    .prepare(
      `SELECT e.lead_id AS leadId, e.step, e.due_at AS dueAt, e.subject, e.body,
              l.email AS "to", l.unsub
         FROM magnet_emails e JOIN magnet_leads l ON l.id = e.lead_id
        WHERE (e.status = 'pending' OR (e.status = 'sending' AND e.claimed_at < ?))
          AND e.due_at <= ? AND l.status = 'done' AND l.unsubscribed_at IS NULL
          AND (? IS NULL OR e.lead_id = ?)
        ORDER BY e.due_at LIMIT ?`,
    )
    .bind(stale, now.toISOString(), leadId ?? null, leadId ?? null, limit)
    .all<DueEmail>();
  return results;
}

/** Takes one email for sending and counts the try. True for one caller only. */
export async function claimEmail(
  db: Sql,
  leadId: string,
  step: number,
  now: Date,
  dueAt?: string,
): Promise<boolean> {
  const stale = new Date(now.getTime() - STALE_SEND_MS).toISOString();
  const result = await db
    .prepare(
      `UPDATE magnet_emails SET status = 'sending', attempts = attempts + 1, claimed_at = ?
        WHERE lead_id = ? AND step = ?
          AND (? IS NULL OR due_at = ?)
          AND EXISTS (SELECT 1 FROM magnet_leads WHERE id = lead_id AND status = 'done'
                        AND unsubscribed_at IS NULL)
          AND (status = 'pending' OR (status = 'sending' AND claimed_at < ?))`,
    )
    .bind(now.toISOString(), leadId, step, dueAt ?? null, dueAt ?? null, stale)
    .run();
  return result.meta.changes === 1;
}

/** Sends tried per email before it is given up. */
export const MAX_SENDS = 3;

/** Ends a send. A failed send goes back to pending until it has been tried MAX_SENDS times. */
export async function closeEmail(
  db: Sql,
  leadId: string,
  step: number,
  end: { sent: true } | { sent: false; error: string; final?: boolean },
  now: Date,
): Promise<void> {
  if (end.sent) {
    await db
      .prepare(
        `UPDATE magnet_emails SET status = 'sent', error = NULL, sent_at = ?
          WHERE lead_id = ? AND step = ? AND status = 'sending'`,
      )
      .bind(now.toISOString(), leadId, step)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE magnet_emails
          SET status = CASE WHEN ? = 1 OR attempts >= ? THEN 'failed' ELSE 'pending' END, error = ?
        WHERE lead_id = ? AND step = ? AND status = 'sending'`,
    )
    .bind(end.final ? 1 : 0, MAX_SENDS, end.error, leadId, step)
    .run();
}

/** Stops every email for the lead with this code. False when no lead has it. */
export async function unsubscribe(db: Sql, code: string, now: Date): Promise<boolean> {
  const lead = await db
    .prepare("SELECT id FROM magnet_leads WHERE unsub = ?")
    .bind(code)
    .first<{ id: string }>();
  if (!lead) return false;
  await db
    .prepare("UPDATE magnet_leads SET unsubscribed_at = COALESCE(unsubscribed_at, ?) WHERE id = ?")
    .bind(now.toISOString(), lead.id)
    .run();
  await db
    .prepare(
      `UPDATE magnet_emails SET status = 'cancelled'
        WHERE lead_id = ? AND status IN ('pending', 'sending')`,
    )
    .bind(lead.id)
    .run();
  return true;
}

/** A person may ask for the link again once in this long. */
export const RESEND_EVERY_MS = 24 * 60 * 60 * 1000;

/** Queues the "it's ready" email again, at most once a day. True when it was queued. */
export async function resendLink(db: Sql, leadId: string, now: Date): Promise<boolean> {
  const before = new Date(now.getTime() - RESEND_EVERY_MS).toISOString();
  const result = await db
    .prepare(
      `UPDATE magnet_emails SET status = 'pending', attempts = 0, due_at = ?
        WHERE lead_id = ? AND step = 0
          AND ((status = 'sent' AND sent_at < ?) OR status = 'failed')`,
    )
    .bind(now.toISOString(), leadId, before)
    .run();
  return result.meta.changes === 1;
}

/** How long after the deliverable the lesson emails may still be written. */
export const FOLLOWUP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_FOLLOWUP_TRIES = 3;

/** Finished leads that have no lesson emails yet. Oldest first. */
export async function followUpCandidates(db: Sql, now: Date, limit = 10): Promise<string[]> {
  const since = new Date(now.getTime() - FOLLOWUP_WINDOW_MS).toISOString();
  const { results } = await db
    .prepare(
      `SELECT id FROM magnet_leads l
        WHERE status = 'done' AND finished_at > ? AND unsubscribed_at IS NULL
          AND followup_tries < ?
          AND NOT EXISTS (SELECT 1 FROM magnet_emails e WHERE e.lead_id = l.id AND e.step > 0)
        ORDER BY finished_at LIMIT ?`,
    )
    .bind(since, MAX_FOLLOWUP_TRIES, limit)
    .all<{ id: string }>();
  return results.map((row) => row.id);
}

/** Counts a try at the lesson emails. False when the lead has none left or has them already. */
export async function claimFollowUp(db: Sql, id: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE magnet_leads SET followup_tries = followup_tries + 1
        WHERE id = ? AND status = 'done' AND unsubscribed_at IS NULL AND followup_tries < ?
          AND NOT EXISTS (SELECT 1 FROM magnet_emails e WHERE e.lead_id = ? AND e.step > 0)`,
    )
    .bind(id, MAX_FOLLOWUP_TRIES, id)
    .run();
  return result.meta.changes === 1;
}

/** Leads created in [from, to), hottest first, for the daily digest. */
export async function leadsBetween(db: Sql, from: Date, to: Date): Promise<Lead[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM magnet_leads WHERE created_at >= ? AND created_at < ?
        ORDER BY score DESC, created_at DESC LIMIT 100`,
    )
    .bind(from.toISOString(), to.toISOString())
    .all<Row>();
  return results.map(toLead);
}

/** How many leads wait for us right now (held, or given up on). */
export async function stuckCount(db: Sql): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM magnet_leads WHERE status IN ('held', 'failed')")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Marks a lead as one that gets no lesson emails, so the sweep stops asking. */
export async function skipFollowUp(db: Sql, id: string): Promise<void> {
  await db
    .prepare("UPDATE magnet_leads SET followup_tries = ? WHERE id = ?")
    .bind(MAX_FOLLOWUP_TRIES, id)
    .run();
}
