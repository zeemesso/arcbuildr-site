import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { meta } from "../src/content/site";
import { press } from "./press";
import { calendar, ending, plain, stub } from "./stubs";
// Reduced motion puts every section in its final state, which is the state to check.
test.use({ reducedMotion: "reduce" });
for (const path of ["/", "/booked", "/booked?via=chat", "/privacy"]) {
  test(`${path}: axe, open details and heading hierarchy`, async ({ page, browserName }) => {
    await page.goto(path);
    const skip = page.locator(".skip");
    // Safari's engine reaches links with Option+Tab unless the user changed a setting.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText(meta.skip);
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
test("the site's own layer passes axe: the plain form, its error, and the ending with no calendar", async ({
  page,
}) => {
  await stub(page, "ok", "blocked");
  await page.goto("/");
  await press(page.locator("#top [data-apply-open]").first());
  await expect(plain(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await press(page.locator("[data-ok]"));
  await expect(page.locator("[data-plain-err]")).not.toHaveText("");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/?apply=end&name=TEST+Visitor");
  await expect(ending(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("the calendar's panel passes axe", async ({ page }) => {
  await stub(page);
  await page.goto("/?apply=calendar&name=TEST+Visitor&email=test%2Bb%40example.com");
  await expect(calendar(page).locator("iframe")).toBeVisible();
  // The frame's inside is Cal.com's, and here a stand-in: only our own panel is checked.
  expect((await new AxeBuilder({ page }).exclude("iframe").analyze()).violations).toEqual([]);
});
