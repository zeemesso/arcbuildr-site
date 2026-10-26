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

test("desktop header shows Method, Notes and About", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop navigation");
  await page.goto("/");
  const header = page.getByRole("banner");
  for (const [name, href] of links) {
    const link = header.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
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

test("Home is axe clean on phone at top and when scrolled", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone navigation");
  await page.goto("/");
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.evaluate(() => scrollTo(0, 600));
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("header navigation links and button have 44px tap targets", async ({ page }, info) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  for (const link of await header.locator("a:visible").all()) {
    // Round: tap targets can measure 43.99999 px.
    expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  }
  if (info.project.name === "mobile") {
    await page.evaluate(() => scrollTo(0, 600));
  }
  for (const link of await header.locator("a:visible").all()) {
    expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  }
});

test("phone header folds on scroll and unfolds at the top", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone header");
  await page.goto("/");
  const header = page.getByRole("banner");
  const pill = header.locator(".site-header__pill");
  const method = header.getByRole("link", { name: "Method", exact: true });
  const button = header.getByRole("link", { name: "Book a call", exact: true });
  const arc = header.locator(".wordmark__arc");
  const wordmarkSpan = header.locator(".wordmark > span");

  // At top: links and wordmark text visible, button hidden
  await expect(method).toBeVisible();
  await expect(button).toBeHidden();
  await expect(wordmarkSpan).toBeVisible();
  const openWidth = (await pill.boundingBox())!.width;

  // Scroll: links and wordmark text hidden, favicon tile and button visible
  await page.evaluate(() => scrollTo(0, 600));
  await expect(method).toBeHidden();
  await expect(button).toBeVisible();
  await expect(wordmarkSpan).toBeHidden();
  await expect(arc).toBeVisible();
  await expect(arc).toHaveCSS("background-color", /rgb.*232.*114.*46/); // accent orange
  const scrolledWidth = (await pill.boundingBox())!.width;
  expect(scrolledWidth).toBeLessThan(openWidth);

  // Back to top: links and wordmark visible, button hidden
  await page.evaluate(() => scrollTo(0, 0));
  await expect(method).toBeVisible();
  await expect(button).toBeHidden();
  await expect(wordmarkSpan).toBeVisible();
  const backWidth = (await pill.boundingBox())!.width;
  expect(backWidth).toBeCloseTo(openWidth, 5);
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
