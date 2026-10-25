import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = ["/", "/method/", "/about/", "/notes", "/thanks", "/privacy", "/no-such-page"];
const widths = [
  { width: 375, height: 667 },
  { width: 1280, height: 800 },
];

for (const size of widths) {
  for (const path of pages) {
    test(`${path} at ${size.width}px: no sideways scroll, axe clean`, async ({ page }, info) => {
      await page.setViewportSize(size);
      await page.route("https://app.cal.com/**", (route) => route.abort());
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      const name = path === "/" ? "home" : path.replace(/^\/|\/$/g, "");
      await page.screenshot({
        path: `test-results/step8/${name}-${size.width}.png`,
        fullPage: true,
      });
      void info;
    });
  }
}

test("every internal link and anchor on every page resolves", async ({ page }) => {
  await page.route("https://app.cal.com/**", (route) => route.abort());
  const seen = new Set<string>();
  for (const path of ["/", "/method/", "/about/", "/notes", "/thanks", "/privacy"]) {
    await page.goto(path);
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    for (const href of hrefs) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const key = `${path} -> ${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const url = new URL(href, `http://x${path}`);
      if (url.hash && url.pathname === path) {
        expect(await page.locator(url.hash).count(), key).toBe(1);
      } else {
        const res = await page.request.get(url.pathname);
        expect(res.status(), key).toBe(200);
        if (url.hash) {
          const html = await res.text();
          expect(html, key).toContain(`id="${url.hash.slice(1)}"`);
        }
      }
    }
  }
  expect(seen.size).toBeGreaterThan(5);
});
