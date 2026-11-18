import { expect, test, type Page } from "@playwright/test";
/** The first screen's entrance has played: every element is where it stays. */
const settled = (page: Page) =>
  page
    .locator("#top")
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
    for (const selector of ["#top-name", "#top-email", "#top-entry button"]) {
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
    const box = (await page.locator("#top-entry button").boundingBox())!;
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
        "a:visible, button:visible, label.field:visible, summary:visible, label.chip:visible",
      )
      .all()) {
      if (await target.evaluate((el) => el.matches("p a, .skip"))) continue;
      const name = `${path} ${await target.evaluate((el) => `${el.tagName} ${el.textContent!.trim().slice(0, 30)}`)}`;
      expect(Math.round((await target.boundingBox())!.height), name).toBeGreaterThanOrEqual(44);
    }
  }
});

test("sections enter as you scroll, and stay put with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.locator(".dcard").first();
  await expect(card).not.toHaveClass(/is-in/);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-in/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const still = page.locator(".price");
  expect(await still.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  expect(await still.evaluate((el) => getComputedStyle(el).translate)).toBe("none");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every section shows", async ({ page }) => {
    await page.goto("/");
    for (const el of await page.locator("[data-reveal]").all()) {
      expect(await el.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      expect(await el.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
    }
  });
});
