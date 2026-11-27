import type { Env } from "../env";
import { sendAlert } from "../resend";
import { getMagnet } from "../../magnets/registry";
import type { MagnetDefinition } from "../../magnets/types";
import { capMicroUsd, fitsCap } from "./budget";
import { anthropicClient, callerFor, type ModelCaller } from "./claude";
import { planPagePath } from "./contract";
import { linkEmail, mailerFor, sendDue, type Mailer } from "./mail";
import { deliverableProblem, readScreen, screenCall, writerCall } from "./prompt";
import { lookupOrigin, type LinkOrigin } from "./replyrail";
import {
  claimLead,
  finishLead,
  getBrief,
  getLead,
  recordUsage,
  saveScreen,
  scheduleEmails,
  type Lead,
  type Sql,
} from "./store";

// One lead, from stored answers to a stored deliverable. Run by the queue consumer.
// Order matters for money: nothing is spent before the cap is checked, the cheap screen
// runs before the writer, and every call is counted the moment it returns.

/**
 * done / rejected / failed: finished, the lead will not run again.
 * held: waits for us (cap reached, missing key or brief, refused, unusable text). The
 *       hourly sweep queues it again.
 * retry: the API was busy; the queue should deliver the lead again later.
 * skip: nothing to do (unknown lead, or another run has it).
 */
export type RunOutcome = "done" | "rejected" | "failed" | "held" | "retry" | "skip";

/** Paid or failed tries per lead before we stop and tell Zyade. */
export const MAX_ATTEMPTS = 3;

export const SITE_URL = "https://arcbuildr.co";

export interface JobDeps {
  now: () => Date;
  /** Null when there is no API key. */
  caller: ModelCaller | null;
  alert: (message: { subject: string; text: string }) => Promise<unknown>;
  /** Sends email to leads. Null until a sender on our own domain is set. */
  mail: Mailer | null;
  /** Asks ReplyRail which Instagram account got the link with this code. */
  origin: (code: string) => Promise<LinkOrigin | null>;
}

export const jobDeps = (env: Env): JobDeps => ({
  now: () => new Date(),
  caller: env.ANTHROPIC_API_KEY ? callerFor(anthropicClient(env.ANTHROPIC_API_KEY)) : null,
  mail: mailerFor(env),
  origin: (code) => lookupOrigin(env, code),
  alert: async (message) => {
    const sent = await sendAlert(env, message);
    if (!sent.ok) console.error("magnet: alert failed", sent.error);
  },
});

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const dollars = (microUsd: number) => `$${(microUsd / 1e6).toFixed(3)}`;

