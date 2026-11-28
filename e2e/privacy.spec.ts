import { expect, test } from "@playwright/test";
import { privacy } from "../src/content/site";
import { CONTACT_EMAIL } from "../src/config";
test("privacy renders all content, lists and contact replacement", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("h1")).toHaveText(privacy.h1);
  await expect(page.getByText(privacy.updated)).toBeVisible();
  expect(await page.locator("main h2").allTextContents()).toEqual(
    privacy.sections.map((s) => s.title),
  );
  for (const section of privacy.sections)
    for (const part of section.body)
      for (const line of Array.isArray(part) ? part : [part])
        await expect(page.locator("main")).toContainText(
          line.replaceAll("{email}", CONTACT_EMAIL || "[contact email]"),
        );
  await expect(page.locator("header .bar__cta")).toHaveAttribute("href", "/#apply");
});
