import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { meta } from "../src/content/site";
import { press } from "./press";
// Reduced motion puts every section in its final state, which is the state to check.
test.use({ reducedMotion: "reduce" });
for (const path of ["/", "/sample", "/booked", "/booked?via=chat", "/privacy"]) {
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
test("the application passes axe on a text question, on the choices and on an error", async ({
  page,
}) => {
  await page.route("**/api/lead", (route) => route.fulfill({ status: 204 }));
  await page.goto("/");
  await page.locator("#start input[name=name]").fill("TEST Visitor");
  await page.locator("#start input[name=email]").fill("test@example.com");
  await press(page.locator("#start form button"));
  const layer = page.locator("[data-apply]");
  await expect(layer).toBeVisible();
  await expect(page.locator(".q.is-current #a-profile")).toBeVisible();
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
});
test("every install tab passes axe", async ({ page }) => {
  await page.goto("/");
  for (const tab of await page.getByRole("tab").all()) {
    await press(tab);
    expect((await new AxeBuilder({ page }).include(".install").analyze()).violations).toEqual([]);
  }
});
