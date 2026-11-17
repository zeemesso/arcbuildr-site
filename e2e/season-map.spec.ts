import { test, expect } from "@playwright/test";
import { seasonMap } from "../src/content/site";
const MAP_URL = process.env.MAP_URL ?? "/";
const hero = (page: import("@playwright/test").Page) =>
  page.locator('[data-season-map="hero"]').first();
test.use({ reducedMotion: "no-preference" });
test("24 numbered tiles and accessible picture", async ({ page }) => {
  await page.goto(MAP_URL);
  const map = hero(page);
  await expect(map.locator("[data-tile]")).toHaveCount(24);
  expect(await map.locator("[data-tile] text").allTextContents()).toEqual(
    Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, "0")),
  );
  await expect(map.locator(".title")).toHaveText(seasonMap.title);
  await expect(map.locator(".title")).toBeVisible();
  await expect(map.getByRole("img")).toHaveAttribute("aria-label", seasonMap.alt);
  await expect(map.locator(".readout")).toHaveAttribute("aria-hidden", "true");
});
test("plays once, holds day 10 and replays", async ({ page }) => {
  await page.goto(MAP_URL);
  const map = hero(page);
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute("data-state", /idle|playing/);
  await expect(map).toHaveAttribute("data-state", "playing");
  await expect(map.locator("button")).toBeHidden();
  await expect(map).toHaveAttribute("data-step", "3", { timeout: 4000 });
  await expect(map.locator('[data-written="true"]')).toHaveCount(3);
  await expect(map.locator(".day")).toHaveText("DAY 10");
  await expect(map).toHaveAttribute("data-state", "done", { timeout: 9000 });
  await expect(map.locator('[data-written="true"]')).toHaveCount(24);
  await expect(map.locator(".day")).toHaveText("DAY 42");
  await expect(map.locator(".readout")).toContainText("24 OF 24 WRITTEN");
  await expect(map.locator("button")).toBeVisible();
  await map.locator("button").click();
  await expect(map).toHaveAttribute("data-state", "playing");
  expect(await map.locator('[data-written="true"]').count()).toBeLessThan(24);
  await expect(map.locator("button")).toBeHidden();
});
test("reduced motion is immediately complete with no animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(MAP_URL);
  const map = hero(page);
  await expect(map).toHaveAttribute("data-state", "done");
  await expect(map.locator('[data-written="true"]')).toHaveCount(24);
  await expect(map.locator("button")).toBeHidden();
  expect(await map.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});
test("HTML is complete without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(MAP_URL);
  const map = hero(page);
  await expect(map).toHaveAttribute("data-state", "done");
  await expect(map.locator('[data-written="true"]')).toHaveCount(24);
  await expect(map.locator(".day")).toHaveText("DAY 42");
  await expect(map.locator(".title")).toHaveText(seasonMap.title);
  await expect(map.locator(".title")).toBeVisible();
  await context.close();
});
test("container geometry works on phones and desktop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(MAP_URL);
    const map = hero(page);
    const art = await map.locator(".art").boundingBox();
    expect(art!.width / art!.height).toBeCloseTo(width === 375 ? 340 / 400 : 612 / 330, 2);
    for (const tile of await map.locator("[data-tile] rect").all())
      expect((await tile.boundingBox())!.width).toBeGreaterThanOrEqual(24);
  }
});
test("mini has one marked tile and no button", async ({ page }) => {
  await page.goto(MAP_URL);
  const mini = page.locator('[data-season-map="mini"]').first();
  await expect(mini.locator("[data-tile]")).toHaveCount(24);
  await expect(mini.locator('[data-written="true"]')).toHaveCount(1);
  await expect(mini.locator('[data-tile="1"]')).toHaveAttribute("data-written", "true");
  await expect(mini.locator(".tag")).toHaveText("EPISODE 1");
  await expect(mini.locator("button")).toHaveCount(0);
});

test("readout and replay clear the arch across the layout switch", async ({ page }) => {
  await page.goto(MAP_URL);
  const map = hero(page);
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator("button")).toBeVisible({ timeout: 9000 });
  await page.evaluate(() => document.fonts.ready);
  for (const width of [300, 420, 543, 544, 612, 720]) {
    const clear = await map.evaluate((el, width) => {
      (el as HTMLElement).style.width = `${width}px`;
      const bounds = (selector: string) => el.querySelector(selector)!.getBoundingClientRect();
      const controls = bounds(".controls");
      return (
        controls.bottom < bounds(".ground").top &&
        [...el.querySelectorAll("[data-tile] rect")].every((tile) => {
          const r = tile.getBoundingClientRect();
          return (
            controls.left >= r.right ||
            controls.right <= r.left ||
            controls.top >= r.bottom ||
            controls.bottom <= r.top
          );
        })
      );
    }, width);
    expect(clear, `map width ${width}`).toBe(true);
  }
});
