import { MAGNETS, getMagnet } from "../../magnets/registry";
import type { Env } from "../env";
import { capMicroUsd } from "./budget";
import { json } from "./intake";
import {
  dayOf,
  leadStatsByDayAndMagnet,
  spentOn,
  statsHealth,
  statsPeople,
  type LeadStatsCounts,
} from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOT_MEASURED = ["totals.started", "previous.started", "daily.started", "magnets.started"];

async function matchesSecret(token: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  const [provided, expected] = await Promise.all([digest(token), digest(secret)]);
  let difference = 0;
  for (let i = 0; i < provided.length; i++) difference |= provided[i]! ^ expected[i]!;
  return difference === 0;
}

const emptyCounts = () => ({
  started: null,
  finished: 0,
  written: 0,
  screened_out: 0,
  hot: 0,
  cost_microusd: 0,
});

function addCounts(total: LeadStatsCounts, counts: LeadStatsCounts): void {
  total.finished += counts.finished;
  total.written += counts.written;
  total.screened_out += counts.screened_out;
  total.hot += counts.hot;
  total.cost_microusd += counts.cost_microusd;
}

export async function handleStats(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET", "cache-control": "no-store" },
    });
  }

  const secret = env.STATS_SECRET;
  if (!secret || secret.length < 32) return json({ error: "not_configured" }, 503);

  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token || !(await matchesSecret(token, secret))) return json({ error: "unauthorized" }, 401);

  const rawDays = new URL(request.url).searchParams.get("days") ?? "30";
  const days = Number(rawDays);
  if (!/^\d+$/.test(rawDays) || days < 1 || days > 90) return json({ error: "bad_days" }, 400);
  const db = env.DB;
  if (!db) return json({ error: "not_configured" }, 503);

  const now = new Date();
  const today = dayOf(now);
  const midnight = Date.parse(`${today}T00:00:00.000Z`);
  const dayAt = (offset: number) => new Date(midnight + offset * DAY_MS);
  const from = dayAt(1 - days);
  const to = dayAt(1);
  const [rows, people, health, spendToday] = await Promise.all([
    leadStatsByDayAndMagnet(db, dayAt(1 - days * 2), to),
    statsPeople(db, from, to),
    statsHealth(db),
    spentOn(db, today),
  ]);

  const totals = emptyCounts();
  const previous = emptyCounts();
  const daily = new Map(
    Array.from({ length: days }, (_, i) => [dayOf(dayAt(i + 1 - days)), emptyCounts()] as const),
  );
  const magnets = new Map(MAGNETS.map(({ slug }) => [slug, emptyCounts()] as const));
  for (const row of rows) {
    const counts = daily.get(row.day);
    if (!counts) {
      addCounts(previous, row);
      continue;
    }
    addCounts(totals, row);
    addCounts(counts, row);
    const magnetCounts = magnets.get(row.magnet) ?? emptyCounts();
    addCounts(magnetCounts, row);
    magnets.set(row.magnet, magnetCounts);
  }

  return json(
    {
      v: 1,
      tool: "engine",
      generated_at: now.toISOString(),
      days,
      not_measured: NOT_MEASURED,
      health: {
        ...health,
        spend_today_microusd: spendToday,
        cap_microusd: capMicroUsd(env.MAGNET_DAILY_CAP_USD),
      },
      totals,
      previous,
      daily: Array.from(daily, ([day, counts]) => ({ day, ...counts })),
      magnets: Array.from(magnets, ([slug, counts]) => ({
        slug,
        title: getMagnet(slug)?.title ?? null,
        ...counts,
      })),
      people,
    },
    200,
  );
}
