import type { Env } from "../env";
import { TOKEN, unsubscribePagePath } from "./contract";
import { json } from "./intake";
import { unsubscribe } from "./store";

// /api/magnet/unsubscribe/<code>: stops the emails for one lead.
// POST does it. That is what the button on /unsubscribe/ sends, and what a mail app sends
// for its own "unsubscribe" button (List-Unsubscribe-Post). GET only forwards to the page:
// mail scanners open every link in an email, and a scanner must not unsubscribe anyone.

export async function handleUnsubscribe(
  request: Request,
  env: Env,
  code: string,
): Promise<Response> {
  if (request.method === "GET" || request.method === "HEAD")
    return new Response(null, {
      status: 303,
      headers: {
        Location: TOKEN.test(code) ? unsubscribePagePath(code) : "/unsubscribe/",
        "cache-control": "no-store",
      },
    });
  if (request.method !== "POST") return json({ ok: false }, 405);
  // A code that fits the format gets the same answer whether or not a lead has it.
  if (!TOKEN.test(code)) return json({ ok: false }, 400);
  if (!env.DB) {
    console.error("magnet: no DB binding");
    return json({ ok: false }, 503);
  }
  try {
    await unsubscribe(env.DB, code, new Date());
  } catch (err) {
    console.error("magnet: unsubscribe failed", (err as Error).message);
    return json({ ok: false }, 503);
  }
  return json({ ok: true }, 200);
}
