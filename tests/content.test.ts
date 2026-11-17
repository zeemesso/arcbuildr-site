import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import { SECTION_IDS } from "../src/content/sections";
function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  return [];
}
describe("content contract", () => {
  it("has no platform names or em dashes", () => {
    for (const [path, text] of strings(content)) {
      expect(text, path).not.toMatch(
        /instagram|tiktok|linkedin|youtube|facebook|whatsapp|twitter|x\.com|threads|snapchat|pinterest/i,
      );
      expect(text, path).not.toContain("\u2014");
    }
  });
  it("reserves the places placeholder for founding", () => {
    expect(
      strings(content)
        .filter(([, text]) => text.includes("{n}"))
        .map(([path]) => path),
    ).toEqual([".founding"]);
  });
  it("resolves every content anchor", () => {
    const ids = new Set<string>([
      ...SECTION_IDS,
      ...content.questions.items.map((item) => item.id),
    ]);
    const hrefs = strings(content).filter(
      ([path, text]) => path.endsWith(".href") && text.startsWith("#"),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const [path, href] of hrefs) expect(ids.has(href.slice(1)), path).toBe(true);
    expect(SECTION_IDS).toHaveLength(13);
    expect(new Set(SECTION_IDS).size).toBe(13);
  });
});
