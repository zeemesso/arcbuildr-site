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
  /** Claude API key. A Cloudflare secret, from a Console workspace with its own spend limit. */
  ANTHROPIC_API_KEY?: string;
  /** Most the model calls may cost per UTC day, in US dollars. Default 3. */
  MAGNET_DAILY_CAP_USD?: string;
  /** Where result links in emails point. Default https://arcbuildr.co. */
  SITE_URL?: string;
  /** Sender of emails to leads, on a domain verified in Resend. Without it none are sent. */
  MAIL_FROM?: string;
  /** Where a lead's reply goes. Default: the sender. */
  MAIL_REPLY_TO?: string;
  /** ReplyRail, to check which Instagram account got the link. Set both or neither. */
  REPLYRAIL_URL?: string;
  REPLYRAIL_SECRET?: string;
  /** UTC hour (0 to 23) of the daily digest. Default 7. */
  MAGNET_DIGEST_HOUR_UTC?: string;
}

/** One message on the magnet queue: write this lead's deliverable, or its lesson emails. */
export interface MagnetJob {
  id: string;
  task?: "followup";
}

export interface BuildInfo {
  branch: string;
  branchSource: string;
  commit: string;
}

export type Failure = { ok: false; error: string };
