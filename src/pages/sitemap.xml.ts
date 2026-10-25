import type { APIRoute } from "astro";
import { getPublishedNotes } from "../lib/notes";

// /thanks is left out on purpose: it is noindex and only reached after the form.
// Draft notes are left out too, even on previews.
const paths = ["/", "/privacy", "/notes"];

export const GET: APIRoute = async ({ site }) => {
  const all = [...paths, ...(await getPublishedNotes()).map((n) => `/notes/${n.id}`)];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all
      .map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`)
      .join("\n")}\n</urlset>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
};
