import type { Env, MagnetJob } from "./lib/env";
import { handleApply } from "./lib/apply";
import { handleLead } from "./lib/lead";
import { PLAN_API_PATH } from "./lib/magnet/contract";
import { handleSubmit } from "./lib/magnet/intake";
import { writeFollowUps } from "./lib/magnet/followup";
import { jobDeps, runLead } from "./lib/magnet/job";
import { handlePlan } from "./lib/magnet/plan";
import { sweep } from "./lib/magnet/sweep";
import { handleUnsubscribe } from "./lib/magnet/unsubscribe";
import { shortLinkRedirect } from "./lib/shortlinks";

/** Same answer for every unknown /api request, so nothing leaks. */
function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=UTF-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const short = shortLinkRedirect(url);
    if (short) return short;
    if (pathname === "/api/lead") return handleLead(request, env, ctx);
    if (pathname === "/api/apply") return handleApply(request, env);
    if (pathname === PLAN_API_PATH && request.method === "GET") return handlePlan(request, env);
    const stop = /^\/api\/magnet\/unsubscribe\/([^/]{1,64})$/.exec(pathname);
    if (stop) return handleUnsubscribe(request, env, stop[1]!);
    const magnet = /^\/api\/magnet\/([a-z0-9-]{1,64})$/.exec(pathname);
    if (magnet && request.method === "POST") return handleSubmit(request, env, magnet[1]!);
    if (pathname.startsWith("/api/")) return notFound();
    return env.ASSETS.fetch(request);
  },

  /** The magnet queue: one lead per message. A busy API means "deliver it again later". */
  async queue(batch, env): Promise<void> {
    for (const message of batch.messages) {
      const { id, task } = message.body;
      let again = false;
      try {
        // Lesson emails are never retried here: the hourly sweep queues them again.
        if (task === "followup") await writeFollowUps(env, id, jobDeps(env));
        else again = (await runLead(env, id)) === "retry";
      } catch (err) {
        console.error("magnet: run crashed", id, task ?? "write", (err as Error).message);
        again = task !== "followup";
      }
      if (again) message.retry({ delaySeconds: Math.min(900, 60 * 2 ** (message.attempts - 1)) });
      else message.ack();
    }
  },

  /** Once an hour: queue what waits, send the emails that are due, and the daily digest. */
  async scheduled(_controller, env): Promise<void> {
    try {
      const report = await sweep(env, jobDeps(env));
      if (report) console.log("magnet: sweep", JSON.stringify(report));
    } catch (err) {
      console.error("magnet: sweep crashed", (err as Error).message);
    }
  },
} satisfies ExportedHandler<Env, MagnetJob>;
