import { expect, test } from "@playwright/test";
import { founding, home } from "../src/content/site";
import { BOOKING_URL, FOUNDING_PLACES_LEFT } from "../src/config";
import { press } from "./press";

/** Words a visitor can read on load: no sample screens, no closed answers, no tab that is not picked. */
const readable = (root: Element) => {
  const copy = root.cloneNode(true) as Element;
  const drop =
    ".shot, [hidden], details > :not(summary), form, script, style, .sr-only, [aria-hidden='true']";
  for (const el of copy.querySelectorAll(drop)) el.remove();
  // An element ends a word even when the markup has no space after it.
  for (const el of copy.querySelectorAll("p, li, h1, h2, h3, span, td, th, button, summary, a, b"))
    el.append(" ");
  return copy.textContent!.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
};

test.describe("the home page", () => {
  test.use({ reducedMotion: "reduce" });

  test("says the headline, then its sections in order", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(home.start.h1.join(" "));
    expect((await page.locator("main h2").allTextContents()).map((text) => text.trim())).toEqual([
      home.features.h2,
      home.hub.h2,
      home.iceberg.h2,
      home.install.h2,
      home.price.h2,
      home.faq.h2,
      home.book.h2,
    ]);
    await expect(page.locator(".hero__lede .chip")).toHaveText("750 to 1,750 USD");
  });

  test("stays inside the word budget: 25 on the first screen, 450 on load", async ({ page }) => {
    await page.goto("/");
    const first = await page.locator("#start").evaluate(readable);
    const all = await page.locator("body").evaluate(readable);
    expect(first).toBeLessThanOrEqual(25);
    expect(all).toBeLessThanOrEqual(450);
    test
      .info()
      .annotations.push({ type: "words", description: `first screen ${first}, page ${all}` });
  });

  test("shows five tools, each with a screen labelled as a sample", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".feat");
    await expect(cards).toHaveCount(5);
    for (const [i, card] of home.features.cards.entries()) {
      await expect(cards.nth(i).locator("h3")).toHaveText(card.h3);
      await expect(cards.nth(i)).toContainText(card.body);
      const screen = cards.nth(i).locator(".shot");
      await expect(screen).toHaveAttribute("role", "img");
      await expect(screen).toHaveAttribute("aria-label", /^Sample: /);
      await expect(screen.locator(".shot__tag")).toHaveText(home.features.sample);
      await expect(screen.locator(".shot__tag")).toBeVisible();
    }
    await expect(page.locator("#tools")).toContainText(home.features.note);
  });

  test("with reduced motion every screen shows its finished state and nothing loops", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(".feat").nth(1).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(page.locator(".shot.is-looping")).toHaveCount(0);
    const hiddenParts = await page
      .locator(".shot [data-at]")
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "0").length);
    expect(hiddenParts).toBe(0);
  });

  test("the diagram puts the profile between what goes in and what comes out", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".node--in")).toHaveText([...home.hub.inputs]);
    await expect(page.locator(".node--out")).toHaveText([...home.hub.outputs]);
    await expect(page.locator(".hub__core")).toContainText(home.hub.core);
  });

  test("the iceberg lists what is free and the 9 parts of Season One", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".chip--free")).toHaveText(
      home.iceberg.free.map((item) => item.text),
    );
    await expect(page.locator(".chip--free a")).toHaveAttribute("href", "/sample");
    const text = await page.locator(".iceberg").innerText();
    for (const row of home.iceberg.rows) expect(text, row.what).toContain(row.what);
    expect(home.iceberg.rows).toHaveLength(9);
  });

  test("the price section shows the three sizes, the places left and the refund", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".sizes tbody tr")).toHaveCount(home.price.rows.length);
    await expect(page.locator(".places")).toContainText(
      founding.count.replace("{n}", String(FOUNDING_PLACES_LEFT)),
    );
    await expect(page.locator(".refund")).toContainText(home.refund.h2);
    await expect(page.locator(".refund")).toContainText(home.refund.body);
    await expect(page.locator("main")).not.toContainText("{n}");
  });

  test("install tabs: one panel at a time, by click and by keyboard", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tab");
    const panels = page.locator(".tabs__panel");
    await expect(tabs).toHaveText(home.install.tabs.map((tab) => tab.label));
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(panels.nth(0)).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await press(tabs.nth(1));
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(panels.nth(1)).toBeVisible();
    await expect(panels.nth(0)).toBeHidden();
    for (const step of home.install.tabs[1]!.steps) await expect(panels.nth(1)).toContainText(step);
    await tabs.nth(1).press("ArrowRight");
    await expect(tabs.nth(2)).toBeFocused();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(panels.nth(2)).toBeVisible();
    await tabs.nth(2).press("ArrowRight");
    await expect(tabs.nth(0)).toBeFocused();
    await tabs.nth(0).press("End");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await tabs.nth(2).press("Home");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    // Only the picked tab is in the Tab order.
    expect(await tabs.evaluateAll((els) => els.map((el) => (el as HTMLElement).tabIndex))).toEqual([
      0, -1, -1,
    ]);
  });

  test("questions: five at most, closed on load, open on a press", async ({ page }) => {
    await page.goto("/");
    const items = page.locator(".faq__item");
    await expect(items).toHaveCount(home.faq.items.length);
    expect(
      await items.evaluateAll((els) => els.filter((el) => (el as HTMLDetailsElement).open).length),
    ).toBe(0);
    for (const [i, item] of home.faq.items.entries()) {
      await expect(items.nth(i).locator("summary")).toHaveText(item.q);
      await press(items.nth(i).locator("summary"));
      await expect(items.nth(i).locator("p")).toBeVisible();
      await expect(items.nth(i).locator("p")).toHaveText(item.a);
    }
  });

  test("names no social platform and leaves the failed feature off", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").evaluate((body) => body.textContent!);
    expect(text).not.toMatch(
      /instagram|tiktok|linkedin|youtube|facebook|whatsapp|twitter|snapchat|pinterest/i,
    );
    expect(text).not.toMatch(/one video into more/i);
    expect(text).not.toMatch(/followers|go viral/i);
  });
});

