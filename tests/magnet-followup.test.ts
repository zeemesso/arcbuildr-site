import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env, MagnetJob } from "../src/lib/env";
import { worstCaseMicroUsd } from "../src/lib/magnet/budget";
import type { ModelOutcome } from "../src/lib/magnet/claude";
import { writeFollowUps } from "../src/lib/magnet/followup";
import { handleSubmit } from "../src/lib/magnet/intake";
import { runLead, type JobDeps } from "../src/lib/magnet/job";
import { EXPIRE_MS, sendDue, type Mailer } from "../src/lib/magnet/mail";
import {
  SCREEN_MODEL,
  WRITER_MODEL,
  followUpCall,
  readFollowUps,
  type ModelCall,
} from "../src/lib/magnet/prompt";
import { lookupOrigin } from "../src/lib/magnet/replyrail";
import {
  MAX_FOLLOWUP_TRIES,
  MAX_SENDS,
  RESEND_EVERY_MS,
  STALE_RUN_MS,
  claimEmail,
  closeEmail,
  dayOf,
  dueEmails,
  followUpCandidates,
  getLead,
  insertLead,
  putBrief,
  resendLink,
  reserveSpend,
  scheduleEmails,
  spentOn,
  unsubscribe,
  type NewLead,
  type Sql,
} from "../src/lib/magnet/store";
import { digest, digestHour, sweep } from "../src/lib/magnet/sweep";
import { sendAlert, sendMail, type AlertMessage, type Mail } from "../src/lib/resend";
import { testSample, testSampleBrief } from "../src/magnets/test-sample";
import type { MagnetBrief } from "../src/magnets/types";
import { checkBrief } from "../src/magnets/types";
import worker from "../src/worker";
import { magnetEnv, submit, validForm } from "./helpers/magnet-fixtures";

/** The Worker's fetch takes a context; these routes never use it. */
const ctx = { waitUntil() {} } as unknown as ExecutionContext;

const start = new Date("2026-11-27T10:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const UNSUB = "unsubunsubunsubunsub12";

const newLead = (over: Partial<NewLead> = {}): NewLead => ({
  id: "lead-1",
  token: "tokentokentokentoken12",
  magnet: "test-sample",
  createdAt: start.toISOString(),
  name: "TEST Hanane Idrissi",
  email: "hanane@example.com",
  instagram: "@hanane.co",
  phone: "",
  answers: { business: "Coaching for dentists", stuck: "Nobody books.", posting: "Sometimes" },
  page: "",
  utm: "",
  rr: "abc12345",
  tz: "Africa/Casablanca",
  unsub: UNSUB,
  ...over,
});

const brief: MagnetBrief = {
  ...testSampleBrief,
  followUp: { days: [1, 3], guidance: "1. Say who it is for.\n2. One post a week." },
};

const PLAN = `## Where you are\nHanane, you coach dentists. ${"Real words here. ".repeat(30)}\n\n## Next\nSay who it is for.`;
const BODY =
  "You said nobody books from your posts. Start with the first line of your profile: say who you help and what changes for them. What does a dentist get after working with you?";
const usage = (model: string, costMicroUsd: number) => ({
  model,
  inputTokens: 1000,
  outputTokens: 500,
  costMicroUsd,
});
const screenOk = (): ModelOutcome => ({
  ok: true,
  text: JSON.stringify({ verdict: "write", reason: "Real.", score: 4, setter_note: "Coach." }),
  usage: usage(SCREEN_MODEL, 400),
});
const writeOk = (): ModelOutcome => ({ ok: true, text: PLAN, usage: usage(WRITER_MODEL, 90_000) });
const emailsOk = (
  emails: object[] = [
    { subject: "Your first line", body: BODY },
    { subject: "One post a week", body: BODY },
  ],
): ModelOutcome => ({
  ok: true,
  text: JSON.stringify({ emails }),
  usage: usage(WRITER_MODEL, 20_000),
});

let env: Env;
let db: Sql;
let sent: MagnetJob[];
let clock: Date;
let mails: Mail[];
let alerts: AlertMessage[];
let calls: ModelCall[];
let mailAnswer: Awaited<ReturnType<Mailer>>;

const deps = (answers: ModelOutcome[] = [], over: Partial<JobDeps> = {}): JobDeps => ({
  now: () => clock,
  caller: async (call) => {
    calls.push(call);
    const next = answers.shift();
    if (!next) throw new Error("unexpected model call");
    return next;
  },
  alert: async (message) => void alerts.push(message),
  mail: async (mail) => {
    mails.push(mail);
    return mailAnswer;
  },
  origin: async () => null,
  ...over,
});

/** A lead whose deliverable is written, with the link email already sent. */
async function finishedLead() {
  await insertLead(db, newLead());
  await runLead(env, "lead-1", deps([screenOk(), writeOk()]));
  mails = [];
  alerts = [];
  calls = [];
}

beforeEach(async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const queue: MagnetJob[] = [];
  ({ env, db } = magnetEnv({
    MAGNET_QUEUE: {
      send: async (job: MagnetJob) => void queue.push(job),
      sendBatch: async (jobs: { body: MagnetJob }[]) =>
        void queue.push(...jobs.map((job) => job.body)),
    } as unknown as Env["MAGNET_QUEUE"],
  }));
  sent = queue;
  clock = start;
  mails = [];
  alerts = [];
  calls = [];
  mailAnswer = { ok: true, id: "mail-1" };
  await putBrief(db, brief, start);
});
afterEach(() => vi.unstubAllGlobals());

