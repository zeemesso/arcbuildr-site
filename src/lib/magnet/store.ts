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
}

export type LeadStatus = "queued" | "running" | "done" | "rejected" | "held" | "failed";

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
}

export interface Lead extends NewLead {
  status: LeadStatus;
  attempts: number;
  score: number | null;
  setterNote: string | null;
  screenReason: string | null;
  deliverable: string | null;
  costMicroUsd: number;
  error: string | null;
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
  score: number | null;
  setter_note: string | null;
  screen_reason: string | null;
  deliverable_md: string | null;
  cost_microusd: number;
  error: string | null;
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
  score: row.score,
  setterNote: row.setter_note,
  screenReason: row.screen_reason,
  deliverable: row.deliverable_md,
  costMicroUsd: row.cost_microusd,
  error: row.error,
});

/** A lead stuck in "running" this long was dropped mid-run and may be taken again. */
export const STALE_RUN_MS = 20 * 60 * 1000;

/** Stores a new lead. False when this email already has this magnet; nothing is changed then. */
export async function insertLead(db: Sql, lead: NewLead): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO magnet_leads
         (id, token, magnet, created_at, name, email, instagram, phone, answers, page, utm, rr, tz)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
export async function claimLead(db: Sql, id: string, now: Date): Promise<boolean> {
  const stale = new Date(now.getTime() - STALE_RUN_MS).toISOString();
  const result = await db
    .prepare(
      `UPDATE magnet_leads
          SET status = 'running', attempts = attempts + 1, started_at = ?
        WHERE id = ?
          AND (status IN ('queued', 'held') OR (status = 'running' AND started_at < ?))`,
    )
    .bind(now.toISOString(), id, stale)
    .run();
  return result.meta.changes === 1;
}

export interface Screen {
  score: number;
  setterNote: string;
  reason: string;
}

export async function saveScreen(db: Sql, id: string, screen: Screen): Promise<void> {
  await db
    .prepare("UPDATE magnet_leads SET score = ?, setter_note = ?, screen_reason = ? WHERE id = ?")
    .bind(screen.score, screen.setterNote, screen.reason, id)
    .run();
}

/** One model call's use. Added to the lead's totals. */
export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
}

/** Adds a model call to the lead's totals and to the day's spend, so no call goes uncounted. */
export async function recordUsage(db: Sql, id: string, usage: Usage, now: Date): Promise<void> {
  await db
    .prepare(
      `UPDATE magnet_leads
          SET model = ?, input_tokens = input_tokens + ?, output_tokens = output_tokens + ?,
              cost_microusd = cost_microusd + ?
        WHERE id = ?`,
    )
    .bind(usage.model, usage.inputTokens, usage.outputTokens, usage.costMicroUsd, id)
    .run();
  await db
    .prepare(
      `INSERT INTO magnet_spend (day, microusd) VALUES (?, ?)
       ON CONFLICT (day) DO UPDATE SET microusd = microusd + excluded.microusd`,
    )
    .bind(dayOf(now), usage.costMicroUsd)
    .run();
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

/** Ends a run. `deliverable` is kept only with "done". */
export async function finishLead(
  db: Sql,
  id: string,
  end: { status: Exclude<LeadStatus, "running">; deliverable?: string; error?: string },
  now: Date,
): Promise<void> {
  const closed = end.status === "queued" || end.status === "held" ? null : now.toISOString();
  await db
    .prepare(
      `UPDATE magnet_leads
          SET status = ?, deliverable_md = COALESCE(?, deliverable_md), error = ?, finished_at = ?
        WHERE id = ?`,
    )
    .bind(
      end.status,
      end.status === "done" ? (end.deliverable ?? null) : null,
      end.error ?? null,
      closed,
      id,
    )
    .run();
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
