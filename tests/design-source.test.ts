import { describe, expect, it } from "vitest";
import { action } from "../src/content/site";
import { PLAN_TEXT } from "../src/lib/magnet/text";

// Every page on arcbuildr.co takes its look from the site: the Base layout (header, footer and the
// site's style files) and the names in src/styles/tokens.css. A magnet page with its own layout,
// colours or fonts would stay behind the next time the site's design changes.

const pages = import.meta.glob<string>(["../src/pages/m/*.astro", "../src/pages/plan/*.astro"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const components = import.meta.glob<string>("../src/components/Magnet*.astro", {
  query: "?raw",
  import: "default",
  eager: true,
});

// A colour or a font written out instead of a token name. color-mix() of tokens is fine.
const RAW_LOOK = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(|font-family\s*:/i;

/** The style parts of an .astro file: <style> blocks and style attributes. */
function styleParts(source: string): string[] {
  const blocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const attributes = [...source.matchAll(/\sstyle=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map(
    (m) => m[1] ?? m[2],
  );
  return [...blocks, ...attributes];
}

describe("magnet pages use the site's design", () => {
  it("finds the magnet pages and components", () => {
    expect(Object.keys(pages)).toHaveLength(2);
    expect(Object.keys(components).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(pages))(
    "%s uses the Base layout and no style file of its own",
    (_, source) => {
      expect(source).toMatch(/import Base from "[./]+\/layouts\/Base\.astro"/);
      expect(source).not.toMatch(/import\s+"[^"]*\/styles\/[^"]+\.css"/);
    },
  );

  it.each(Object.entries({ ...pages, ...components }))(
    "%s writes no colour or font of its own",
    (_, source) => {
      const raw = styleParts(source)
        .flatMap((css) => css.split("\n"))
        .filter((line) => RAW_LOOK.test(line))
        .map((line) => line.trim());
      expect(raw).toEqual([]);
    },
  );

  it("sends the plan page's button to the site's apply form, with the site's words", () => {
    const apply = import.meta.glob<string>("../src/components/page/Apply.astro", {
      query: "?raw",
      import: "default",
      eager: true,
    });
    expect(PLAN_TEXT.ctaButton).toBe(action);
    expect(PLAN_TEXT.ctaHref).toBe("/#apply");
    expect(Object.values(apply)[0]).toMatch(/\sid="apply"/);
  });
});