function leadLines(lead: Lead, magnet: MagnetDefinition | undefined, site: string): string[] {
  const answers = (magnet?.questions ?? [])
    .filter((question) => lead.answers[question.id])
    .map((question) => `${question.label}\n  ${oneLine(lead.answers[question.id]!).slice(0, 400)}`);
  return [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Instagram: ${lead.instagram}`,
    `Phone: ${lead.phone || "-"}`,
    `Time zone: ${lead.tz || "-"}`,
    `Came from: ${lead.rr ? `ReplyRail link ${lead.rr}` : "-"}${lead.utm ? ` (${lead.utm})` : ""}`,
    `Their page: ${site}${planPagePath(lead.token)}`,
    "",
    ...answers,
  ];
}

export async function runLead(
  env: Env,
  id: string,
  deps: JobDeps = jobDeps(env),
): Promise<RunOutcome> {
  const db: Sql | undefined = env.DB;
  if (!db) {
    console.error("magnet: no DB binding");
    return "retry";
  }
  const lead = await getLead(db, id);
  if (!lead || !["queued", "held", "running"].includes(lead.status)) return "skip";
  const magnet = getMagnet(lead.magnet);
  const site = env.SITE_URL || SITE_URL;
  const label = `${lead.name} (${lead.magnet})`;

  /** Parks the lead and tells Zyade once per reason, not once per hourly sweep. */
  const hold = async (reason: string): Promise<RunOutcome> => {
    await finishLead(db, id, { status: "held", error: reason }, deps.now());
    if (lead.error !== reason)
      await deps.alert({
        subject: oneLine(`Magnet lead waiting: ${label}`),
        text: [`Not written yet: ${reason}`, "", ...leadLines(lead, magnet, site)].join("\n"),
      });
    return "held";
  };

  // Checks that cost nothing and do not count as an attempt.
  const brief = magnet ? await getBrief(db, magnet.slug) : null;
  if (!magnet || !brief) return hold(`no ${magnet ? "brief" : "magnet"} for "${lead.magnet}"`);
  const { caller } = deps;
  if (!caller) return hold("no ANTHROPIC_API_KEY");
  const screen = screenCall(magnet, brief, lead);
  const writer = writerCall(magnet, brief, lead);
  const screened = lead.score !== null;
  const planned = screened ? [writer] : [screen, writer];
  if (!(await fitsCap(db, deps.now(), capMicroUsd(env.MAGNET_DAILY_CAP_USD), planned)))
    return hold("daily spend cap reached");

  if (!(await claimLead(db, id, deps.now()))) return "skip";
  const attempt = lead.attempts + 1;

  /** A try that did not produce a deliverable: again later, or stop after the last one. */
  const again = async (reason: string, wait: "queue" | "sweep"): Promise<RunOutcome> => {
    if (attempt < MAX_ATTEMPTS) {
      if (wait === "sweep") return hold(reason);
      await finishLead(db, id, { status: "queued", error: reason }, deps.now());
      return "retry";
    }
    await finishLead(db, id, { status: "failed", error: reason }, deps.now());
    await deps.alert({
      subject: oneLine(`Magnet lead FAILED: ${label}`),
      text: [
        `Gave up after ${attempt} tries: ${reason}`,
        "",
        ...leadLines(lead, magnet, site),
      ].join("\n"),
    });
    return "failed";
  };

  // Step 1: the screen. Skipped when an earlier try already paid for it.
  let score = lead.score;
  let setterNote = lead.setterNote ?? "";
  if (!screened) {
    const result = await caller(screen);
    if ("usage" in result) await recordUsage(db, id, result.usage, deps.now());
    if (!result.ok)
      return result.kind === "retry"
        ? again(result.error, "queue")
        : again(`screen: ${result.error}`, "sweep");
    const verdict = readScreen(result.text);
    if (!verdict) return again("screen: answer was not the expected JSON", "queue");
    await saveScreen(db, id, verdict);
    if (verdict.verdict === "reject") {
      await finishLead(db, id, { status: "rejected", error: verdict.reason }, deps.now());
      await deps.alert({
        subject: oneLine(`Magnet form rejected: ${label}`),
        text: [`Not written. Reason: ${verdict.reason}`, "", ...leadLines(lead, magnet, site)].join(
          "\n",
        ),
      });
      return "rejected";
    }
    score = verdict.score;
    setterNote = verdict.setterNote;
  }

  // Step 2: the deliverable.
  const result = await caller(writer);
  if ("usage" in result) await recordUsage(db, id, result.usage, deps.now());
  if (!result.ok)
    return result.kind === "retry"
      ? again(result.error, "queue")
      : again(`writer: ${result.error}`, "sweep");
  const problem = deliverableProblem(result.text, brief);
  if (problem) return again(`writer: ${problem}`, "sweep");

  await finishLead(db, id, { status: "done", deliverable: result.text }, deps.now());

  // The deliverable is stored. Nothing below may undo that, so each part fails on its own.
  let mailed = "not sent";
  try {
    await scheduleEmails(db, id, [linkEmail(magnet, lead, site, deps.now())]);
    const report = await sendDue(db, deps, site, 1, id);
    if (report.sent) mailed = "sent";
    else if (report.waiting) mailed = "NOT SENT, no MAIL_FROM yet. Send them the link yourself";
    else mailed = "not sent yet, we try again within the hour";
  } catch (err) {
    console.error("magnet: link email failed", id, (err as Error).message);
  }
  const origin = lead.rr ? await deps.origin(lead.rr).catch(() => null) : null;
  const typed = lead.instagram.replace(/^@/, "").toLowerCase();
  const originLines = origin
    ? [
        oneLine(
          `ReplyRail sent the link to @${origin.username}${origin.automation ? ` (automation ${origin.automation}, ${origin.trigger || "trigger unknown"})` : ""}.`,
        ),
        ...(origin.username.toLowerCase() === typed
          ? []
          : ["The form names a different handle. Message the ReplyRail one first."]),
      ]
    : [];
  const cost = (await getLead(db, id))?.costMicroUsd ?? 0;
  await deps.alert({
    subject: oneLine(`Magnet lead ${score}/5: ${label}`),
    text: [
      setterNote,
      ...originLines,
      "",
      ...leadLines(lead, magnet, site),
      "",
      `Link email: ${mailed}.`,
      `Cost: ${dollars(cost)}`,
    ].join("\n"),
  });
  return "done";
}
