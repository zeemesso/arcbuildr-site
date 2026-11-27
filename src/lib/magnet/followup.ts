import type { Env } from "../env";
import { getMagnet } from "../../magnets/registry";
import { capMicroUsd, fitsCap } from "./budget";
import { SITE_URL, type JobDeps } from "./job";
import { lessonEmails } from "./mail";
import { followUpCall, readFollowUps } from "./prompt";
import {
  claimFollowUp,
  getBrief,
  getLead,
  recordUsage,
  scheduleEmails,
  skipFollowUp,
  type Sql,
} from "./store";

// The lesson emails for one lead, written in one model call after the deliverable is done.
// The hourly sweep queues this for every finished lead that has none yet, so a busy API or a
// reached cap only delays them. Nothing here changes the lead's deliverable or its status.

/**
 * written: the emails are stored and will go out on their days.
 * none: this lead gets no lesson emails (no plan for them in the brief, or tries used up).
 * later: not now (no key, cap reached, busy API, unusable answer); the sweep comes back.
 */
export type FollowUpOutcome = "written" | "none" | "later";

export async function writeFollowUps(
  env: Env,
  id: string,
  deps: Pick<JobDeps, "now" | "caller">,
): Promise<FollowUpOutcome> {
  const db: Sql | undefined = env.DB;
  if (!db) return "later";
  const lead = await getLead(db, id);
  if (!lead || lead.status !== "done" || lead.unsubscribedAt) return "none";
  const magnet = getMagnet(lead.magnet);
  const brief = magnet ? await getBrief(db, magnet.slug) : null;
  const call = magnet && brief ? followUpCall(magnet, brief, lead) : null;
  if (!magnet || !brief?.followUp || !call) {
    await skipFollowUp(db, id);
    return "none";
  }

  // Checks that cost nothing and do not count as a try.
  const { caller } = deps;
  if (!caller) return "later";
  if (!(await fitsCap(db, deps.now(), capMicroUsd(env.MAGNET_DAILY_CAP_USD), [call])))
    return "later";
  if (!(await claimFollowUp(db, id))) return "none";

  const result = await caller(call);
  if ("usage" in result) await recordUsage(db, id, result.usage, deps.now());
  if (!result.ok) {
    console.error("magnet: lesson emails not written", id, result.error);
    return "later";
  }
  const written = readFollowUps(result.text, brief.followUp.days.length);
  if (!written) {
    console.error("magnet: lesson emails not usable", id);
    return "later";
  }
  const site = env.SITE_URL || SITE_URL;
  await scheduleEmails(
    db,
    id,
    lessonEmails(magnet, lead, written, brief.followUp.days, site, deps.now()),
  );
  return "written";
}
