import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("no accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("header stays on top while scrolling and the button jumps to the form", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.body.style.minHeight = "3000px";
    window.scrollTo(0, 1500);
  });
  const header = page.locator(".site-header");
  expect((await header.boundingBox())?.y).toBe(0);
  await expect(page.getByRole("link", { name: "Book a call" })).toHaveAttribute("href", "/#start");
});

for (const path of ["/", "/method/", "/about/"]) {
  test(`${path}: body text is at least 16px and tap targets at least 44px`, async ({ page }) => {
    await page.goto(path);
    const size = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    for (const link of await page.locator("a:visible").all()) {
      // The header has its own target rule (nav.spec).
      if (await link.evaluate((el) => el.matches(".skip, .site-header a"))) continue;
      expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    }
  });
}

test("frames at this width", async ({ page }, info) => {
  await page.goto("/");
  await page.screenshot({
    path: `test-results/frames/home-${info.project.name}.png`,
    fullPage: true,
  });
});
