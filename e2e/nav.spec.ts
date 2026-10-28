import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const links = [
  ["Method", "/method"],
  ["Notes", "/notes"],
  ["About", "/about"],
] as const;
const narrow = [320, 375, 390, 768];
const accent = "rgb(232, 114, 46)";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("arc-intro", "1"));
});

const header = (page: Page) => {
  const banner = page.getByRole("banner");
  return {
    pill: banner.locator(".site-header__pill"),
    logo: banner.locator(".wordmark"),
    arc: banner.locator(".wordmark__arc"),
    text: banner.locator(".wordmark__text"),
    links: links.map(([name]) => banner.getByRole("link", { name, exact: true })),
    cta: banner.getByRole("link", { name: "Book a call", exact: true }),
  };
};

/** Jump without the page's smooth scroll, then wait for the header to see it. */
async function jump(page: Page, top: number) {
  await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), top);
  await expect(page.locator("html")).toHaveClass(top > 24 ? /is-scrolled/ : /^(?!.*is-scrolled)/);
}

/** The pill's box once its 0.3 s transition has stopped moving it. */
async function settled(pill: Locator) {
  // NaN start: the first poll runs at once, so it never counts as still.
  let prev = { x: NaN, y: NaN, width: NaN, height: NaN };
  await expect
    .poll(
      async () => {
        const box = (await pill.boundingBox())!;
        const still = Math.abs(box.x - prev.x) < 0.5 && Math.abs(box.width - prev.width) < 0.5;
        prev = box;
        return still;
      },
      { intervals: [120] },
    )
    .toBe(true);
  return prev;
}

const centre = (page: Page) => page.evaluate(() => document.documentElement.clientWidth / 2);

test("desktop header shows Method, Notes and About", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop navigation");
  await page.goto("/");
  const banner = page.getByRole("banner");
  for (const [name, href] of links) {
    const link = banner.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
});

test("current page is unmarked on Home and marked on Privacy", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[aria-current="page"]')).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator('a[aria-current="page"]')).toHaveCount(1);
});

for (const width of narrow) {
  test(`${width}px: at the top the pill shows logo, links and button on screen`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile", "Narrow widths");
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const h = header(page);
    for (const part of [h.logo, h.arc, h.text, ...h.links, h.cta]) {
      await expect(part).toBeVisible();
      const box = (await part.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test(`${width}px: scrolled, the pill closes to the arc and button, centred`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile", "Narrow widths");
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const h = header(page);
    const mid = await centre(page);
    const open = await settled(h.pill);
    expect(Math.abs(open.x + open.width / 2 - mid)).toBeLessThanOrEqual(2);

    await jump(page, 600);
    for (const link of h.links) await expect(link).toBeHidden();
    await expect(h.text).toBeHidden();
    await expect(h.arc).toBeVisible();
    await expect(h.arc).toHaveCSS("color", accent);
    await expect(h.cta).toBeVisible();
    const closed = await settled(h.pill);
    expect(Math.abs(closed.x + closed.width / 2 - mid)).toBeLessThanOrEqual(2);
    expect(closed.width).toBeLessThan(open.width);

    await jump(page, 0);
    for (const link of h.links) await expect(link).toBeVisible();
    await expect(h.text).toBeVisible();
    const back = await settled(h.pill);
    expect(back.width).toBeCloseTo(open.width, 0);
  });
}

test("390px: the pill has the same width on Home and Method, open and closed", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "Phone width");
  await page.setViewportSize({ width: 390, height: 800 });
  const widths = [];
  for (const path of ["/", "/method"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const { pill, links: ls } = header(page);
    const open = (await settled(pill)).width;
    await jump(page, 400);
    await expect(ls[0]).toBeHidden();
    widths.push([open, (await settled(pill)).width]);
  }
  expect(widths[1][0]).toBeCloseTo(widths[0][0], 0);
  expect(widths[1][1]).toBeCloseTo(widths[0][1], 0);
});

for (const width of [1024, 1440]) {
  test(`${width}px: the pill does not change on scroll`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Wide widths");
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const h = header(page);
    const top = await settled(h.pill);
    await jump(page, 600);
    await page.waitForTimeout(400);
    for (const part of [h.text, ...h.links, h.cta]) await expect(part).toBeVisible();
    await expect(h.arc).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const scrolled = (await h.pill.boundingBox())!;
    expect(scrolled.x).toBeCloseTo(top.x, 0);
    expect(scrolled.width).toBeCloseTo(top.width, 0);
  });
}

test("the logo is not a link on Home and links Home everywhere else", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Arcbuildr", exact: true })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Arcbuildr", exact: true })).toHaveCount(2);
  await page.goto("/method");
  const logos = page.getByRole("link", { name: "Arcbuildr", exact: true });
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) await expect(logo).toHaveAttribute("href", "/");
});

test("a reload starts at the top, a link to #start still lands on the form", async ({ page }) => {
  await page.goto("/");
  await jump(page, 1500);
  await page.reload();
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goto("/method");
  await page.goto("/#start");
  await expect(page.locator("#start")).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("Home is axe clean at the top and when scrolled", async ({ page }) => {
  await page.goto("/");
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await jump(page, 600);
  // Let the header fold (0.3 s) and the scroll reveals (up to about 1.2 s) settle first.
  await page.waitForTimeout(1500);
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

// Below 64rem the pill uses context-con's compact 36 px targets (WCAG 2.2 AA asks for 24 px);
// wide screens keep 44 px.
test("header navigation links and button have big enough tap targets", async ({ page }) => {
  await page.goto("/method");
  const min = page.viewportSize()!.width < 1024 ? 32 : 44;
  const banner = page.getByRole("banner");
  for (const y of [0, 600]) {
    await jump(page, y);
    await page.waitForTimeout(400);
    for (const link of await banner.locator("a:visible").all()) {
      // Round: tap targets can measure 43.99999 px.
      expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(min);
    }
  }
});

test("header and footer links hover as a pill, never underlined", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Pointer hover");
  await page.goto("/");
  for (const link of [
    page.getByRole("banner").getByRole("link", { name: "Method", exact: true }),
    page.getByRole("contentinfo").getByRole("link", { name: "Privacy", exact: true }),
  ]) {
    await link.hover();
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await expect(link).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
});
