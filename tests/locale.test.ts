import { describe, expect, it } from "vitest";
import { preferredLang, rootRedirect } from "../src/lib/locale";

const req = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://arcbuildr.test${path}`, { headers });

describe("preferredLang", () => {
  it.each([
    ["fr-FR,fr;q=0.9,en;q=0.8", "fr"],
    ["fr-CA", "fr"],
    ["en-US,en;q=0.9,fr;q=0.8", "en"],
    ["de-DE,fr;q=0.7,en;q=0.5", "fr"],
    ["ar-MA,en;q=0.9,fr;q=0.8", "en"],
    ["es-ES", "en"],
    ["", "en"],
  ])("Accept-Language %j gives %s", (header, lang) => {
    expect(preferredLang(req("/", { "Accept-Language": header }))).toBe(lang);
  });

  it("a saved choice beats the browser", () => {
    expect(preferredLang(req("/", { "Accept-Language": "fr-FR", Cookie: "a=1; lang=en" }))).toBe(
      "en",
    );
    expect(preferredLang(req("/", { "Accept-Language": "en-US", Cookie: "lang=fr" }))).toBe("fr");
  });
});

describe("rootRedirect", () => {
  it("sends a French browser from / to /fr/, keeping the query", () => {
    const res = rootRedirect(req("/?src=ig", { "Accept-Language": "fr-FR" }))!;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://arcbuildr.test/fr/?src=ig");
    expect(res.headers.get("Vary")).toContain("Accept-Language");
  });

  it("leaves English visitors and other paths alone", () => {
    expect(rootRedirect(req("/", { "Accept-Language": "en-US" }))).toBeNull();
    expect(rootRedirect(req("/privacy", { "Accept-Language": "fr-FR" }))).toBeNull();
    expect(rootRedirect(req("/", { "Accept-Language": "fr-FR", Cookie: "lang=en" }))).toBeNull();
  });
});
