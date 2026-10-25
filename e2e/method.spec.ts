import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { deliverables } from "../src/data/deliverables";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("arc-intro", "1"));
});

for (const path of ["/method/", "/"]) {
  test(`${path} shows the five shared deliverables in order`, async ({ page }) => {
    await page.goto(path);
    const cards = page.locator(path === "/" ? ".bento > li" : ".method__steps > li");
    await expect(cards).toHaveCount(5);
    for (const [i, deliverable] of deliverables.entries()) {
      await expect(
        cards.nth(i).getByRole("heading", { name: deliverable.name, exact: true }),
      ).toHaveText(deliverable.name);
      await expect(cards.nth(i).getByText(deliverable.text, { exact: true })).toHaveCount(1);
    }
  });
}

test("Method has its heading, placeholders and call links", async ({ page }) => {
  await page.goto("/method/");
  await expect(page).toHaveTitle("Method · Arcbuildr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Five builds,\s*in order\./);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("[Placeholder: one-line lede]", { exact: true })).toBeVisible();
  const cards = page.locator(".method__steps > li");
  for (let i = 0; i < 5; i++) {
    await expect(
      cards.nth(i).getByRole("heading", { name: "What you give us", exact: true }),
    ).toHaveCount(1);
    await expect(
      cards.nth(i).getByRole("heading", { name: "What you get", exact: true }),
    ).toHaveCount(1);
    await expect(cards.nth(i).getByRole("listitem")).toHaveText(["[Placeholder]", "[Placeholder]"]);
  }
  await expect(
    page.getByText("We don't publish for you. You post everything on your account.", {
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(page.getByText("No LinkedIn, no YouTube.", { exact: true })).toHaveCount(1);
  for (const link of await page.getByRole("link", { name: "Book an intro call" }).all()) {
    await expect(link).toHaveAttribute("href", "/#start");
  }
});

test("Method heading and hero button fit a 375 x 667 first screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/method/");
  await page.evaluate(() => document.fonts.ready);
  for (const locator of [
    page.getByRole("heading", { level: 1 }),
    page.locator(".hero__action .btn"),
  ]) {
    await expect(locator).toBeVisible();
    const box = (await locator.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
  await expect(page.locator(".site-header__cta")).toBeHidden();
});

test("Method is axe clean", async ({ page }) => {
  await page.goto("/method/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("sitemap includes Method", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("<loc>https://arcbuildr.co/method</loc>");
});
