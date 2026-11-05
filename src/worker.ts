import type { Env } from "./lib/env";
import { handleLead } from "./lib/lead";
import { preferredLang, rootRedirect } from "./lib/locale";
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
    const short = shortLinkRedirect(url, preferredLang(request));
    if (short) return short;
    const root = rootRedirect(request);
    if (root) return root;
    if (pathname === "/api/lead" && request.method === "POST") return handleLead(request, env);
    if (pathname.startsWith("/api/")) return notFound();
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
