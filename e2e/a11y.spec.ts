import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { meta } from "../src/content/site";
for (const path of ["/", "/privacy"]) {
  test(`${path}: axe, open details and heading hierarchy`, async ({ page }) => {
    await page.goto(path);
    const skip = page.locator(".skip");
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText(meta.skip);
    if (path === "/") await expect(page.locator("header .action")).toBeHidden();
    else await expect(page.locator("header .action")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    const levels = await page
      .locator("h1,h2,h3,h4,h5,h6")
      .evaluateAll((els) => els.map((el) => Number(el.tagName[1])));
    for (let i = 1; i < levels.length; i++)
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.locator("details").evaluateAll((els) => els.forEach((el) => (el.open = true)));
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
