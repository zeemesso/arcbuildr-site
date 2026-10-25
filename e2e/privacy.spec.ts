import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("privacy page has the five sections and names the four tools", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
  expect(headings).toEqual([
    "Who we are",
    "What we collect",
    "Why we collect it",
    "Who else sees it",
    "How long we keep it, and how to ask us to delete it",
  ]);
  const text = await page.locator("main").innerText();
  for (const tool of ["Cloudflare", "Notion", "Resend", "Cal.com"]) expect(text).toContain(tool);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("privacy is linked from the form and the footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#lead-form").getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  await expect(page.locator("footer").getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
});
