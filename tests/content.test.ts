import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import { SECTION_IDS } from "../src/content/sections";
import { CONTACT_EMAIL } from "../src/config";
function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  return [];
}
describe("content contract", () => {
  it("has no platform names, em dashes or middle dots", () => {
    for (const [path, text] of strings(content)) {
      expect(text, path).not.toMatch(
        /instagram|tiktok|linkedin|youtube|facebook|whatsapp|twitter|x\.com|threads|snapchat|pinterest/i,
      );
      expect(text, path).not.toContain("—");
      expect(text, path).not.toContain("·");
    }
  });
  it("reserves the places placeholder for the founding count", () => {
    expect(
      strings(content)
        .filter(([, text]) => text.includes("{n}"))
        .map(([path]) => path),
    ).toEqual([".founding.count"]);
  });
  it("resolves every content anchor", () => {
    const ids = new Set<string>([
      ...SECTION_IDS,
      ...content.questions.items.map((item) => item.id),
      ...content.evidence.findings.map((item) => item.id),
    ]);
    const hrefs = strings(content).filter(
      ([path, text]) => path.endsWith(".href") && text.includes("#"),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const [path, href] of hrefs) {
      expect(href.startsWith("#") || href.startsWith("/#"), path).toBe(true);
      expect(ids.has(href.slice(href.indexOf("#") + 1)), path).toBe(true);
    }
    expect(SECTION_IDS).toHaveLength(10);
    expect(new Set(SECTION_IDS).size).toBe(10);
  });
  it("keeps the questions short and leaves the AI objection for the call", () => {
    expect(content.questions.items.length).toBeLessThanOrEqual(4);
    for (const item of content.questions.items) expect(item.q).not.toMatch(/\bAI\b/);
  });
  it("carries the lines other documents depend on, word for word", () => {
    expect(content.booked.invite).toBe(
      "The invite comes by email. If it is not in your inbox in 2 minutes, check spam.",
    );
    const audit = "the 3 things your videos leave unclear";
    expect(content.proof.audit.body).toContain(audit);
    expect(strings(content.booked).some(([, text]) => text.includes(audit))).toBe(true);
    expect(content.offer.price).toMatchObject({ from: "750", to: "1,750", unit: "USD" });
    expect(content.offer.price.line).toContain("One fixed price per size, paid once.");
    expect(CONTACT_EMAIL).toBe("hello@arcbuildr.co");
  });
  it("offers four seasons with original, generic names", () => {
    expect(content.season.seasons.map((s) => s.id)).toEqual([
      "anime",
      "scifi",
      "western",
      "detective",
    ]);
  });
});
