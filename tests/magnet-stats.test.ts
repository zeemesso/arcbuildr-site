import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { insertLead, reserveSpend, type LeadStatus, type Sql } from "../src/lib/magnet/store";
import { getMagnet } from "../src/magnets/registry";
import worker from "../src/worker";
import { magnetEnv } from "./helpers/magnet-fixtures";

const ctx = { waitUntil() {} } as unknown as ExecutionContext;
const fixtureSecret = "x".repeat(32);
const authorization = `Bearer ${fixtureSecret}`;
const now = new Date("2026-11-27T23:58:00.000Z");
const nothing = {
  started: null,
  finished: 0,
  written: 0,
  screened_out: 0,
  hot: 0,
  cost_microusd: 0,
};

let env: Env;
let db: Sql;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  ({ env, db } = magnetEnv({ STATS_SECRET: fixtureSecret }));
});

afterEach(() => vi.useRealTimers());

function stats(query = "", auth: string | null = authorization, method = "GET") {
  const request = new Request(`https://x.test/api/stats${query}`, {
    method,
    headers: auth === null ? {} : { Authorization: auth },
  });
  return worker.fetch(request as never, env, ctx);
}

async function seedLead(
  id: string,
  createdAt: string,
  {
    magnet = "test-sample",
    status = "queued",
    score = null,
    cost = 0,
    screenReason = null,
    plan = null,
    finishedAt = null,
    stage = "new",
    rr = "",
  }: {
    magnet?: string;
    status?: LeadStatus;
    score?: number | null;
    cost?: number;
    screenReason?: string | null;
    plan?: string | null;
    finishedAt?: string | null;
    stage?: string;
    rr?: string;
  } = {},
) {
  await insertLead(db, {
    id,
    token: `fixture-${id}`,
    magnet,
    createdAt,
    name: `TEST ${id}`,
    email: `${id}@example.com`,
    instagram: `@test_${id}`,
    phone: "",
    answers: {},
    page: "",
    utm: "",
    rr,
    tz: "",
    unsub: `fixture-unsub-${id}`,
  });
  await db
    .prepare(
      `UPDATE magnet_leads
          SET status = ?, score = ?, cost_microusd = ?, screen_reason = ?,
              deliverable_md = ?, finished_at = ?, stage = ?
        WHERE id = ?`,
    )
    .bind(status, score, cost, screenReason, plan, finishedAt, stage, id)
    .run();
}

