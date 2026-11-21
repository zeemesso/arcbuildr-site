import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { meta } from "../src/content/site";
import { press } from "./press";
import { calendar, ending, open, stub } from "./stubs";
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
test("the application passes axe on a text question, on the choices, on an error and on both endings", async ({
  page,
}) => {
  await stub(page);
  await open(page, { name: "TEST Visitor", email: "test@example.com" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await press(page.locator("[data-ok]"));
  await expect(page.locator(".q.is-current [data-err]")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const id of ["profile", "sell", "stranger"]) {
    await page.locator(`.q.is-current #a-${id}`).fill("4");
    await page.locator(`.q.is-current #a-${id}`).press("Enter");
  }
  await expect(page.locator('.q.is-current[data-id="film"]')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const id of ["film", "count", "decides", "start"])
    await press(page.locator(`.q.is-current[data-id="${id}"] .choice`).first());
  // The lowest budget: the ending with no calendar.
  await press(page.locator('.q.is-current[data-id="budget"] .choice').first());
  await expect(ending(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("the calendar's panel passes axe", async ({ page }) => {
  await stub(page);
  await open(page, { name: "TEST Visitor", email: "test+b@example.com" });
  for (const id of ["profile", "sell", "stranger"]) {
    await page.locator(`.q.is-current #a-${id}`).fill("4");
    await page.locator(`.q.is-current #a-${id}`).press("Enter");
  }
  for (const id of ["film", "count", "decides", "start"])
    await press(page.locator(`.q.is-current[data-id="${id}"] .choice`).first());
  await press(page.locator('.q.is-current[data-id="budget"] .choice').nth(1));
  await expect(calendar(page).locator("iframe")).toBeVisible();
  // The frame's inside is Cal.com's, and here a stand-in: only our own panel is checked.
  expect((await new AxeBuilder({ page }).exclude("iframe").analyze()).violations).toEqual([]);
});
