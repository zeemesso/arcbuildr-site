import type { Env } from "../env";
import { LINK_CODE } from "./contract";

// ReplyRail sends the magnet link in an Instagram message and adds ?rr=<code> to it. This
// asks ReplyRail which account that message went to, so the setter knows the real handle
// even when the form says something else. The answer goes into our alert email only: it
// never reaches the page, because a forwarded link must not show someone else's details.

export interface LinkOrigin {
  username: string;
  automation: string;
  trigger: string;
}

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Null when ReplyRail is not set up, does not know the code, or does not answer in time. */
export async function lookupOrigin(
  env: Pick<Env, "REPLYRAIL_URL" | "REPLYRAIL_SECRET">,
  code: string,
): Promise<LinkOrigin | null> {
  const base = env.REPLYRAIL_URL?.replace(/\/+$/, "");
  if (!base?.startsWith("https://") || !env.REPLYRAIL_SECRET || !LINK_CODE.test(code)) return null;
  try {
    const res = await fetch(`${base}/api/link/lookup?code=${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${env.REPLYRAIL_SECRET}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; run?: Record<string, unknown> };
    if (!body.ok || !body.run) return null;
    const username = text(body.run.username, 60).replace(/^@+/, "");
    if (!username) return null;
    return {
      username,
      automation: text(body.run.automation, 80),
      trigger: text(body.run.trigger, 40),
    };
  } catch {
    return null;
  }
}
