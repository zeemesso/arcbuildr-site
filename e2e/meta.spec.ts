import { expect, test } from "@playwright/test";
import { booked, meta, privacy, sample } from "../src/content/site";
for (const [path, content] of [
  ["/", meta],
  ["/sample", sample],
  ["/booked", booked],
  ["/privacy", privacy],
] as const) {
  test(`${path}: metadata, noindex and no third party requests`, async ({ page }) => {
    const external: string[] = [];
    // The visit counter is the one outside service, and only on a build that was given its token.
    const own = [
      "127.0.0.1",
      "localhost",
      "static.cloudflareinsights.com",
      "cloudflareinsights.com",
    ];
    page.on("request", (r) => {
      if (!own.includes(new URL(r.url()).hostname)) external.push(r.url());
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(content.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      content.description,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      content.title,
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      content.description,
    );
    const robots = await (await page.request.get("/robots.txt")).text();
    // The confirmation page is for people who booked: never in a search engine.
    if (robots.includes("Disallow") || path === "/booked")
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    else await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    expect(external).toEqual([]);
  });
}