test.describe("the home page in motion", () => {
  test("a screen plays its loop while it is on screen", async ({ page }) => {
    await page.goto("/");
    const screen = page.locator(".shot").first();
    await screen.scrollIntoViewIfNeeded();
    await expect(screen).toHaveClass(/is-looping/);
    await expect(screen.locator("[data-at].on").first()).toBeAttached();
    // By the end of the loop every part has arrived.
    await expect
      .poll(() => screen.locator("[data-at]:not(.on)").count(), { timeout: 12000 })
      .toBe(0);
  });

  test("sections enter as you scroll, and stay put with reduced motion", async ({ page }) => {
    await page.goto("/");
    const section = page.locator(".install");
    await expect(section).not.toHaveClass(/is-in/);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveClass(/is-in/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const el of await page
      .locator("[data-reveal], [data-reveal] .h2, .feat__words, .node")
      .all()) {
      expect(await el.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      expect(await el.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
    }
  });

  test("the header's button shows once the first form has left the screen", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("[data-bar-cta]");
    await expect(page.locator("#start form button")).toBeInViewport();
    await expect(page.locator(".bar")).not.toHaveClass(/has-cta/);
    await page.locator(".install").scrollIntoViewIfNeeded();
    await expect(page.locator(".bar")).toHaveClass(/has-cta/);
    await expect(button).toBeVisible();
    await expect(button).toHaveText(home.pill);
    // At the end of the page the second form is on screen, so the header's button steps back.
    await page.locator("#apply form button").scrollIntoViewIfNeeded();
    await expect(page.locator(".bar")).not.toHaveClass(/has-cta/);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every section shows, every tab panel is readable and the forms lead to the booking page", async ({
    page,
  }) => {
    await page.goto("/");
    for (const el of await page.locator("[data-reveal]").all()) {
      expect(await el.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      expect(await el.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
    }
    for (const panel of await page.locator(".tabs__panel").all()) await expect(panel).toBeVisible();
    const parts = await page
      .locator(".shot [data-at]")
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "0").length);
    expect(parts).toBe(0);
    for (const form of await page.locator("main form").all())
      await expect(form).toHaveAttribute("action", BOOKING_URL);
    const header = page.locator("[data-bar-cta]");
    await expect(header).toBeVisible();
    await press(header);
    await expect(page).toHaveURL(/#apply$/);
    await expect(page.locator("#apply form")).toBeInViewport();
  });
});
