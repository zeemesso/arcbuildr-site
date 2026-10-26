import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The e2e server is a preview build, so the draft placeholder notes are present.

async function axeClean(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function tapTargetsOk(page: import("@playwright/test").Page) {
  for (const link of await page.locator("a:visible").all()) {
    // The header has its own target rule (nav.spec).
    if (await link.evaluate((el) => el.matches(".skip, .site-header a"))) continue;
    expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  }
}

test("index lists notes newest first", async ({ page }) => {
  await page.goto("/notes");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const items = page.locator(".notes__item");
  await expect(items).toHaveCount(2);
  const dates = await items
    .locator("time")
    .evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!));
  expect(dates).toEqual([...dates].sort().reverse());
  expect(await items.first().getAttribute("href")).toBe("/notes/placeholder-note-one");
});

test("index is axe clean and has 44px tap targets", async ({ page }) => {
  await page.goto("/notes");
  await axeClean(page);
  await tapTargetsOk(page);
});

test("note page shows title and the call band, axe clean, 44px targets", async ({ page }) => {
  await page.goto("/notes");
  await page.locator(".notes__item").first().click();
  await expect(page).toHaveURL(/\/notes\/placeholder-note-one$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("[Placeholder: note title one]");
  await expect(page.getByRole("heading", { level: 2, name: /call band heading/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Book an intro call" })).toHaveAttribute(
    "href",
    "/#start",
  );
  await axeClean(page);
  await tapTargetsOk(page);
});
