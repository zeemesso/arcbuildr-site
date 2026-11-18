import { expect, test } from "@playwright/test";
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`one action on screen at a time at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const header = page.locator("header [data-apply]");
    await expect(page.locator("#top-entry button")).toBeInViewport();
    await expect(header).toBeHidden();
    await page.locator("#offer").scrollIntoViewIfNeeded();
    await expect(header).toBeVisible();
    await expect(header).toBeInViewport();
    await header.click();
    await expect(page.locator("#bottom-name")).toBeFocused();
    await expect(page.locator("#bottom-entry button")).toBeInViewport();
    await expect(header).toBeHidden();
  });
}

test("on a short window the header button leads to the form just below", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/");
  await expect(page.locator("#top-entry button")).not.toBeInViewport();
  const header = page.locator("header [data-apply]");
  await expect(header).toBeVisible();
  await header.click();
  await expect(page.locator("#top-name")).toBeFocused();
  await expect(page.locator("#top-entry button")).toBeInViewport();
});

test("pages without the forms link the header button to the home page form", async ({ page }) => {
  for (const path of ["/sample", "/privacy", "/no-such-page"]) {
    await page.goto(path);
    const header = page.locator("header [data-apply]");
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute("href", "/#apply");
  }
  await page.goto("/booked");
  await expect(page.locator("header [data-apply]")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the header button is a plain link to the form", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header [data-apply]");
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute("href", "#apply");
    await header.click();
    await expect(page).toHaveURL(/#apply$/);
    await expect(page.locator("#bottom-entry")).toBeInViewport();
  });
});
