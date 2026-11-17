import type { Failure } from "./env";

/** One row of the lead tracker. Keys match KEYS in apps-script/Code.gs. */
export interface SheetLead {
  received_at: string;
  name: string;
  email: string;
  src: string;
  tz: string;
  page: string;
  utm: string;
  status: "opened";
}

/** Appends the lead through the Apps Script web app. The token stays on the server. */
export async function saveLead(
  env: { SHEETS_URL?: string; SHEETS_TOKEN?: string },
  lead: SheetLead,
): Promise<{ ok: true } | Failure> {
  if (!env.SHEETS_URL || !env.SHEETS_TOKEN)
    return { ok: false, error: "missing SHEETS_URL or SHEETS_TOKEN" };
  try {
    // Apps Script answers with a redirect to the script output; fetch follows it.
    const res = await fetch(env.SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: env.SHEETS_TOKEN, lead }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (res.ok && body.ok === true) return { ok: true };
    return { ok: false, error: "sheets save failed" };
  } catch {
    return { ok: false, error: "sheets request failed" };
  }
}
