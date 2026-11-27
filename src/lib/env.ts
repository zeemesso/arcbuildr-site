/** Bindings the Worker reads. Secrets are set in Cloudflare, never in the repo. */
export interface Env {
  ASSETS: Fetcher;
  SHEETS_URL?: string;
  SHEETS_TOKEN?: string;
  RESEND_API_KEY?: string;
  ALERT_EMAIL?: string;
  /** Magnet engine (MAGNET-PLAN.md). Without DB the magnet routes answer "try again". */
  DB?: D1Database;
  MAGNET_QUEUE?: Queue<MagnetJob>;
  /** "1" lets draft magnets take leads. Set on preview deployments only. */
  MAGNET_DRAFTS?: string;
}

/** One message on the magnet queue: write the deliverable for this lead. */
export interface MagnetJob {
  id: string;
}

export interface BuildInfo {
  branch: string;
  branchSource: string;
  commit: string;
}

export type Failure = { ok: false; error: string };
