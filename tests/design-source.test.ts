import { describe, expect, it } from "vitest";
import { action } from "../src/content/site";
import { PLAN_TEXT } from "../src/lib/magnet/text";

// One look on every page (DESIGN.md, section 17). Every page renders through src/layouts/Home.astro,
// directly, through Base.astro or through the home page's Page.astro, so every page has the same header,
// footer and styles. Home.astro loads src/styles/site.css, the one list of shared styles, which
// go.arcbuildr.co copies. A page with its own <html>, its own shared styles, or colours and fonts written
// out would stay behind the next time the design changes.

const raw = (files: Record<string, string>) => Object.entries(files);
const pages = import.meta.glob<string>("../src/pages/**/*.astro", {
  query: "?raw",
  import: "default",
  eager: true,
});
const components = import.meta.glob<string>("../src/components/**/*.astro", {
  query: "?raw",
  import: "default",
  eager: true,
});
const layouts = import.meta.glob<string>("../src/layouts/*.astro", {
  query: "?raw",
  import: "default",
  eager: true,
});
const styleFiles = import.meta.glob<string>(
  ["../src/styles/**/*.css", "../src/components/**/*.css"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);
const siteList = styleFiles["../src/styles/site.css"] ?? "";

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

/** The style files an .astro file imports, as written. */
const cssImports = (source: string) =>
  [...source.matchAll(/^import\s+"([^"]+\.css)";/gm)].map((m) => m[1]);

/** The files src/styles/site.css lists, as paths from src/styles/. */
const listed = [...siteList.matchAll(/@import\s+"([^"]+)";/g)].map((m) => m[1]);
const fromStyles = (path: string) => new URL(path, "file:///src/styles/").pathname;

describe("every page has the one look", () => {
  it("finds the pages, components and the one list of styles", () => {
    expect(Object.keys(pages).length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(components).length).toBeGreaterThan(10);
    expect(listed.length).toBeGreaterThan(5);
  });

  it.each(raw(pages))("%s renders through the one layout", (_, source) => {
    expect(source).toMatch(
      /import (?:Home|Base) from "[./]+\/layouts\/(?:Home|Base)\.astro"|import Page from "[./]+\/components\/page\/Page\.astro"/,
    );
    expect(source).not.toMatch(/<html|<body/);
  });

  it("gives every other page the home page's header and footer", () => {
    const base = layouts["../src/layouts/Base.astro"]!;
    expect(base).toMatch(/import Home from "\.\/Home\.astro"/);
    expect(base).toMatch(/<Bar slot="bar"/);
    expect(base).toMatch(/<Foot slot="after"/);
  });

  it("loads the shared styles in one place only", () => {
    const home = layouts["../src/layouts/Home.astro"]!;
    expect(cssImports(home)).toEqual(["../styles/site.css"]);
    for (const [file, source] of raw({ ...pages, ...components, ...layouts })) {
      if (file.endsWith("/Home.astro")) continue;
      for (const imported of cssImports(source)) {
        // A page may add its own sheet for its own classes; a shared file comes only through site.css.
        const name = imported.split("/").pop()!;
        expect(
          listed.map((path) => path.split("/").pop()),
          `${file} imports ${imported}`,
        ).not.toContain(name);
      }
    }
  });

  it("lists every shared style file in site.css, so go.arcbuildr.co copies it", () => {
    const own = new Set(["../src/styles/site.css", "../src/styles/page/booked.css"]);
    const paths = listed.map((path) => `../src${fromStyles(path).replace(/^\/src/, "")}`);
    for (const file of Object.keys(styleFiles)) {
      if (own.has(file)) continue;
      expect(paths, `${file} is not in src/styles/site.css`).toContain(file);
    }
  });

  it.each(raw({ ...pages, ...components, ...layouts }))(
    "%s writes no colour or font of its own",
    (_, source) => {
      const found = styleParts(source)
        .flatMap((css) => css.split("\n"))
        .filter((line) => RAW_LOOK.test(line))
        .map((line) => line.trim());
      expect(found).toEqual([]);
    },
  );

  it("sends the plan page's button to the site's apply form, with the site's words", () => {
    const apply = components["../src/components/page/Apply.astro"];
    expect(PLAN_TEXT.ctaButton).toBe(action);
    expect(PLAN_TEXT.ctaHref).toBe("/#apply");
    expect(apply).toMatch(/\sid="apply"/);
  });
});