describe("brief", () => {
  it("accepts a follow-up plan and names what is wrong with a bad one", () => {
    expect(checkBrief(brief)).toEqual([]);
    expect(checkBrief({ ...brief, followUp: { days: [3, 1], guidance: "x" } })).toHaveLength(1);
    expect(checkBrief({ ...brief, followUp: { days: [], guidance: "x" } })).toHaveLength(1);
    expect(checkBrief({ ...brief, followUp: { days: [1, 2.5], guidance: "x" } })).toHaveLength(1);
    expect(checkBrief({ ...brief, followUp: { days: [1], guidance: " " } })).toHaveLength(1);
  });
});

describe("link email", () => {
  it("TEST retries a failed link insert before marking the plan done", async () => {
    await insertLead(db, newLead());
    await db
      .prepare(
        `CREATE TRIGGER fail_link BEFORE INSERT ON magnet_emails
      WHEN NEW.step = 0 BEGIN SELECT RAISE(ABORT, 'link failed'); END`,
      )
      .run();
    await expect(runLead(env, "lead-1", deps([screenOk(), writeOk()]))).rejects.toThrow(
      "link failed",
    );
    expect(await getLead(db, "lead-1")).toMatchObject({ status: "running", deliverable: null });
    expect(mails).toEqual([]);
    expect(alerts).toEqual([]);
    await db.prepare("DROP TRIGGER fail_link").run();
    clock = new Date(start.getTime() + STALE_RUN_MS + 1);
    expect(await runLead(env, "lead-1", deps([writeOk()]))).toBe("done");
    expect(mails).toHaveLength(1);
  });

  it("goes out when the deliverable is done, with the private link and a stop link", async () => {
    await insertLead(db, newLead());
    expect(await runLead(env, "lead-1", deps([screenOk(), writeOk()]))).toBe("done");
    expect(mails).toHaveLength(1);
    const mail = mails[0]!;
    expect(mail.to).toBe("hanane@example.com");
    expect(mail.subject).toBe("Your sample plan is ready");
    expect(mail.text).toContain("Hi TEST,");
    expect(mail.text).toContain("https://arcbuildr.co/plan/#tokentokentokentoken12");
    expect(mail.text).toContain(`https://arcbuildr.co/unsubscribe/#${UNSUB}`);
    expect(mail.text).not.toContain("api/magnet");
    expect(mail.headers).toEqual({
      "List-Unsubscribe": `<https://arcbuildr.co/api/magnet/unsubscribe/${UNSUB}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(alerts[0]!.text).toContain("Link email: sent.");
    expect(await dueEmails(db, clock, 10)).toEqual([]);
  });

  it("waits when there is no sender, and tells Zyade to send the link himself", async () => {
    await insertLead(db, newLead());
    expect(await runLead(env, "lead-1", deps([screenOk(), writeOk()], { mail: null }))).toBe(
      "done",
    );
    expect(alerts[0]!.text).toContain("NOT SENT, no MAIL_FROM yet");
    expect(await dueEmails(db, clock, 10)).toHaveLength(1);
  });

  it("keeps the lead done when the mail provider fails, and tries again later", async () => {
    await insertLead(db, newLead());
    mailAnswer = { ok: false, error: "resend 500 no_name" };
    expect(await runLead(env, "lead-1", deps([screenOk(), writeOk()]))).toBe("done");
    expect((await getLead(db, "lead-1"))!.status).toBe("done");
    expect(alerts[0]!.text).toContain("not sent yet");
    mailAnswer = { ok: true, id: "mail-2" };
    expect(await sendDue(db, deps(), "https://arcbuildr.co", 10)).toMatchObject({ sent: 1 });
  });

  it("names the Instagram account ReplyRail sent the link to", async () => {
    await insertLead(db, newLead());
    const origin = vi.fn(async () => ({
      username: "other.name",
      automation: "plan",
      trigger: "comment",
    }));
    await runLead(env, "lead-1", deps([screenOk(), writeOk()], { origin }));
    expect(origin).toHaveBeenCalledWith("abc12345");
    expect(alerts[0]!.text).toContain(
      "ReplyRail sent the link to @other.name (automation plan, comment).",
    );
    expect(alerts[0]!.text).toContain("The form names a different handle.");
  });

  it("says nothing extra when the handle matches, and survives a failed lookup", async () => {
    await insertLead(db, newLead());
    const origin = async () => ({ username: "Hanane.co", automation: "", trigger: "" });
    await runLead(env, "lead-1", deps([screenOk(), writeOk()], { origin }));
    expect(alerts[0]!.text).toContain("ReplyRail sent the link to @Hanane.co.");
    expect(alerts[0]!.text).not.toContain("different handle");

    await insertLead(
      db,
      newLead({ id: "lead-2", token: "t2", email: "b@example.com", unsub: "u2" }),
    );
    const broken = async () => Promise.reject(new Error("down"));
    expect(await runLead(env, "lead-2", deps([screenOk(), writeOk()], { origin: broken }))).toBe(
      "done",
    );
  });
});

describe("sending", () => {
  beforeEach(async () => {
    await insertLead(db, newLead());
    await db.prepare("UPDATE magnet_leads SET status = 'done'").run();
    await scheduleEmails(db, "lead-1", [
      {
        step: 1,
        dueAt: new Date(start.getTime() + DAY).toISOString(),
        subject: "One",
        body: "Body one",
      },
      {
        step: 2,
        dueAt: new Date(start.getTime() + 3 * DAY).toISOString(),
        subject: "Two",
        body: "Body two",
      },
    ]);
  });

  it("TEST only lists and claims links for a ready plan", async () => {
    await db.prepare("UPDATE magnet_leads SET status = 'running'").run();
    await scheduleEmails(db, "lead-1", [
      { step: 0, dueAt: start.toISOString(), subject: "Link", body: "Plan link" },
    ]);
    expect(await dueEmails(db, start, 10)).toEqual([]);
    expect(await claimEmail(db, "lead-1", 0, start)).toBe(false);
    await db.prepare("UPDATE magnet_leads SET status = 'done'").run();
    expect(await dueEmails(db, start, 10)).toHaveLength(1);
    expect(await claimEmail(db, "lead-1", 0, start)).toBe(true);
  });

  it("TEST blocks a claim after opt-out and preserves cancelled sends", async () => {
    clock = new Date(start.getTime() + 4 * DAY);
    expect(await claimEmail(db, "lead-1", 1, clock)).toBe(true);
    // Check the gap after the lead is updated and before its emails are cancelled.
    await db.prepare("UPDATE magnet_leads SET unsubscribed_at = ?").bind(clock.toISOString()).run();
    expect(await claimEmail(db, "lead-1", 2, clock)).toBe(false);
    expect(await unsubscribe(db, UNSUB, clock)).toBe(true);
    await closeEmail(db, "lead-1", 1, { sent: true }, clock);
    await closeEmail(db, "lead-1", 2, { sent: false, error: "busy" }, clock);
    expect(await db.prepare("SELECT DISTINCT status FROM magnet_emails").all()).toEqual({
      results: [{ status: "cancelled" }],
    });
  });

  it("sends an email on its day and not before, and only once", async () => {
    expect(await sendDue(db, deps(), "https://x.test", 10)).toEqual({
      sent: 0,
      failed: 0,
      waiting: 0,
    });
    clock = new Date(start.getTime() + DAY + HOUR);
    expect(await sendDue(db, deps(), "https://x.test", 10)).toMatchObject({ sent: 1 });
    expect(await sendDue(db, deps(), "https://x.test", 10)).toMatchObject({ sent: 0 });
    expect(mails.map((mail) => mail.subject)).toEqual(["One"]);
  });

  it("does not store an email twice for the same step", async () => {
    await scheduleEmails(db, "lead-1", [
      { step: 1, dueAt: start.toISOString(), subject: "Again", body: "x" },
    ]);
    expect(await dueEmails(db, start, 10)).toEqual([]);
  });

  it("gives one caller the claim, and frees a claim that was never closed", async () => {
    clock = new Date(start.getTime() + DAY + HOUR);
    expect(await claimEmail(db, "lead-1", 1, clock)).toBe(true);
    expect(await claimEmail(db, "lead-1", 1, clock)).toBe(false);
    expect(await dueEmails(db, clock, 10)).toEqual([]);
    const later = new Date(clock.getTime() + HOUR);
    expect(await dueEmails(db, later, 10)).toHaveLength(1);
    expect(await claimEmail(db, "lead-1", 1, later)).toBe(true);
  });

  it(`retries a failed send, and gives up after ${MAX_SENDS} tries`, async () => {
    clock = new Date(start.getTime() + DAY + HOUR);
    mailAnswer = { ok: false, error: "resend 500 no_name" };
    for (let i = 0; i < MAX_SENDS; i++)
      expect(await sendDue(db, deps(), "https://x.test", 10)).toMatchObject({ failed: 1 });
    expect(await sendDue(db, deps(), "https://x.test", 10)).toEqual({
      sent: 0,
      failed: 0,
      waiting: 0,
    });
    expect(mails).toHaveLength(MAX_SENDS);
    expect(new Set(mails.map((mail) => mail.idempotencyKey))).toEqual(
      new Set([`magnet-lead-1-1-${new Date(start.getTime() + DAY).toISOString()}`]),
    );
  });

  it("drops an email that is days late instead of sending it", async () => {
    clock = new Date(start.getTime() + DAY + EXPIRE_MS + HOUR);
    // Email one is more than two days late. Email two became due an hour ago.
    expect(await sendDue(db, deps(), "https://x.test", 10)).toMatchObject({ sent: 1, failed: 1 });
    expect(mails.map((mail) => mail.subject)).toEqual(["Two"]);
    expect(await dueEmails(db, clock, 10)).toEqual([]);
  });

  it("sends nothing after the lead stops the emails", async () => {
    expect(await unsubscribe(db, "nobodynobodynobody1234", start)).toBe(false);
    expect(await unsubscribe(db, UNSUB, start)).toBe(true);
    expect(await unsubscribe(db, UNSUB, start)).toBe(true);
    clock = new Date(start.getTime() + 4 * DAY);
    expect(await sendDue(db, deps(), "https://x.test", 10)).toEqual({
      sent: 0,
      failed: 0,
      waiting: 0,
    });
    expect((await getLead(db, "lead-1"))!.unsubscribedAt).toBe(start.toISOString());
  });

  it("closeEmail keeps a sent email sent", async () => {
    clock = new Date(start.getTime() + DAY + HOUR);
    await claimEmail(db, "lead-1", 1, clock);
    await closeEmail(db, "lead-1", 1, { sent: true }, clock);
    expect(await claimEmail(db, "lead-1", 1, new Date(clock.getTime() + DAY))).toBe(false);
  });
});

describe("unsubscribe route", () => {
  const call = (method: string, code = UNSUB) =>
    worker.fetch(
      new Request(`https://x.test/api/magnet/unsubscribe/${code}`, { method }) as never,
      env,
      ctx,
    );

  beforeEach(async () => void (await insertLead(db, newLead())));

  it("does nothing on GET but forward to the page, so a mail scanner cannot unsubscribe anyone", async () => {
    const res = await call("GET");
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(`/unsubscribe/#${UNSUB}`);
    expect((await getLead(db, "lead-1"))!.unsubscribedAt).toBeNull();
  });

  it("stops the emails on POST, and answers a wrong code the same way", async () => {
    const res = await call("POST");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await getLead(db, "lead-1"))!.unsubscribedAt).not.toBeNull();
    const wrong = await call("POST", "nobodynobodynobody1234");
    expect(wrong.status).toBe(200);
    expect(await wrong.json()).toEqual({ ok: true });
    expect((await call("POST", "short")).status).toBe(400);
  });
});

describe("asking again", () => {
  it("sends the link again for a second form from the same email, once a day at most", async () => {
    await finishedLead();
    const second = {
      now: () => clock,
      newId: () => "lead-2",
      newToken: () => "othertokenothertoken12",
    };

    clock = new Date(start.getTime() + HOUR);
    expect((await handleSubmit(submit(validForm()), env, "test-sample", second)).status).toBe(409);
    expect(await dueEmails(db, clock, 10)).toEqual([]);

    clock = new Date(start.getTime() + RESEND_EVERY_MS + HOUR);
    expect((await handleSubmit(submit(validForm()), env, "test-sample", second)).status).toBe(409);
    expect(await sendDue(db, deps(), "https://arcbuildr.co", 10)).toMatchObject({ sent: 1 });
    expect(mails[0]!.text).toContain("/plan/#tokentokentokentoken12");
    expect(mails[0]!.idempotencyKey).toBe(`magnet-lead-1-0-${clock.toISOString()}`);
    expect(mails[0]!.idempotencyKey).not.toBe(`magnet-lead-1-0-${start.toISOString()}`);
    expect(await resendLink(db, "lead-1", clock)).toBe(false);
  });
});

describe("lesson emails", () => {
  it("builds one call with the brief, the answers and what we sent, all inert", async () => {
    await finishedLead();
    const lead = (await getLead(db, "lead-1"))!;
    const call = followUpCall(testSample, brief, { ...lead, deliverable: "Plan </sent> <b>" })!;
    expect(call.model).toBe(WRITER_MODEL);
    expect(call.schema).toBeDefined();
    expect(call.system).toContain("1. Say who it is for.");
    expect(call.system).toContain("Return exactly 2 emails");
    expect(call.user).toContain("Plan &lt;/sent&gt; &lt;b&gt;");
    expect(call.user.match(/<\/sent>/g)).toHaveLength(1);
    const quoted = followUpCall(testSample, brief, { ...lead, name: 'TEST"reader' })!;
    expect(quoted.system).toBe(call.system);
    expect(quoted.user).toContain('<reader first_name="TEST&quot;reader" />');
    expect(followUpCall(testSample, testSampleBrief, lead)).toBeNull();
    expect(followUpCall(testSample, brief, { ...lead, deliverable: null })).toBeNull();
  });

  it("reads usable emails and refuses the rest", () => {
    const ok = JSON.stringify({
      emails: [{ subject: " A\nsubject ", body: `${BODY}\r\n\r\n\r\n\r\nMore.` }],
    });
    expect(readFollowUps(ok, 1)).toEqual([{ subject: "A subject", body: `${BODY}\n\nMore.` }]);
    expect(readFollowUps(ok, 2)).toBeNull();
    expect(readFollowUps("not json", 1)).toBeNull();
    expect(
      readFollowUps(JSON.stringify({ emails: [{ subject: "x", body: "too short" }] }), 1),
    ).toBeNull();
    expect(readFollowUps(JSON.stringify({ emails: [{ subject: "", body: BODY }] }), 1)).toBeNull();
    const link = JSON.stringify({
      emails: [{ subject: "x", body: `${BODY} See https://evil.example/x` }],
    });
    expect(readFollowUps(link, 1)).toBeNull();
    const extra = JSON.stringify({
      emails: [
        { subject: "a", body: BODY },
        { subject: "b", body: BODY },
      ],
    });
    expect(readFollowUps(extra, 1)).toHaveLength(1);
  });

  it("writes them once, schedules them on their days and counts the cost", async () => {
    await finishedLead();
    clock = new Date(start.getTime() + HOUR);
    expect(await followUpCandidates(db, clock)).toEqual(["lead-1"]);
    expect(await writeFollowUps(env, "lead-1", deps([emailsOk()]))).toBe("written");
    expect((await getLead(db, "lead-1"))!.costMicroUsd).toBe(110_400);
    expect(await followUpCandidates(db, clock)).toEqual([]);
    expect(await writeFollowUps(env, "lead-1", deps())).toBe("none");

    clock = new Date(start.getTime() + HOUR + DAY);
    expect(await sendDue(db, deps(), "https://arcbuildr.co", 10)).toMatchObject({ sent: 1 });
    expect(mails[0]!.subject).toBe("Your first line");
    expect(mails[0]!.text).toContain(`Hi TEST,\n\n${BODY}\n\nZyade\nArcbuildr`);
    clock = new Date(start.getTime() + HOUR + 3 * DAY);
    expect(await sendDue(db, deps(), "https://arcbuildr.co", 10)).toMatchObject({ sent: 1 });
    expect(mails[1]!.subject).toBe("One post a week");
  });

  it("writes none when the brief plans none, and stops asking", async () => {
    await putBrief(db, testSampleBrief, start);
    await finishedLead();
    expect(await writeFollowUps(env, "lead-1", deps())).toBe("none");
    expect(await followUpCandidates(db, clock)).toEqual([]);
  });

  it("waits without spending when the cap is reached or the key is missing", async () => {
    await finishedLead();
    expect(await writeFollowUps(env, "lead-1", deps([], { caller: null }))).toBe("later");
    const capped = { ...env, MAGNET_DAILY_CAP_USD: "0.01" } as Env;
    expect(await writeFollowUps(capped, "lead-1", deps())).toBe("later");
    expect(await followUpCandidates(db, clock)).toEqual(["lead-1"]);
  });

  it("TEST reserves lesson spend immediately before calling and waits if it loses the cap race", async () => {
    await finishedLead();
    const lead = (await getLead(db, "lead-1"))!;
    const planned = worstCaseMicroUsd(followUpCall(testSample, brief, lead)!);
    const cap = lead.costMicroUsd + planned;
    const tomorrow = new Date(start.getTime() + DAY);
    await reserveSpend(db, dayOf(tomorrow), cap, cap);
    const caller = vi.fn(async () => emailsOk());
    const now = vi.fn(() => tomorrow).mockReturnValueOnce(start);
    const capped = { ...env, MAGNET_DAILY_CAP_USD: String(cap / 1e6) };
    expect(await writeFollowUps(capped, "lead-1", deps([], { now, caller }))).toBe("later");
    expect(caller).not.toHaveBeenCalled();
    expect(await spentOn(db, dayOf(tomorrow))).toBe(cap);
  });

  it("TEST stores the lesson sequence all at once, even when the second insert fails", async () => {
    await finishedLead();
    await db
      .prepare(
        `CREATE TRIGGER fail_lesson BEFORE INSERT ON magnet_emails
      WHEN NEW.step = 2 BEGIN SELECT RAISE(ABORT, 'lesson failed'); END`,
      )
      .run();
    await expect(writeFollowUps(env, "lead-1", deps([emailsOk()]))).rejects.toThrow(
      "lesson failed",
    );
    expect(await db.prepare("SELECT step FROM magnet_emails ORDER BY step").all()).toEqual({
      results: [{ step: 0 }],
    });
    expect(await followUpCandidates(db, clock)).toEqual(["lead-1"]);
  });

  it(`comes back after an unusable answer, ${MAX_FOLLOWUP_TRIES} times at most`, async () => {
    await finishedLead();
    const bad = (): ModelOutcome => emailsOk([{ subject: "x", body: "short" }]);
    for (let i = 0; i < MAX_FOLLOWUP_TRIES; i++)
      expect(await writeFollowUps(env, "lead-1", deps([bad()]))).toBe("later");
    expect(await followUpCandidates(db, clock)).toEqual([]);
    expect(await writeFollowUps(env, "lead-1", deps())).toBe("none");
  });

  it("writes none for a lead who stopped the emails", async () => {
    await finishedLead();
    await unsubscribe(db, UNSUB, clock);
    expect(await followUpCandidates(db, clock)).toEqual([]);
    expect(await writeFollowUps(env, "lead-1", deps())).toBe("none");
  });
});

describe("hourly sweep", () => {
  it("queues waiting leads and missing lesson emails, and sends what is due", async () => {
    await finishedLead();
    await insertLead(
      db,
      newLead({ id: "lead-2", token: "t2", email: "b@example.com", unsub: "u2" }),
    );
    clock = new Date(start.getTime() + HOUR);
    const report = await sweep(env, deps());
    expect(sent).toEqual([{ id: "lead-2" }, { id: "lead-1", task: "followup" }]);
    expect(report).toMatchObject({ requeued: 1, followUps: 1, digest: false });
  });

  it("sends the digest once a day, at its hour, and only when there is something to say", async () => {
    clock = new Date("2026-11-28T07:00:00.000Z");
    expect((await sweep(env, deps()))!.digest).toBe(false);
    clock = start;
    await finishedLead();
    clock = new Date("2026-11-28T06:00:00.000Z");
    expect((await sweep(env, deps()))!.digest).toBe(false);
    clock = new Date("2026-11-28T07:00:00.000Z");
    expect((await sweep(env, deps()))!.digest).toBe(true);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.subject).toBe("Magnet digest: 1 new, 1 hot");
    expect(alerts[0]!.idempotencyKey).toBe("magnet-digest-2026-11-28");
    expect(alerts[0]!.text).toContain("4/5 TEST Hanane Idrissi @hanane.co [written]");
    expect(alerts[0]!.text).toContain("https://arcbuildr.co/plan/#tokentokentokentoken12");
    expect(alerts[0]!.text).toContain("$0.09 yesterday");
  });

  it("reads the digest hour setting", () => {
    expect(digestHour(undefined)).toBe(7);
    expect(digestHour("18")).toBe(18);
    expect(digestHour("24")).toBe(7);
    expect(digestHour("")).toBe(7);
    expect(digest([], 0, { today: 0, yesterday: 0 }, "https://x.test")).toBeNull();
    expect(digest([], 2, { today: 0, yesterday: 0 }, "https://x.test")!.subject).toBe(
      "Magnet digest: 0 new, 0 hot, 2 waiting",
    );
  });

  it("runs from the worker's scheduled handler without a database", async () => {
    await worker.scheduled({} as never, { ASSETS: {} } as Env);
  });
});

