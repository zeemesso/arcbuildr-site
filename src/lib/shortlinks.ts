/** Short links for bios and DMs. Each redirects to the home page with a source tag the form saves. */
const SHORT_LINKS: Record<string, string> = { "/ig": "ig", "/dm": "dm", "/tt": "tt" };

export function shortLinkRedirect(url: URL, lang: "en" | "fr" = "en"): Response | null {
  const src = SHORT_LINKS[url.pathname.replace(/\/$/, "")];
  if (!src) return null;
  const home = lang === "fr" ? "/fr/" : "/";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}${home}?src=${src}`,
      "cache-control": "no-store",
      Vary: "Accept-Language, Cookie",
    },
  });
}
