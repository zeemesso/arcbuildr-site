import { expect, test, type Page } from "@playwright/test";
import { season } from "../src/content/site";

const ids = season.seasons.map((s) => s.id);
const state = (page: Page) =>
  page.locator(".season__play").evaluate((play) => {
    const sprite = getComputedStyle(play.querySelector(".sprite")!);
    const tag = getComputedStyle(play.querySelector(".tag")!);
    return {
      block: getComputedStyle(play).backgroundColor,
      tile: getComputedStyle(play.querySelector(".tile")!).backgroundColor,
      row: sprite.backgroundPositionY,
      episode: tag.getPropertyValue("--ep").trim(),
      day: tag.getPropertyValue("--day").trim(),
    };
  });
const finished = (page: Page) =>
  page.locator(".season__play").evaluate(async (play) => {
    await Promise.all(play.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  });

test("24 tiles, four seasons to pick and a described picture", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".arc .tile")).toHaveCount(24);
  await expect(page.locator(".stage")).toHaveAttribute("aria-label", season.alt);
  const radios = page.getByRole("radio");
  await expect(radios).toHaveCount(4);
  for (const { label } of season.seasons)
    await expect(page.getByRole("radio", { name: label })).not.toBeChecked();
  expect((await page.request.get("/sprites/zyade.png")).status()).toBe(200);
  expect((await page.request.get("/sprites/poof.png")).status()).toBe(200);
});

test("each season changes his costume and the colour of the block", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const seen = [await state(page)];
  for (const id of ids) {
    await page.locator(`.chips input[value="${id}"]`).check({ force: true });
    const now = await state(page);
    expect(now.block, id).toBe(now.tile);
    seen.push(now);
  }
  expect(new Set(seen.map((s) => s.row)).size).toBe(5);
  expect(new Set(seen.map((s) => s.block)).size).toBe(5);
});

test("he walks the arc once it is on screen, and ends on episode 24, day 42", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".season")).not.toHaveClass(/is-in/);
  await page.locator(".stage").scrollIntoViewIfNeeded();
  await expect(page.locator(".season")).toHaveClass(/is-in/);
  // The counts are whole numbers at every moment of the walk. A fraction would read as 00
  // in the iPhone engine, because a counter cannot take it.
  let written = 0;
  for (let i = 0; i < 6; i++) {
    const { episode, day } = await state(page);
    expect(episode).toMatch(/^\d+$/);
    expect(day).toMatch(/^\d+$/);
    expect(Number(episode)).toBeGreaterThanOrEqual(written);
    written = Number(episode);
    await page.waitForTimeout(250);
  }
  await finished(page);
  expect(await state(page)).toMatchObject({ episode: "24", day: "42" });
  await page.getByRole("radio", { name: season.seasons[2]!.label }).check({ force: true });
  expect(
    await page
      .locator(".season__play")
      .evaluate((play) => play.getAnimations({ subtree: true }).length),
  ).toBeGreaterThan(0);
  await finished(page);
  expect(await state(page)).toMatchObject({ episode: "24", day: "42" });
  const walker = (await page.locator(".walker").boundingBox())!;
  const last = (await page.locator(".arc .tile").last().boundingBox())!;
  expect(Math.abs(walker.x + walker.width / 2 - (last.x + last.width / 2))).toBeLessThan(
    last.width * 1.5,
  );
});

test("the seasons work from the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(`.chips input[value="${ids[0]}"]`).focus();
  await page.keyboard.press("Space");
  await expect(page.locator(`.chips input[value="${ids[0]}"]`)).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(`.chips input[value="${ids[1]}"]`)).toBeChecked();
});

test("reduced motion shows the finished season and nothing moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".stage").scrollIntoViewIfNeeded();
  expect(await state(page)).toMatchObject({ episode: "24", day: "42" });
  await page.locator(`.chips input[value="${ids[3]}"]`).check({ force: true });
  expect(
    await page
      .locator(".season__play")
      .evaluate(
        (play) =>
          play.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      ),
  ).toBe(0);
  expect(await state(page)).toMatchObject({ episode: "24", day: "42" });
});

test("without JavaScript the module is complete and the seasons still change", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".arc .tile")).toHaveCount(24);
  const play = page.locator(".season__play");
  await expect(play).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.locator(`label.chip--${ids[1]}`).click();
  await expect(page.locator(`.chips input[value="${ids[1]}"]`)).toBeChecked();
  await expect(play).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  await context.close();
});

for (const width of [320, 390, 1280]) {
  test(`the stage fits and the character is crisp at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const stage = page.locator(".stage");
    await stage.scrollIntoViewIfNeeded();
    expect(await stage.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const frame = (await stage.boundingBox())!;
    const sprite = (await page.locator(".sprite").boundingBox())!;
    expect(sprite.x).toBeGreaterThanOrEqual(frame.x);
    expect(sprite.x + sprite.width).toBeLessThanOrEqual(frame.x + frame.width + 0.5);
    expect(sprite.y).toBeGreaterThanOrEqual(frame.y);
    // One sprite pixel is a whole number of screen pixels, so nothing blurs.
    expect(sprite.width % 32).toBe(0);
    expect(sprite.height % 48).toBe(0);
    expect(
      await page.locator(".sprite").evaluate((el) => getComputedStyle(el).imageRendering),
    ).toBe("pixelated");
  });
}
