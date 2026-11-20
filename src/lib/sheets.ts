import type { Failure } from "./env";

/**
 * One row of the Leads tab. These are KEYS in the sheet's script, in its order: the script reads each
 * one from `lead` by name, so a key it does not know is dropped and a key that is missing saves an empty cell.
 * The script adds status "new" itself.
 */
export const LEAD_KEYS = [
  "timestamp",
  "name",
  "email",
  "phone",
  "instagram",
  "language",
  "channel",
  "budget",
  "decisionMaker",
  "need",
  "timing",
  "heardAbout",
  "referredBy",
  "timeZone",
  "sourcePage",
  "utm",
] as const;
export type SheetLead = Record<(typeof LEAD_KEYS)[number], string>;

/** A whole application, for the answers tab. A script that does not know it yet saves `lead` alone. */
export interface SheetApplication {
  /** "prep" is the same form answered after a booking made from a chat. */
  kind: "application" | "prep";
  /** One id per application. The script ignores an id it already has. */
  id: string;
  submittedAt: string;
  name: string;
  email: string;
  timeZone: string;
  sourcePage: string;
  utm: string;
  /** In the form's order. `question` is the column heading when the tab has no column for it yet. */
  answers: { id: string; question: string; answer: string }[];
}

export type Saved = { ok: true; application: boolean } | Failure;

/** Posts to the Apps Script web app. The token stays on the server. */
export async function saveToSheet(
  env: { SHEETS_URL?: string; SHEETS_TOKEN?: string },
  payload: { lead: SheetLead; application?: SheetApplication },
): Promise<Saved> {
  if (!env.SHEETS_URL || !env.SHEETS_TOKEN)
    return { ok: false, error: "missing SHEETS_URL or SHEETS_TOKEN" };
  try {
    // Apps Script answers with a redirect to the script output; fetch follows it.
    const res = await fetch(env.SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: env.SHEETS_TOKEN, ...payload }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; application?: boolean };
    if (res.ok && body.ok === true) return { ok: true, application: body.application === true };
    return { ok: false, error: "sheets save failed" };
  } catch {
    return { ok: false, error: "sheets request failed" };
  }
}

/** One lead row. */
export const saveLead = (env: { SHEETS_URL?: string; SHEETS_TOKEN?: string }, lead: SheetLead) =>
  saveToSheet(env, { lead });
