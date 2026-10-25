import { expect, test } from "@playwright/test";

const meta = (page: import("@playwright/test").Page, sel: string) =>
  page.locator(sel).getAttribute("content");

test("home has the title, description and Open Graph tags from COPY.md", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Arcbuildr | Personal brand service for business-driven people");
  const description =
    "We build your personal brand and Instagram content from your real story and expertise. Brand strategy, visual identity, profile audit, content and ongoing support.";
  expect(await meta(page, 'meta[name="description"]')).toBe(description);
  expect(await meta(page, 'meta[property="og:title"]')).toBe(await page.title());
  expect(await meta(page, 'meta[property="og:description"]')).toBe(description);
  expect(await meta(page, 'meta[property="og:type"]')).toBe("website");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(
    "https://arcbuildr.co/",
  );
});

test("this build is a preview, so pages are noindex and robots.txt blocks crawling", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
});

test("sitemap lists home and privacy but not /thanks", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect(xml).toContain("<loc>https://arcbuildr.co/</loc>");
  expect(xml).toContain("<loc>https://arcbuildr.co/privacy</loc>");
  expect(xml).not.toContain("thanks");
});

test("an unknown page shows the plain 404 page with a way home", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("That page isn't here.");
  await expect(page.getByRole("link", { name: "Go to the home page" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("no analytics beacon without a token", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveCount(0);
});
