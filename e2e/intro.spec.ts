import { expect, test } from "@playwright/test";

test("intro plays on entry and reload, not when coming back from inside the site", async ({
  page,
}) => {
  const html = page.locator("html");
  await page.goto("/");
  await expect(html).toHaveClass(/\bintro\b/);

  await page.goto("/method");
  await page.getByRole("banner").getByRole("link", { name: "Arcbuildr" }).click();
  await expect(page).toHaveURL("/");
  await expect(html).not.toHaveClass(/\bintro\b/);

  await page.reload();
  await expect(html).toHaveClass(/\bintro\b/);
});
