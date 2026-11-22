import { expect, test } from "@playwright/test";
import { privacy } from "../src/content/site";
import { section } from "../src/content/deck";

const head = section("title and description");
const booked = section("the booked page");
/** Each page's title and description, and what a shared link shows. */
const PAGES = [
  {
    path: "/",
    title: head.get("title"),
    description: head.get("description"),
    share: [head.get("link preview, title"), head.get("link preview, description")],
  },
  {
    path: "/booked",
    title: booked.get("heading, no name"),
    description: booked.get("practical 1"),
  },
  { path: "/privacy", title: privacy.title, description: privacy.description },
];
for (const { path, title, description, share = [title, description] } of PAGES) {
  test(`${path}: metadata, noindex and no third party requests`, async ({ page }) => {
    const external: string[] = [];
    // The visit counter is the one outside service, and only on a build that was given its token.
    const own = [
      "127.0.0.1",
      "localhost",
      "static.cloudflareinsights.com",
      "cloudflareinsights.com",
    ];
    page.on("request", (r) => {
      if (!own.includes(new URL(r.url()).hostname)) external.push(r.url());
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", share[0]!);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      share[1]!,
    );
    const robots = await (await page.request.get("/robots.txt")).text();
    // The page after a booking is for people who booked: never in a search engine.
    if (robots.includes("Disallow") || path === "/booked")
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    else await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    // The calendar's script loads only after an application is saved: never on a plain visit.
    expect(external).toEqual([]);
  });
}
