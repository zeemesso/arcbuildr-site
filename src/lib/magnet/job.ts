import type { Env } from "../env";
import { sendAlert, type AlertMessage } from "../resend";
import { getMagnet } from "../../magnets/registry";
import type { MagnetDefinition } from "../../magnets/types";
import { capMicroUsd, fitsCap } from "./budget";
import { anthropicClient, callerFor, callWithinCap, type ModelCaller } from "./claude";
import { planPagePath } from "./contract";
import { linkEmail, mailerFor, sendDue, type Mailer } from "./mail";
import { deliverableProblem, readScreen, screenCall, writerCall } from "./prompt";
import { lookupOrigin, type LinkOrigin } from "./replyrail";
import {
  claimLead,
  finishLead,
  getBrief,
  getLead,
  MAX_ATTEMPTS,
  saveScreen,
  STALE_RUN_MS,
  type Lead,
  type Sql,
} from "./store";

// One lead, from stored answers to a stored deliverable. Run by the queue consumer.
// The cheap screen runs before the writer. Each call reserves spend before it goes out.

/**
 * done / rejected / failed: finished, the lead will not run again.
 * held: waits for us (cap reached, missing key or brief, refused, unusable text). The
 *       hourly sweep queues it again.
 * retry: the API was busy; the queue should deliver the lead again later.
 * skip: nothing to do (unknown lead, or another run has it).
 */
export type RunOutcome = "done" | "rejected" | "failed" | "held" | "retry" | "skip";

export { MAX_ATTEMPTS } from "./store";

export const SITE_URL = "https://arcbuildr.co";

export interface JobDeps {
  now: () => Date;
  /** Null when there is no API key. */
  caller: ModelCaller | null;
  alert: (message: AlertMessage) => Promise<unknown>;
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
  const stale = new Date(deps.now().getTime() - STALE_RUN_MS).toISOString();
  if (lead.status === "running" && lead.startedAt !== null && lead.startedAt >= stale)
    return "skip";
  const magnet = getMagnet(lead.magnet);
  const site = env.SITE_URL || SITE_URL;
  const label = `${lead.name} (${lead.magnet})`;
  let expected = { status: lead.status, attempts: lead.attempts };
  const finish = (end: Parameters<typeof finishLead>[3]) =>
    finishLead(db, id, expected, end, deps.now());

  const fail = async (reason: string): Promise<RunOutcome> => {
    if (!(await finish({ status: "failed", error: reason }))) return "skip";
    await deps.alert({
      subject: oneLine(`Magnet lead FAILED: ${label}`),
      text: [
        `Gave up after ${expected.attempts} tries: ${reason}`,
        "",
        ...leadLines(lead, magnet, site),
      ].join("\n"),
    });
    return "failed";
  };
  if (lead.attempts >= MAX_ATTEMPTS) return fail(lead.error ?? "attempt limit reached");

  /** Parks the lead and tells Zyade once per reason, not once per hourly sweep. */
  const hold = async (reason: string): Promise<RunOutcome> => {
    if (!(await finish({ status: "held", error: reason }))) return "skip";
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
  const cap = capMicroUsd(env.MAGNET_DAILY_CAP_USD);
  const capReason = "daily spend cap reached";
  if (!(await fitsCap(db, deps.now(), cap, planned))) return hold(capReason);

  if (!(await claimLead(db, lead, deps.now()))) return "skip";
  const attempt = lead.attempts + 1;
  expected = { status: "running", attempts: attempt };

  /** A try that did not produce a deliverable: again later, or stop after the last one. */
  const again = async (reason: string, wait: "queue" | "sweep"): Promise<RunOutcome> => {
    if (attempt >= MAX_ATTEMPTS) return fail(reason);
    if (wait === "sweep") return hold(reason);
    return (await finish({ status: "queued", error: reason })) ? "retry" : "skip";
  };

  // Step 1: the screen. Skipped when an earlier try already paid for it.
  let score = lead.score;
  let setterNote = lead.setterNote ?? "";
  if (!screened) {
    const result = await callWithinCap(db, id, caller, screen, deps.now(), cap);
    if (!result) return hold(capReason);
    if (!result.ok)
      return result.kind === "retry"
        ? again(result.error, "queue")
        : again(`screen: ${result.error}`, "sweep");
    const verdict = readScreen(result.text);
    if (!verdict) return again("screen: answer was not the expected JSON", "queue");
    if (verdict.verdict === "reject") {
      if (!(await finish({ status: "rejected", error: verdict.reason, screen: verdict })))
        return "skip";
      await deps.alert({
        subject: oneLine(`Magnet form rejected: ${label}`),
        text: [`Not written. Reason: ${verdict.reason}`, "", ...leadLines(lead, magnet, site)].join(
          "\n",
        ),
      });
      return "rejected";
    }
    if (!(await saveScreen(db, id, attempt, verdict))) return "skip";
    score = verdict.score;
    setterNote = verdict.setterNote;
  }

  // Step 2: the deliverable.
  const result = await callWithinCap(db, id, caller, writer, deps.now(), cap);
  if (!result) return hold(capReason);
  if (!result.ok)
    return result.kind === "retry"
      ? again(result.error, "queue")
      : again(`writer: ${result.error}`, "sweep");
  const problem = deliverableProblem(result.text, brief);
  if (problem) return again(`writer: ${problem}`, "sweep");

  const link = linkEmail(magnet, lead, site, deps.now());
  if (!(await finish({ status: "done", deliverable: result.text, link }))) return "skip";

  // The deliverable is stored. Nothing below may undo that, so each part fails on its own.
  let mailed = "not sent";
  try {
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
