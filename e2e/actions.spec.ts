import { expect, test } from "@playwright/test";
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`one action on the first screen at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const header = page.locator("header .action");
    await expect(header).toBeHidden();
    await expect(page.locator("#top-entry button")).toBeInViewport();
    await expect
      .poll(() =>
        page.locator(".action:visible").evaluateAll(
          (actions) =>
            actions.filter((el) => {
              const r = el.getBoundingClientRect();
              return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
            }).length,
        ),
      )
      .toBe(1);
    await page.locator("#method").scrollIntoViewIfNeeded();
    if (viewport.width === 1280) {
      await expect(header).toBeVisible();
      await expect(header).toBeInViewport();
      await header.click();
      await expect(page.locator("#bottom-name")).toBeFocused();
    } else await expect(header).toBeHidden();
  });
}

test("offer focuses bottom entry", async ({ page }) => {
  await page.goto("/");
  await page.locator("#offer").scrollIntoViewIfNeeded();
  await page.locator("#offer [data-apply]").click();
  await expect(page.locator("#bottom-name")).toBeFocused();
});
test("mobile bottom bar follows entry visibility", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Mobile bar");
  await page.goto("/");
  const bar = page.locator("[data-bottom-bar]");
  await expect(bar).toHaveAttribute("aria-hidden", "true");
  await page.locator("#method").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("aria-hidden", "false");
  await expect(bar.locator("a")).toBeInViewport();
  await page.locator("#apply").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("aria-hidden", "true");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("header action follows the entry breakpoint only on home", async ({ page }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/", "/privacy", "/404"]) {
        await page.goto(path);
        const action = page.locator("header .action");
        if (path === "/" && width < 1024) await expect(action).toBeHidden();
        else await expect(action).toBeVisible();
      }
    }
  });
});
