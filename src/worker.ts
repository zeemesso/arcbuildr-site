import type { Env } from "./lib/env";
import { handleApply } from "./lib/apply";
import { handleLead } from "./lib/lead";
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
    if (pathname.startsWith("/api/")) return notFound();
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
