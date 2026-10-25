import type { APIRoute } from "astro";

// /thanks is left out on purpose: it is noindex and only reached after the form.
const paths = ["/", "/privacy", "/method", "/about"];

export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
      .map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`)
      .join("\n")}\n</urlset>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
