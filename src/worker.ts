import buildInfo from "./generated/build-info.json";
import type { Env } from "./lib/env";
import { handleDiag, handleSelftest, notFound } from "./lib/selftest";

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/selftest") return handleSelftest(request, env, buildInfo);
    if (pathname === "/api/selftest-diag") return handleDiag(request, env, buildInfo);
    if (pathname.startsWith("/api/")) return notFound();
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
