import type { Env, MagnetJob } from "../env";
import { planPagePath } from "./contract";
import { SITE_URL, type JobDeps } from "./job";
import { sendDue, type SendReport } from "./mail";
import {
  dayOf,
  followUpCandidates,
  leadsBetween,
  spentOn,
  stuckCount,
  waitingLeads,
  type Lead,
  type Sql,
} from "./store";

// Runs once an hour (cron). It keeps the engine moving without anyone watching it:
// leads that wait get queued again, lesson emails get written and sent, and once a day
// Zyade gets one email with yesterday's leads, hottest first.
//
// One run stays far below the Workers Free limits of 50 database queries and 50 outside
// requests: the batch sizes below are what keeps it there.

const REQUEUE_PER_RUN = 20;
const FOLLOWUPS_PER_RUN = 10;
const EMAILS_PER_RUN = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_DIGEST_HOUR_UTC = 7;

export interface SweepReport {
  requeued: number;
  followUps: number;
  emails: SendReport;
  digest: boolean;
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const dollars = (microUsd: number) => `$${(microUsd / 1e6).toFixed(2)}`;

const STATUS_WORD: Record<Lead["status"], string> = {
  queued: "being written",
  running: "being written",
  done: "written",
  rejected: "rejected",
  held: "WAITING FOR YOU",
  failed: "FAILED",
};

/** The daily email. Null when there is nothing to say. */
export function digest(
  leads: Lead[],
  stuck: number,
  spend: { today: number; yesterday: number },
  site: string,
): { subject: string; text: string } | null {
  if (!leads.length && !stuck) return null;
  const hot = leads.filter((lead) => (lead.score ?? 0) >= 4).length;
  const count = (status: Lead["status"]) => leads.filter((lead) => lead.status === status).length;
  const lines = [
    `Last 24 hours: ${leads.length} ${leads.length === 1 ? "form" : "forms"}. ${count("done")} written, ${count("rejected")} rejected.`,
    `Model spend: ${dollars(spend.yesterday)} yesterday, ${dollars(spend.today)} today so far (UTC days).`,
  ];
  if (stuck)
    lines.push(
      `${stuck} ${stuck === 1 ? "lead waits" : "leads wait"} for you (held or failed). The alert emails say why.`,
    );
  for (const lead of leads) {
    lines.push(
      "",
      oneLine(
        `${lead.score ?? "-"}/5  ${lead.name}  ${lead.instagram}  ${lead.phone}  [${STATUS_WORD[lead.status]}]`,
      ),
    );
    if (lead.setterNote) lines.push(`  ${oneLine(lead.setterNote)}`);
    if (lead.status === "done") lines.push(`  ${site}${planPagePath(lead.token)}`);
  }
  return {
    subject: `Magnet digest: ${leads.length} new, ${hot} hot${stuck ? `, ${stuck} waiting` : ""}`,
    text: lines.join("\n"),
  };
}

export function digestHour(setting: string | undefined): number {
  const hour = Number(setting);
  return setting?.trim() && Number.isInteger(hour) && hour >= 0 && hour <= 23
    ? hour
    : DEFAULT_DIGEST_HOUR_UTC;
}

export async function sweep(
  env: Env,
  deps: Pick<JobDeps, "now" | "mail" | "alert">,
): Promise<SweepReport | null> {
  const db: Sql | undefined = env.DB;
  if (!db) {
    console.error("magnet: no DB binding");
    return null;
  }
  const now = deps.now();
  const site = env.SITE_URL || SITE_URL;

  // 1. Leads that wait for a run, and finished leads without lesson emails: back on the queue.
  const waiting = await waitingLeads(db, now, REQUEUE_PER_RUN);
  const lessons = await followUpCandidates(db, now, FOLLOWUPS_PER_RUN);
  const jobs: MagnetJob[] = [
    ...waiting.map((id) => ({ id })),
    ...lessons.map((id) => ({ id, task: "followup" as const })),
  ];
  let queued = true;
  if (jobs.length)
    try {
      if (!env.MAGNET_QUEUE) throw new Error("no MAGNET_QUEUE binding");
      await env.MAGNET_QUEUE.sendBatch(jobs.map((body) => ({ body })));
    } catch (err) {
      queued = false;
      console.error("magnet: sweep could not queue", (err as Error).message);
    }

  // 2. Emails whose day has come.
  const emails = await sendDue(db, deps, site, EMAILS_PER_RUN);

  // 3. Once a day, the digest.
  let sent = false;
  if (now.getUTCHours() === digestHour(env.MAGNET_DIGEST_HOUR_UTC)) {
    const message = digest(
      await leadsBetween(db, new Date(now.getTime() - DAY_MS), now),
      await stuckCount(db),
      {
        today: await spentOn(db, dayOf(now)),
        yesterday: await spentOn(db, dayOf(new Date(now.getTime() - DAY_MS))),
      },
      site,
    );
    if (message) {
      await deps.alert({ ...message, idempotencyKey: `magnet-digest-${dayOf(now)}` });
      sent = true;
    }
  }

  return {
    requeued: queued ? waiting.length : 0,
    followUps: queued ? lessons.length : 0,
    emails,
    digest: sent,
  };
}
