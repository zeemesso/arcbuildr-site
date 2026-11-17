import { expect, test } from "@playwright/test";
import { notFound } from "../src/content/site";
test("404 renders content and a home link", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(notFound.title);
  await expect(page.locator("h1")).toHaveText(notFound.h1);
  await expect(page.locator("main")).toContainText(notFound.body);
  await expect(page.getByRole("link", { name: notFound.link })).toHaveAttribute("href", "/");
});
test("sitemap lists only home and privacy", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])).toEqual([
    "https://arcbuildr.co/",
    "https://arcbuildr.co/privacy",
  ]);
});
