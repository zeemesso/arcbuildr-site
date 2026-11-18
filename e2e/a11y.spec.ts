import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { meta } from "../src/content/site";
// Reduced motion puts every section in its final state, which is the state to check.
test.use({ reducedMotion: "reduce" });
for (const path of ["/", "/sample", "/booked", "/privacy"]) {
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
test("every costume keeps its text readable", async ({ page }) => {
  await page.goto("/");
  for (const id of ["anime", "scifi", "western", "detective"]) {
    await page.locator(`.chips input[value="${id}"]`).check({ force: true });
    const result = await new AxeBuilder({ page }).include(".season__play").analyze();
    expect(result.violations, id).toEqual([]);
  }
});
