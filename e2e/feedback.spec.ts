import { expect, test } from "@playwright/test";

// The e2e build runs on a branch that is not main, so the toolbar must be there.
test("the feedback toolbar shows on a preview build", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("agentation-toolbar")).toHaveCount(1);
});
