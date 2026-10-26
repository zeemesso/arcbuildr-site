import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const links = [
  ["Method", "/method"],
  ["Notes", "/notes"],
  ["About", "/about"],
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("arc-intro", "1"));
});

test("mobile Menu opens the sheet and Escape closes it", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone navigation");
  await page.goto("/");
  await page.evaluate(() => scrollTo(0, 600));
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const sheet = page.locator("#site-menu");
  await expect(sheet).toBeHidden();
  await menu.tap();
  await expect(sheet).toBeVisible();
  for (const [name, href] of links) {
    const link = sheet.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(sheet.getByRole("link", { name: "Book a call" })).toHaveAttribute("href", "/#start");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.tap();
  await page.touchscreen.tap(1, 1);
  await expect(sheet).toBeHidden();
});

test("desktop header shows Method, Notes and About", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop navigation");
  await page.goto("/");
  const header = page.getByRole("banner");
  for (const [name, href] of links) {
    const link = header.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(header.getByRole("button", { name: "Menu" })).toBeHidden();
});

test("current page is unmarked on Home and marked on Privacy", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[aria-current="page"]')).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator('a[aria-current="page"]')).toHaveCount(1);
});

test("Home is axe clean with the mobile sheet open", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone navigation");
  await page.goto("/");
  await page.evaluate(() => scrollTo(0, 600));
  await page.getByRole("button", { name: "Menu", exact: true }).tap();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("navigation links and Menu have 44px tap targets", async ({ page }, info) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  for (const link of await header.locator("a:visible").all()) {
    expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  }
  if (info.project.name === "mobile") {
    await page.evaluate(() => scrollTo(0, 600));
    const menu = header.getByRole("button", { name: "Menu", exact: true });
    await expect(menu).toBeVisible();
    expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await menu.tap();
  }
  for (const link of await header.locator("a:visible").all()) {
    // Round: the sheet links can measure 43.99999 px.
    expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  }
});

test("phone header closes inward on scroll and opens again at the top", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone header");
  await page.goto("/");
  const header = page.getByRole("banner");
  const menu = header.getByRole("button", { name: "Menu", exact: true });
  const method = header.getByRole("link", { name: "Method", exact: true });
  await expect(method).toBeVisible();
  await expect(menu).toBeHidden();
  const open = (await header.locator(".site-header__pill").boundingBox())!.width;
  await page.evaluate(() => scrollTo(0, 600));
  await expect(method).toBeHidden();
  await expect(menu).toBeVisible();
  await expect
    .poll(async () => (await header.locator(".site-header__pill").boundingBox())!.width)
    .toBeLessThan(open);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(method).toBeVisible();
  await expect(menu).toBeHidden();
});

test("header and footer links hover as a pill, never underlined", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Pointer hover");
  await page.goto("/");
  for (const link of [
    page.getByRole("banner").getByRole("link", { name: "Method", exact: true }),
    page.getByRole("contentinfo").getByRole("link", { name: "Privacy", exact: true }),
  ]) {
    await link.hover();
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await expect(link).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
});