describe("stats route", () => {
  it.each([undefined, "x".repeat(31)])("returns 503 for an unconfigured secret", async (secret) => {
    env.STATS_SECRET = secret;
    const prepare = vi.spyOn(db, "prepare");
    const response = await stats("?days=0");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([null, `Bearer ${"y".repeat(32)}`, `Basic ${fixtureSecret}`])(
    "returns 401 for an invalid Authorization header",
    async (auth) => {
      const prepare = vi.spyOn(db, "prepare");
      const response = await stats("?days=0", auth);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
      expect(prepare).not.toHaveBeenCalled();
    },
  );

  it.each(["0", "91", "abc", "1.5", ""])("returns 400 for days=%s", async (days) => {
    const prepare = vi.spyOn(db, "prepare");
    const response = await stats(`?days=${days}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "bad_days" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("returns 405 for POST", async () => {
    const prepare = vi.spyOn(db, "prepare");
    const response = await stats("", null, "POST");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("defaults to 30 UTC days and zero-fills each day and registry magnet", async () => {
    const response = await stats();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      v: 1,
      tool: "engine",
      generated_at: now.toISOString(),
      days: 30,
      not_measured: ["totals.started", "previous.started", "daily.started", "magnets.started"],
      health: {
        queued: 0,
        running: 0,
        failed: 0,
        emails_pending: 0,
        emails_failed: 0,
        spend_today_microusd: 0,
        cap_microusd: 3_000_000,
      },
      totals: nothing,
      previous: nothing,
      daily: Array.from({ length: 30 }, (_, offset) => ({
        day: new Date(Date.UTC(2026, 9, 29 + offset)).toISOString().slice(0, 10),
        ...nothing,
      })),
      magnets: [{ slug: "test-sample", title: getMagnet("test-sample")?.title, ...nothing }],
      people: [],
    });
  });

  it("counts leads by creation day and magnet and reports current health across all days", async () => {
    await seedLead("written", "2026-11-25T00:00:00.000Z", {
      status: "done",
      score: 4,
      cost: 110,
      plan: "TEST plan",
      finishedAt: "2026-11-26T08:00:00.000Z",
      stage: "booked",
      rr: "fixture-run",
    });
    await seedLead("running", "2026-11-27T14:00:00.000Z", {
      magnet: "unlisted",
      status: "running",
      score: 5,
      cost: 13,
      screenReason: "Accepted by the screen",
    });
    await seedLead("refused", "2026-11-27T12:00:00.000Z", {
      magnet: "unlisted",
      status: "rejected",
      score: 2,
      cost: 17,
      screenReason: "Refused by the screen",
    });
    await seedLead("failed", "2026-11-27T10:00:00.000Z", {
      status: "failed",
      score: 3,
      cost: 5,
      screenReason: "Accepted by the screen",
    });
    await seedLead("prior-queued", "2026-11-22T00:00:00.000Z");
    await seedLead("prior-done", "2026-11-24T23:59:59.999Z", {
      magnet: "prior-only",
      status: "done",
      score: 5,
      cost: 200,
    });
    await seedLead("prior-refused", "2026-11-24T10:00:00.000Z", {
      status: "rejected",
      score: 1,
      cost: 31,
    });
    await seedLead("too-old", "2026-11-21T23:59:59.999Z", { status: "running" });
    await seedLead("tomorrow", "2026-11-28T00:00:00.000Z", { status: "held" });

    for (const [step, status] of ["pending", "failed", "sending", "sent", "cancelled"].entries()) {
      await db
        .prepare(
          `INSERT INTO magnet_emails (lead_id, step, due_at, status, subject, body)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind("prior-done", step, "2026-11-28T12:00:00.000Z", status, "TEST subject", "TEST body")
        .run();
    }
    await reserveSpend(db, "2026-11-27", 72, 100);
    await reserveSpend(db, "2026-11-26", 50, 100);
    env.MAGNET_DAILY_CAP_USD = "1.25";

    const prepare = vi.spyOn(db, "prepare");
    const response = await stats("?days=3");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { people: { name: string }[] };
    expect(payload).toMatchObject({
      days: 3,
      health: {
        queued: 1,
        running: 2,
        failed: 1,
        emails_pending: 1,
        emails_failed: 1,
        spend_today_microusd: 72,
        cap_microusd: 1_250_000,
      },
      totals: { ...nothing, finished: 4, written: 1, screened_out: 1, hot: 2, cost_microusd: 145 },
      previous: {
        ...nothing,
        finished: 3,
        written: 1,
        screened_out: 1,
        hot: 1,
        cost_microusd: 231,
      },
      daily: [
        { day: "2026-11-25", ...nothing, finished: 1, written: 1, hot: 1, cost_microusd: 110 },
        { day: "2026-11-26", ...nothing },
        { day: "2026-11-27", ...nothing, finished: 3, screened_out: 1, hot: 1, cost_microusd: 35 },
      ],
      magnets: [
        {
          slug: "test-sample",
          title: getMagnet("test-sample")?.title,
          ...nothing,
          finished: 2,
          written: 1,
          hot: 1,
          cost_microusd: 115,
        },
        {
          slug: "unlisted",
          title: null,
          ...nothing,
          finished: 2,
          screened_out: 1,
          hot: 1,
          cost_microusd: 30,
        },
      ],
    });
    expect(payload.people.map(({ name }) => name)).toEqual([
      "TEST running",
      "TEST refused",
      "TEST failed",
      "TEST written",
    ]);
    expect(payload.people[0]).toEqual({
      name: "TEST running",
      email: "running@example.com",
      instagram: "@test_running",
      magnet: "unlisted",
      run: null,
      status: "running",
      stage: "new",
      score: 5,
      hot: true,
      screen_reason: "Accepted by the screen",
      created_at: "2026-11-27T14:00:00.000Z",
      finished_at: null,
    });
    expect(payload.people[1]).toMatchObject({ hot: false, screen_reason: "Refused by the screen" });
    expect(payload.people[3]).toMatchObject({
      hot: true,
      run: "fixture-run",
      stage: "booked",
      finished_at: "2026-11-26T08:00:00.000Z",
    });
    for (const [sql] of prepare.mock.calls) expect(sql).toMatch(/^SELECT\b/);
  });

  it("returns the newest 200 people in the window and counts every submission", async () => {
    await seedLead("yesterday", "2026-11-26T23:59:59.999Z");
    await seedLead("tomorrow", "2026-11-28T00:00:00.000Z");
    const midnight = Date.UTC(2026, 10, 27);
    for (let i = 0; i < 205; i++) {
      await seedLead(`person-${i}`, new Date(midnight + i * 1000).toISOString());
    }

    const response = await stats("?days=1");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { people: { name: string }[] };
    expect(payload).toMatchObject({
      totals: { ...nothing, finished: 205 },
      previous: { ...nothing, finished: 1 },
      daily: [{ day: "2026-11-27", ...nothing, finished: 205 }],
    });
    expect(payload.people[0]).toMatchObject({ score: null, hot: false });
    expect(payload.people.map(({ name }) => name)).toEqual(
      Array.from({ length: 200 }, (_, i) => `TEST person-${204 - i}`),
    );
  });
});
