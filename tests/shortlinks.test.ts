import { describe, expect, it } from "vitest";
import { shortLinkRedirect } from "../src/lib/shortlinks";

describe("short links", () => {
  it.each([
    ["/ig", "ig"],
    ["/dm", "dm"],
    ["/tt", "tt"],
    ["/ig/", "ig"],
  ])("%s redirects 302 to /?src=%s", (path, src) => {
    const res = shortLinkRedirect(new URL(`https://arcbuildr.test${path}`))!;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(`https://arcbuildr.test/?src=${src}`);
  });

  it("ignores every other path", () => {
    for (const path of ["/", "/igg", "/thanks", "/api/lead"]) {
      expect(shortLinkRedirect(new URL(`https://arcbuildr.test${path}`))).toBeNull();
    }
  });
});
