import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("arc-intro", "1"));
});

test("About has its title, heading and founding date", async ({ page }) => {
  await page.goto("/about/");
  await expect(page).toHaveTitle("About · Arcbuildr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Two founders,\s*one method\./);
  await expect(page.getByText("Founded September 23, 2026.", { exact: true })).toBeVisible();
});

test("About shows the three principles of how we work", async ({ page }) => {
  await page.goto("/about/");
  const section = page.getByRole("region", { name: "How we work", exact: true });
  for (const [heading, line] of [
    ["Your real story", "We build your brand and content from your story and what you know."],
    ["No niche template", "Your work adapts to who you are, not to a template for your niche."],
    [
      "We stay after delivery",
      "Ongoing support: answers when you have questions, revisions when something needs to change.",
    ],
  ]) {
    const card = section
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
    await expect(card).toHaveCount(1);
    await expect(card.getByText(line, { exact: true })).toHaveCount(1);
  }
});

test("About call band links to the intro form", async ({ page }) => {
  await page.goto("/about/");
  await expect(
    page.locator(".call-band").getByRole("link", { name: "Book an intro call" }),
  ).toHaveAttribute("href", "/#start");
});

test("sitemap includes About", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("<loc>https://arcbuildr.co/about</loc>");
});
