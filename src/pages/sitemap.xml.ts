import type { APIRoute } from "astro";
import { visibleMagnets } from "../magnets/registry";

// Result pages such as /plan are noindex and stay out. Draft magnets stay out too.
const paths = ["/", "/privacy", ...visibleMagnets(false).map(({ slug }) => `/m/${slug}`)];

export const GET: APIRoute = async ({ site }) => {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
      .map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`)
      .join("\n")}\n</urlset>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
};
