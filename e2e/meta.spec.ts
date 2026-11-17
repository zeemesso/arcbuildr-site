import { expect, test } from "@playwright/test";
import { meta, privacy } from "../src/content/site";
for (const [path, content] of [
  ["/", meta],
  ["/privacy", privacy],
] as const) {
  test(`${path}: metadata, noindex and no third party requests`, async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (!["127.0.0.1", "localhost"].includes(new URL(r.url()).hostname)) external.push(r.url());
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
    if (robots.includes("Disallow"))
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    else await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    expect(external).toEqual([]);
  });
}
