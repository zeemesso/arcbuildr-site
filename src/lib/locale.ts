/**
 * Which language a visitor gets at arcbuildr.co/. A choice made with the site's switch (cookie
 * `lang`) wins; otherwise the browser's Accept-Language decides, and anything but French is English.
 */
export type SiteLang = "en" | "fr";

export function preferredLang(request: Request): SiteLang {
  const cookie = /(?:^|;\s*)lang=(en|fr)(?:;|$)/.exec(request.headers.get("Cookie") ?? "");
  if (cookie) return cookie[1] as SiteLang;

  let best: SiteLang = "en";
  let bestQ = 0;
  for (const part of (request.headers.get("Accept-Language") ?? "").split(",")) {
    const [tag = "", ...params] = part.trim().toLowerCase().split(";");
    const primary = tag.split("-")[0];
    if (primary !== "en" && primary !== "fr") continue;
    const q = Number(
      params
        .find((p) => p.trim().startsWith("q="))
        ?.trim()
        .slice(2) ?? 1,
    );
    if (Number.isFinite(q) && q > bestQ) {
      best = primary;
      bestQ = q;
    }
  }
  return best;
}

/** "/" for a French visitor redirects to "/fr/", keeping the query (?src=ig). Otherwise null. */
export function rootRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname !== "/" || preferredLang(request) !== "fr") return null;
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/fr/${url.search}`,
      "cache-control": "no-store",
      Vary: "Accept-Language, Cookie",
    },
  });
}
