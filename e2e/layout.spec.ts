import { existsSync } from "node:fs";
import { CONFIRMATION_VIDEO } from "../src/config";
import { expect, test } from "@playwright/test";
import { calendar, ending, plain, stub } from "./stubs";

const overflow = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
const PAGES = ["/", "/booked", "/booked?via=chat", "/privacy"];

for (const width of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440]) {
  test(`${width}px has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await page.locator("details").evaluateAll((els) => els.forEach((el) => (el.open = true)));
      expect(await page.evaluate(overflow), path).toBeLessThanOrEqual(0);
    }
  });
}

test("nothing on the home page is cut off at its right edge on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  // Words that run past their own box, or past the screen, are cut off. The gallery's row scrolls on purpose.
  const cut = await page
    .locator("main :is(h1, h2, h3, p, li, a, button, th, td, summary)")
    .evaluateAll((els) =>
      els
        .filter((el) => !el.closest(".reel__row, .card__stage, .take, [hidden], .sr-only, thead"))
        .filter((el) => {
          const box = el.getBoundingClientRect();
          if (box.width === 0) return false;
          const range = document.createRange();
          range.selectNodeContents(el);
          const words = range.getBoundingClientRect();
          return words.right > innerWidth + 1 || words.right > box.right + 1 || words.left < -1;
        })
        .map((el) => `${el.tagName} ${el.textContent!.trim().slice(0, 40)}`),
    );
  expect(cut).toEqual([]);
});

test("mobile interactive targets are at least 44px", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone targets");
  // Measured as they stand once on screen: a section still waiting to rise in is drawn 1.5% smaller.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [...PAGES, "/no-such-page"]) {
    await page.goto(path);
    await page.locator("details").evaluateAll((els) => els.forEach((el) => (el.open = true)));
    for (const target of await page
      .locator("header, main, footer")
      .locator("a:visible, button:visible, summary:visible, input:visible")
      .all()) {
      if (await target.evaluate((el) => el.matches("p a, .skip"))) continue;
      const name = `${path} ${await target.evaluate((el) => `${el.tagName} ${el.textContent!.trim().slice(0, 30)}`)}`;
      expect(Math.round((await target.boundingBox())!.height), name).toBeGreaterThanOrEqual(44);
    }
  }
});

// /booked: on a phone it reads heading, the two practical lines, the video, what happens next.
// On a desktop the video sits beside the heading, and what happens next is under both.
// Without the film there is no video block: heading, the two lines, what happens next.
test("/booked reads in order on a phone, and puts the video beside the heading on a desktop", async ({
  page,
}) => {
  const film = existsSync(`public${CONFIRMATION_VIDEO}`);
  const tops = async () => {
    const found: Record<string, { x: number; y: number; bottom: number }> = {};
    for (const [name, selector] of Object.entries({
      h1: "main h1",
      notes: ".done__notes",
      ...(film ? { video: "main .video" } : {}),
      next: "#next-h",
    })) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.width, selector).toBeGreaterThan(0);
      found[name] = { x: box.x, y: box.y, bottom: box.y + box.height };
    }
    return found;
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/booked?via=chat");
  await page.evaluate(() => document.fonts.ready);
  const phone = await tops();
  expect(phone.h1!.y).toBeLessThan(phone.notes!.y);
  expect(phone.notes!.bottom).toBeLessThanOrEqual((phone.video ?? phone.next)!.y);
  if (film) expect(phone.video!.bottom).toBeLessThanOrEqual(phone.next!.y);
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/booked");
    await page.evaluate(() => document.fonts.ready);
    const desk = await tops();
    expect(desk.notes!.bottom, `${width}`).toBeLessThan(desk.next!.y);
    if (!film) {
      await expect(page.locator("main .video, main figure")).toHaveCount(0);
      continue;
    }
    expect(desk.video!.x, `${width}`).toBeGreaterThan(desk.h1!.x + 300);
    expect(desk.video!.y, `${width}`).toBeLessThan(desk.notes!.bottom);
    expect(desk.video!.bottom, `${width}`).toBeLessThan(desk.next!.y);
  }
});

test("the site's own layer fits the screen at every phone width, with no sideways scroll", async ({
  page,
}) => {
  await stub(page, "ok", "blocked");
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 650 });
    const inside = async (selector: string) => {
      const box = (await page.locator(selector).first().boundingBox())!;
      expect(box.x, `${width} ${selector}`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width} ${selector}`).toBeLessThanOrEqual(width);
      expect(box.y + box.height, `${width} ${selector}`).toBeLessThanOrEqual(650);
    };
    // The plain form, which opens when Tally cannot be reached.
    await page.goto("/");
    await page.evaluate(() => (localStorage.clear(), sessionStorage.clear()));
    await page.locator("#apply input[name=name]").fill("TEST Visitor");
    await page.locator("#apply input[name=email]").fill("test@example.com");
    await page.locator("#apply input[name=email]").press("Enter");
    await expect(plain(page)).toBeVisible();
    for (const selector of [".plain__lead", "[data-plain=name]", "[data-plain=email]", "[data-ok]"])
      await inside(selector);
    expect(await page.evaluate(overflow), `${width} plain`).toBeLessThanOrEqual(0);
    // The ending with no calendar.
    await page.goto("/?apply=end&name=TEST+Visitor");
    await expect(ending(page)).toBeVisible();
    await inside("[data-apply-end] p");
    await inside("[data-apply-end] p + p");
    await inside("[data-close]");
    expect(await page.evaluate(overflow), `${width} ending`).toBeLessThanOrEqual(0);
    // The calendar's panel.
    await page.goto("/?apply=calendar&name=TEST+Visitor&email=test%40example.com");
    await expect(calendar(page).locator("iframe")).toBeVisible();
    await inside("[data-apply-calendar] h2");
    expect(await page.evaluate(overflow), `${width} calendar`).toBeLessThanOrEqual(0);
  }
});
