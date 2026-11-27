import type { Env } from "../env";
import { sendMail, type Mail, type SendAlertResult } from "../resend";
import type { MagnetDefinition } from "../../magnets/types";
import { planPagePath, unsubscribeApiPath, unsubscribePagePath } from "./contract";
import { firstName, type FollowUpEmail } from "./prompt";
import { claimEmail, closeEmail, dueEmails, type Lead, type NewEmail, type Sql } from "./store";
import { EMAIL_TEXT } from "./text";

// Emails to leads: what they say and how they go out. Plain text only. Every email carries
// a stop link, and the same address as a List-Unsubscribe header so mail apps show a button.

export type Mailer = (mail: Mail) => Promise<SendAlertResult>;

/** Null until a sender on our own domain is set: Resend's test sender reaches only us. */
export const mailerFor = (env: Env): Mailer | null =>
  env.RESEND_API_KEY && env.MAIL_FROM ? (mail) => sendMail(env, mail) : null;

const DAY_MS = 24 * 60 * 60 * 1000;

const frame = (lead: Lead, middle: string) =>
  [EMAIL_TEXT.greeting(firstName(lead.name)), middle, EMAIL_TEXT.signoff].join("\n\n");

/** Step 0: the deliverable is ready, here is the link. */
export function linkEmail(
  magnet: MagnetDefinition | undefined,
  lead: Lead,
  site: string,
  now: Date,
): NewEmail {
  const deliverable = magnet?.deliverableName ?? "your plan";
  return {
    step: 0,
    dueAt: now.toISOString(),
    subject: EMAIL_TEXT.linkSubject(deliverable),
    body: frame(lead, EMAIL_TEXT.linkBody(deliverable, `${site}${planPagePath(lead.token)}`)),
  };
}

/** Steps 1 and up: the model's lesson emails, each with its video link when the magnet has one. */
export function lessonEmails(
  magnet: MagnetDefinition,
  lead: Lead,
  written: FollowUpEmail[],
  days: number[],
  site: string,
  now: Date,
): NewEmail[] {
  return written.map((email, i) => {
    const lesson = magnet.lessons[i];
    const url = lesson && (lesson.url.startsWith("/") ? `${site}${lesson.url}` : lesson.url);
    const middle = lesson
      ? `${email.body}\n\n${EMAIL_TEXT.lesson(lesson.title, url!)}`
      : email.body;
    return {
      step: i + 1,
      dueAt: new Date(now.getTime() + days[i]! * DAY_MS).toISOString(),
      subject: email.subject,
      body: frame(lead, middle),
    };
  });
}

/** An email this late is not sent any more. It happens when sending was off for days. */
export const EXPIRE_MS = 2 * DAY_MS;

export interface SendReport {
  sent: number;
  failed: number;
  /** Due, but there is no sender yet. */
  waiting: number;
}

/** Sends the emails that are due, oldest first. `leadId` limits it to one lead. */
export async function sendDue(
  db: Sql,
  deps: { now: () => Date; mail: Mailer | null },
  site: string,
  limit: number,
  leadId?: string,
): Promise<SendReport> {
  const report: SendReport = { sent: 0, failed: 0, waiting: 0 };
  const due = await dueEmails(db, deps.now(), limit, leadId);
  if (!deps.mail) return { ...report, waiting: due.length };

  for (const email of due) {
    if (!(await claimEmail(db, email.leadId, email.step, deps.now(), email.dueAt))) continue;
    if (deps.now().getTime() - new Date(email.dueAt).getTime() > EXPIRE_MS) {
      await closeEmail(
        db,
        email.leadId,
        email.step,
        { sent: false, error: "expired", final: true },
        deps.now(),
      );
      report.failed += 1;
      continue;
    }
    const result = await deps.mail({
      to: email.to,
      subject: email.subject,
      idempotencyKey: `magnet-${email.leadId}-${email.step}-${email.dueAt}`,
      text: `${email.body}\n\n--\n${EMAIL_TEXT.footer(`${site}${unsubscribePagePath(email.unsub)}`)}`,
      headers: {
        "List-Unsubscribe": `<${site}${unsubscribeApiPath(email.unsub)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.ok) {
      await closeEmail(db, email.leadId, email.step, { sent: true }, deps.now());
      report.sent += 1;
    } else {
      console.error("magnet: email failed", email.leadId, email.step, result.error);
      await closeEmail(
        db,
        email.leadId,
        email.step,
        { sent: false, error: result.error },
        deps.now(),
      );
      report.failed += 1;
    }
  }
  return report;
}
