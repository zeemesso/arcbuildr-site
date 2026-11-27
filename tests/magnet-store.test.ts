import { beforeEach, describe, expect, it } from "vitest";
import {
  STALE_RUN_MS,
  claimLead,
  dayOf,
  finishLead,
  getBrief,
  getLead,
  getLeadByEmail,
  getLeadByToken,
  insertLead,
  putBrief,
  recordUsage,
  saveScreen,
  spentOn,
  waitingLeads,
  type NewLead,
  type Sql,
} from "../src/lib/magnet/store";
import { testSampleBrief } from "../src/magnets/test-sample";
import { memoryDb } from "./helpers/memory-db.mjs";

const now = new Date("2026-11-27T10:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

const lead = (over: Partial<NewLead> = {}): NewLead => ({
  id: "lead-1",
  token: "tokentokentokentoken12",
  magnet: "test-sample",
  createdAt: now.toISOString(),
  name: "TEST Hanane",
  email: "hanane@example.com",
  instagram: "@hanane",
  phone: "",
  answers: { business: "Coaching for dentists", stuck: "I never know what to post." },
  page: "https://arcbuildr.co/m/test-sample",
  utm: "utm_source=ig",
  rr: "abc12345",
  tz: "Africa/Casablanca",
  unsub: `unsub-${over.id ?? "lead-1"}`,
  ...over,
});

let db: Sql;
beforeEach(() => {
  db = memoryDb() as Sql;
});

describe("leads", () => {
  it("stores a lead and reads it back by id, token and email", async () => {
    expect(await insertLead(db, lead())).toBe(true);
    const stored = await getLead(db, "lead-1");
    expect(stored).toMatchObject({ ...lead(), status: "queued", attempts: 0, deliverable: null });
    expect((await getLeadByToken(db, lead().token))?.id).toBe("lead-1");
    expect((await getLeadByEmail(db, "test-sample", "hanane@example.com"))?.id).toBe("lead-1");
    expect(await getLead(db, "nope")).toBeNull();
    expect(await getLeadByToken(db, "nope")).toBeNull();
  });

  it("keeps one lead per email per magnet and leaves the first untouched", async () => {
    await insertLead(db, lead());
    const second = lead({ id: "lead-2", token: "othertokenothertoken12", name: "Someone else" });
    expect(await insertLead(db, second)).toBe(false);
    expect(await getLead(db, "lead-2")).toBeNull();
    expect((await getLead(db, "lead-1"))?.name).toBe("TEST Hanane");
    // The same email may take a different magnet.
    expect(await insertLead(db, { ...second, magnet: "other-magnet" })).toBe(true);
  });

  it("gives a lead to one run only, until that run is stale", async () => {
    await insertLead(db, lead());
    expect(await claimLead(db, "lead-1", now)).toBe(true);
    expect(await claimLead(db, "lead-1", later(60_000))).toBe(false);
    expect(await claimLead(db, "lead-1", later(STALE_RUN_MS + 1000))).toBe(true);
    expect((await getLead(db, "lead-1"))?.attempts).toBe(2);
    expect(await claimLead(db, "nope", now)).toBe(false);
  });

  it("does not run a finished lead again", async () => {
    await insertLead(db, lead());
    await claimLead(db, "lead-1", now);
    await finishLead(db, "lead-1", { status: "done", deliverable: "## Plan" }, later(1000));
    expect(await claimLead(db, "lead-1", later(STALE_RUN_MS * 2))).toBe(false);
    expect(await getLead(db, "lead-1")).toMatchObject({ status: "done", deliverable: "## Plan" });
  });

  it("lets a held lead run again and keeps the reason", async () => {
    await insertLead(db, lead());
    await claimLead(db, "lead-1", now);
    await finishLead(db, "lead-1", { status: "held", error: "daily cap reached" }, now);
    expect(await getLead(db, "lead-1")).toMatchObject({
      status: "held",
      error: "daily cap reached",
    });
    expect(await waitingLeads(db, later(1000))).toEqual(["lead-1"]);
    expect(await claimLead(db, "lead-1", later(1000))).toBe(true);
  });

  it("keeps a deliverable only for a done lead", async () => {
    await insertLead(db, lead());
    await finishLead(db, "lead-1", { status: "failed", deliverable: "x", error: "boom" }, now);
    expect(await getLead(db, "lead-1")).toMatchObject({ status: "failed", deliverable: null });
  });

  it("lists leads a dropped run left behind, not fresh or finished ones", async () => {
    await insertLead(db, lead());
    await insertLead(db, lead({ id: "lead-2", token: "t2", email: "b@example.com" }));
    await insertLead(db, lead({ id: "lead-3", token: "t3", email: "c@example.com" }));
    await claimLead(db, "lead-2", now);
    await claimLead(db, "lead-3", now);
    await finishLead(db, "lead-3", { status: "done", deliverable: "ok" }, now);
    expect(await waitingLeads(db, later(60_000))).toEqual([]);
    expect(await waitingLeads(db, later(STALE_RUN_MS + 1000))).toEqual(["lead-1", "lead-2"]);
  });

  it("stores the screen result", async () => {
    await insertLead(db, lead());
    await saveScreen(db, "lead-1", { score: 4, setterNote: "Sells already.", reason: "real" });
    expect(await getLead(db, "lead-1")).toMatchObject({
      score: 4,
      setterNote: "Sells already.",
      screenReason: "real",
    });
  });
});

describe("spend", () => {
  it("adds each call to the lead and to the day", async () => {
    await insertLead(db, lead());
    const usage = { model: "m", inputTokens: 100, outputTokens: 50, costMicroUsd: 700 };
    await recordUsage(db, "lead-1", usage, now);
    await recordUsage(db, "lead-1", usage, now);
    expect((await getLead(db, "lead-1"))?.costMicroUsd).toBe(1400);
    expect(await spentOn(db, dayOf(now))).toBe(1400);
    expect(await spentOn(db, "2026-11-28")).toBe(0);
  });
});

describe("briefs", () => {
  it("stores, replaces and reads a brief", async () => {
    expect(await getBrief(db, "test-sample")).toBeNull();
    await putBrief(db, testSampleBrief, now);
    expect(await getBrief(db, "test-sample")).toEqual(testSampleBrief);
    await putBrief(db, { ...testSampleBrief, maxWords: 500 }, now);
    expect((await getBrief(db, "test-sample"))?.maxWords).toBe(500);
  });

  it("treats a broken or incomplete brief as missing", async () => {
    await db
      .prepare("INSERT INTO magnet_briefs (slug, brief_json, updated_at) VALUES (?, ?, ?)")
      .bind("bad", "{not json", now.toISOString())
      .run();
    await db
      .prepare("INSERT INTO magnet_briefs (slug, brief_json, updated_at) VALUES (?, ?, ?)")
      .bind("empty", JSON.stringify({ outline: "" }), now.toISOString())
      .run();
    expect(await getBrief(db, "bad")).toBeNull();
    expect(await getBrief(db, "empty")).toBeNull();
  });
});
