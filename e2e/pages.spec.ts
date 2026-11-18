import { expect, test } from "@playwright/test";
import { booked, notFound, sample } from "../src/content/site";
import { APPLICATION_AFTER_BOOKING_URL, CONFIRMATION_VIDEO, FOUNDER_VIDEO } from "../src/config";

test("404 renders content and a home link", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(notFound.title);
  await expect(page.locator("h1")).toHaveText(notFound.h1);
  await expect(page.locator("main")).toContainText(notFound.body);
  await expect(page.getByRole("link", { name: notFound.link })).toHaveAttribute("href", "/");
});

test("sitemap lists home, the sample and privacy", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])).toEqual([
    "https://arcbuildr.co/",
    "https://arcbuildr.co/sample",
    "https://arcbuildr.co/privacy",
  ]);
});

test("the sample page shows the whole episode and leads back to the form", async ({ page }) => {
  await page.goto("/sample");
  await expect(page.locator("h1")).toHaveText(sample.h1);
  const rows = page.locator(".script__row");
  await expect(rows).toHaveCount(sample.doc.rows.length);
  for (const [i, row] of sample.doc.rows.entries()) {
    await expect(rows.nth(i)).toContainText(row.say);
    await expect(rows.nth(i)).toContainText(row.show);
  }
  await expect(page.locator(".script__caption")).toContainText(sample.doc.caption);
  await expect(page.locator("main a.btn")).toHaveAttribute("href", "/#apply");
});

test.describe("the confirmation page", () => {
  test("says the invite line, the agenda and what to have ready", async ({ page }) => {
    await page.goto("/booked");
    await expect(page.locator("h1")).toHaveText(booked.h1);
    await expect(page.locator("main")).toContainText(
      "The invite comes by email. If it is not in your inbox in 2 minutes, check spam.",
    );
    for (const item of [...booked.call.items, ...booked.ready.items])
      await expect(page.locator("main")).toContainText(item);
    // No other offer on this page, and no way to start a second application.
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("header [data-apply]")).toHaveCount(0);
  });

  test("does not assume the application is done", async ({ page }) => {
    await page.goto("/booked");
    await expect(page.locator("main")).toContainText(booked.application.body);
    await expect(page.locator("main")).not.toContainText(
      /your answers are|you answered|thanks for/i,
    );
    const link = page.getByRole("link", { name: booked.application.link });
    if (APPLICATION_AFTER_BOOKING_URL)
      await expect(link).toHaveAttribute("href", APPLICATION_AFTER_BOOKING_URL);
    else await expect(link).toHaveCount(0);
  });

  test("greets by first name when the booking passes one, and only a plain name", async ({
    page,
  }) => {
    await page.goto("/booked?attendeeName=TEST+Visitor&email=test%40example.com");
    await expect(page.locator("h1")).toHaveText(booked.h1Named.replace("{name}", "TEST"));
    await page.goto("/booked?attendeeName=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E");
    await expect(page.locator("h1")).toHaveText(booked.h1);
    await expect(page.locator("h1 img")).toHaveCount(0);
    await page.goto("/booked?name=" + "a".repeat(60));
    await expect(page.locator("h1")).toHaveText(booked.h1);
  });
});

test("video slots show a poster and load no video until one is set", async ({ page }) => {
  const media: string[] = [];
  page.on("request", (r) => r.resourceType() === "media" && media.push(r.url()));
  for (const [path, src] of [
    ["/", FOUNDER_VIDEO],
    ["/booked", CONFIRMATION_VIDEO],
  ] as const) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".video .video__zyade")).toHaveCount(1);
    // The video element is made on the first press, so there is none before it.
    await expect(page.locator(".video video")).toHaveCount(0);
    const play = page.locator(".video [data-play]");
    if (src) await expect(play).toHaveAttribute("href", src);
    else await expect(play).toHaveCount(0);
  }
  expect(media).toEqual([]);
});
