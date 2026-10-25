import type { APIRoute } from "astro";
import buildInfo from "../generated/build-info.json";

// Only the production build asks to be crawled. Unknown branch counts as main.
const preview = !["main", "unknown", ""].includes(buildInfo.branch);

export const GET: APIRoute = ({ site }) =>
  new Response(
    preview
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site)}\n`,
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
