import { expect, test, type Page } from "@playwright/test";
import { press } from "./press";
/** The first screen's entrance has played: every element is where it stays. */
const settled = (page: Page) =>
  page
    .locator("#start")
    .evaluate((hero) =>
      Promise.all(hero.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))),
    );
const overflow = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
for (const width of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440]) {
  test(`${width}px has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/sample", "/booked", "/booked?via=chat", "/privacy"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await page.locator("details").evaluateAll((els) => els.forEach((el) => (el.open = true)));
      expect(await page.evaluate(overflow), path).toBeLessThanOrEqual(0);
    }
  });
}

// Most visitors arrive in an in-app browser on a phone, about 650 px tall.
for (const width of [360, 375, 390, 414]) {
  test(`${width} x 650: name, email and the button show without scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 650 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await settled(page);
    const h1 = (await page.locator("h1").boundingBox())!;
    expect(h1.y).toBeGreaterThanOrEqual(0);
    for (const selector of [
      "#start input[name=name]",
      "#start input[name=email]",
      "#start form button",
    ]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.y, selector).toBeGreaterThan(h1.y + h1.height);
      expect(box.y + box.height, selector).toBeLessThanOrEqual(650);
    }
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
}

test("the first screen holds the form on a tall phone and on a desktop", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await settled(page);
    const box = (await page.locator("#start form button").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
});

test("mobile interactive targets are at least 44px", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone targets");
  for (const path of ["/", "/sample", "/booked", "/booked?via=chat", "/privacy", "/no-such-page"]) {
    await page.goto(path);
    await page.locator("details").evaluateAll((els) => els.forEach((el) => (el.open = true)));
    for (const target of await page
      .locator("header, main, footer")
      .locator(
        "a:visible, button:visible, label.field:visible, summary:visible, label.chip:visible, input:visible",
      )
      .all()) {
      if (await target.evaluate((el) => el.matches("p a, .skip"))) continue;
      const name = `${path} ${await target.evaluate((el) => `${el.tagName} ${el.textContent!.trim().slice(0, 30)}`)}`;
      expect(Math.round((await target.boundingBox())!.height), name).toBeGreaterThanOrEqual(44);
    }
  }
});

// On /booked the order is the same at every width: heading, invite, video, the call, what to have ready.
for (const width of [390, 1280, 1440]) {
  test(`${width}px: /booked reads heading, invite, video, On the call, Have ready`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/booked?via=chat");
    await page.evaluate(() => document.fonts.ready);
    const tops: number[] = [];
    for (const selector of [
      "main h1",
      "main .lead",
      "main .video",
      "#booked-call",
      "#booked-ready",
    ]) {
      const box = (await page.locator(selector).first().boundingBox())!;
      expect(box.width, selector).toBeGreaterThan(0);
      tops.push(box.y);
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(tops.length);
  });
}

test("the open application fits the screen at every phone width, with no sideways scroll", async ({
  page,
}) => {
  await page.route("**/api/lead", (route) => route.fulfill({ status: 204 }));
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 650 });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.locator("#start input[name=name]").fill("TEST Visitor");
    await page.locator("#start input[name=email]").fill("test@example.com");
    await press(page.locator("#start form button"));
    const field = page.locator(".q.is-current #a-profile");
    await expect(field).toBeVisible();
    for (const selector of [".q.is-current .q__label", ".q.is-current #a-profile", "[data-ok]"]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.x, `${width} ${selector}`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width} ${selector}`).toBeLessThanOrEqual(width);
      expect(box.y + box.height, `${width} ${selector}`).toBeLessThanOrEqual(650);
    }
    expect(await page.evaluate(overflow), `${width}`).toBeLessThanOrEqual(0);
  }
});
