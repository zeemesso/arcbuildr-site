/** Bindings the Worker reads. Secrets are set in Cloudflare, never in the repo. */
export interface Env {
  ASSETS: Fetcher;
  SHEETS_URL?: string;
  SHEETS_TOKEN?: string;
  RESEND_API_KEY?: string;
  ALERT_EMAIL?: string;
}

export interface BuildInfo {
  branch: string;
  branchSource: string;
  commit: string;
}

export type Failure = { ok: false; error: string };
