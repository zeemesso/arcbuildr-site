import { beforeEach, describe, expect, it } from "vitest";
import { TOKEN } from "../src/lib/magnet/contract";
import {
  MAX_ATTEMPTS,
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
  reserveSpend,
  saveScreen,
  settleSpend,
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

async function claim(id: string, when = now) {
  const snapshot = (await getLead(db, id)) ?? { id, status: "queued", attempts: 0 };
  return claimLead(db, snapshot, when);
}

const running = { status: "running", attempts: 1 } as const;

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
    expect(await claim("lead-1")).toBe(true);
    expect(await claim("lead-1", later(60_000))).toBe(false);
    expect(await claim("lead-1", later(STALE_RUN_MS + 1000))).toBe(true);
    expect((await getLead(db, "lead-1"))?.attempts).toBe(2);
    expect(await claim("nope")).toBe(false);
  });

  it("does not run a finished lead again", async () => {
    await insertLead(db, lead());
    await claim("lead-1");
    await finishLead(
      db,
      "lead-1",
      running,
      { status: "done", deliverable: "## Plan" },
      later(1000),
    );
    expect(await claim("lead-1", later(STALE_RUN_MS * 2))).toBe(false);
    expect(await getLead(db, "lead-1")).toMatchObject({ status: "done", deliverable: "## Plan" });
  });

  it("lets a held lead run again and keeps the reason", async () => {
    await insertLead(db, lead());
    await claim("lead-1");
    await finishLead(db, "lead-1", running, { status: "held", error: "daily cap reached" }, now);
    expect(await getLead(db, "lead-1")).toMatchObject({
      status: "held",
      error: "daily cap reached",
    });
    expect(await waitingLeads(db, later(1000))).toEqual(["lead-1"]);
    expect(await claim("lead-1", later(1000))).toBe(true);
  });

  it("keeps a deliverable only for a done lead", async () => {
    await insertLead(db, lead());
    await finishLead(
      db,
      "lead-1",
      { status: "queued", attempts: 0 },
      { status: "failed", deliverable: "x", error: "boom" },
      now,
    );
    expect(await getLead(db, "lead-1")).toMatchObject({ status: "failed", deliverable: null });
  });

  it("lists leads a dropped run left behind, not fresh or finished ones", async () => {
    await insertLead(db, lead());
    await insertLead(db, lead({ id: "lead-2", token: "t2", email: "b@example.com" }));
    await insertLead(db, lead({ id: "lead-3", token: "t3", email: "c@example.com" }));
    await claim("lead-2");
    await claim("lead-3");
    await finishLead(db, "lead-3", running, { status: "done", deliverable: "ok" }, now);
    expect(await waitingLeads(db, later(60_000))).toEqual([]);
    expect(await waitingLeads(db, later(STALE_RUN_MS + 1000))).toEqual(["lead-1", "lead-2"]);
  });

  it("stores the screen result", async () => {
    await insertLead(db, lead());
    await claim("lead-1");
    await saveScreen(db, "lead-1", 1, { score: 4, setterNote: "Sells already.", reason: "real" });
    expect(await getLead(db, "lead-1")).toMatchObject({
      score: 4,
      setterNote: "Sells already.",
      screenReason: "real",
    });
  });

  it("TEST leaves an exhausted running lead for the sweep without letting it claim again", async () => {
    await insertLead(db, lead());
    for (let i = 0; i < MAX_ATTEMPTS; i++)
      expect(await claim("lead-1", later(i * (STALE_RUN_MS + 1000)))).toBe(true);
    const stale = later(MAX_ATTEMPTS * (STALE_RUN_MS + 1000));
    expect(await waitingLeads(db, stale)).toEqual(["lead-1"]);
    expect(await claim("lead-1", stale)).toBe(false);
    expect((await getLead(db, "lead-1"))?.attempts).toBe(MAX_ATTEMPTS);
  });
});

describe("spend", () => {
  it("adds each call to the lead and to the day", async () => {
    await insertLead(db, lead());
    const usage = { model: "m", inputTokens: 100, outputTokens: 50, costMicroUsd: 700 };
    for (let i = 0; i < 2; i++) {
      expect(await reserveSpend(db, dayOf(now), 1000, 2000)).toBe(true);
      await settleSpend(db, dayOf(now), 1000, usage.costMicroUsd, { id: "lead-1", usage });
    }
    expect((await getLead(db, "lead-1"))?.costMicroUsd).toBe(1400);
    expect(await spentOn(db, dayOf(now))).toBe(1400);
    expect(await spentOn(db, "2026-11-28")).toBe(0);
  });

  it("TEST reserves against the same cap concurrently and floors the ledger at zero", async () => {
    const day = dayOf(now);
    const results = await Promise.all([
      reserveSpend(db, day, 60, 100),
      reserveSpend(db, day, 60, 100),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await spentOn(db, day)).toBe(60);
    await settleSpend(db, day, 70, 0);
    expect(await spentOn(db, day)).toBe(0);
  });
});

it("TEST backfills distinct unsubscribe codes for leads from the first migration", async () => {
  const legacy = memoryDb((file, sqlite) => {
    if (file !== "0002_magnet_emails.sql") return;
    sqlite.exec(`INSERT INTO magnet_leads
      (id, token, magnet, created_at, name, email, instagram, answers)
      VALUES ('test-1', 'test-1', 'test-sample', '', 'TEST One', 'one@example.com', '', '{}'),
             ('test-2', 'test-2', 'test-sample', '', 'TEST Two', 'two@example.com', '', '{}')`);
  }) as Sql;
  const { results } = await legacy
    .prepare("SELECT unsub FROM magnet_leads")
    .all<{ unsub: string }>();
  expect(results).toHaveLength(2);
  expect(new Set(results.map(({ unsub }) => unsub)).size).toBe(2);
  for (const { unsub } of results) expect(unsub).toMatch(TOKEN);
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
