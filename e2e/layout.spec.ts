import { expect, test } from "@playwright/test";
import { hero } from "../src/content/site";
for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
  test(`${width}px has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
    if (width === 320) {
      const strip = page.locator(".script-strip");
      expect(await strip.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    if ([375, 768, 1440].includes(width))
      await page.screenshot({ path: `test-results/layout-${width}.png`, fullPage: true });
  });
}
test("first screen fits on phones and desktop", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const box = (await page.locator("#top-entry button").boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  await page.setViewportSize({ width: 390, height: 844 });
  const phoneButton = (await page.locator("#top-entry button").boundingBox())!;
  expect(phoneButton.y + phoneButton.height).toBeLessThan(620);
  await expect(page.getByText(hero.notes[0], { exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 900 });
  const heroBox = (await page.locator("#top").boundingBox())!;
  expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(900);
});
test("mobile interactive targets are at least 44px", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone targets");
  for (const path of ["/", "/privacy", "/404"]) {
    await page.goto(path);
    for (const target of await page
      .locator("header, main, footer")
      .locator("a:visible, button:visible, input:visible, summary:visible")
      .all()) {
      if (await target.evaluate((el) => el.matches("p a, .skip"))) continue;
      expect(Math.round((await target.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    }
  }
});

test("sticky heading stays within its section", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const heading = page.locator("#evidence .section-heading");
  const section = page.locator("#evidence");
  await section.evaluate((el) => scrollBy(0, el.getBoundingClientRect().top + 200));
  expect((await heading.boundingBox())!.y).toBeCloseTo(88, 0);
  await section.evaluate((el) => scrollBy(0, el.getBoundingClientRect().bottom - 120));
  const box = (await heading.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(121);
});