describe("outside services", () => {
  it("asks ReplyRail with the secret and reads the account", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        run: { username: "@Hanane.co", email: "x@y.z", automation: "plan", trigger: "comment" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const rr = { REPLYRAIL_URL: "https://rr.example/", REPLYRAIL_SECRET: "s3" };
    expect(await lookupOrigin(rr, "abc12345")).toEqual({
      username: "Hanane.co",
      automation: "plan",
      trigger: "comment",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rr.example/api/link/lookup?code=abc12345");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer s3");
  });

  it("asks nothing when ReplyRail is not set up, not https, or the code is odd", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupOrigin({}, "abc12345")).toBeNull();
    expect(
      await lookupOrigin({ REPLYRAIL_URL: "http://rr.example", REPLYRAIL_SECRET: "s" }, "abc12345"),
    ).toBeNull();
    expect(
      await lookupOrigin({ REPLYRAIL_URL: "https://rr.example", REPLYRAIL_SECRET: "s" }, "a b"),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives null when ReplyRail does not know the code or is down", async () => {
    const rr = { REPLYRAIL_URL: "https://rr.example", REPLYRAIL_SECRET: "s" };
    vi.stubGlobal("fetch", async () => Response.json({ error: "not found" }, { status: 404 }));
    expect(await lookupOrigin(rr, "abc12345")).toBeNull();
    vi.stubGlobal("fetch", async () => Promise.reject(new Error("down")));
    expect(await lookupOrigin(rr, "abc12345")).toBeNull();
  });

  it("sends a lead's email from MAIL_FROM with the reply address and headers", async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: "mail-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const mail = {
      to: "a@example.com",
      subject: "S",
      text: "T",
      headers: { "X-A": "b" },
      idempotencyKey: "TEST-mail",
    };
    expect(await sendMail({ RESEND_API_KEY: "k" }, mail)).toEqual({
      ok: false,
      error: "missing MAIL_FROM",
    });
    const full = {
      RESEND_API_KEY: "k",
      MAIL_FROM: "Zyade <z@mail.example>",
      MAIL_REPLY_TO: "r@example.com",
    };
    expect(await sendMail(full, mail)).toEqual({ ok: true, id: "mail-1" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("TEST-mail");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Zyade <z@mail.example>",
      to: ["a@example.com"],
      subject: "S",
      text: "T",
      reply_to: "r@example.com",
      headers: { "X-A": "b" },
    });
  });

  it("TEST puts the digest idempotency key in the alert HTTP header", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("magnet-digest-2026-11-28");
      return Response.json({ id: "TEST-alert" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const env = { RESEND_API_KEY: "TEST-fixture", ALERT_EMAIL: "test@example.com" };
    const message = {
      subject: "TEST Digest",
      text: "TEST",
      idempotencyKey: "magnet-digest-2026-11-28",
    };
    expect(await sendAlert(env, message)).toEqual({ ok: true, id: "TEST-alert" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
