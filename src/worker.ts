import type { Env, MagnetJob } from "./lib/env";
import { handleLead } from "./lib/lead";
import { handleSubmit } from "./lib/magnet/intake";
import { runLead } from "./lib/magnet/job";
import { shortLinkRedirect } from "./lib/shortlinks";

/** Same answer for every unknown /api request, so nothing leaks. */
function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=UTF-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const short = shortLinkRedirect(url);
    if (short) return short;
    if (pathname === "/api/lead" && request.method === "POST") return handleLead(request, env);
    const magnet = /^\/api\/magnet\/([a-z0-9-]{1,64})$/.exec(pathname);
    if (magnet && request.method === "POST") return handleSubmit(request, env, magnet[1]!);
    if (pathname.startsWith("/api/")) return notFound();
    return env.ASSETS.fetch(request);
  },

  /** The magnet queue: one lead per message. A busy API means "deliver it again later". */
  async queue(batch, env): Promise<void> {
    for (const message of batch.messages) {
      let again: boolean;
      try {
        again = (await runLead(env, message.body.id)) === "retry";
      } catch (err) {
        console.error("magnet: run crashed", message.body.id, (err as Error).message);
        again = true;
      }
      if (again) message.retry({ delaySeconds: Math.min(900, 60 * 2 ** (message.attempts - 1)) });
      else message.ack();
    }
  },
} satisfies ExportedHandler<Env, MagnetJob>;
