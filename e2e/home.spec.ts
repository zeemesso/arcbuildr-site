import { expect, test } from "@playwright/test";
import { founding, section } from "../src/content/deck";
import { page as words } from "../src/content/site";
import { press } from "./press";

/** The deck marks a small label with [square brackets]; on the page the brackets are gone. */
const plain = (text: string) => text.replace(/[[\]]/g, "");
/** A page's text with every run of spaces as one space. */
const flat = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

const first = section(1);
const get = section(5);

test.describe("the home page", () => {
  test.use({ reducedMotion: "reduce" });

  test("the first screen says the deck's words, word for word", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(first.get("headline"));
    const top = flat(await page.locator("#top").textContent());
    for (const slot of [
      "label above the headline",
      "line under it",
      "button",
      "second button, with the Claude and ChatGPT icons",
      "under the buttons",
    ])
      expect(top).toContain(plain(first.get(slot)));
    expect(top).toContain(founding(first.get("hanging tab")));
    // The four small labels inside the line.
    await expect(page.locator(".first__line .chip")).toHaveText([
      "12 weeks",
      "every script",
      "your voice",
      "You film.",
    ]);
  });

  test("his name and role sit beside the buttons, with initials until a real photo exists", async ({
    page,
  }) => {
    await page.goto("/");
    const who = page.locator(".who");
    await expect(who).toContainText(`${words.founder.name}, ${words.founder.role}`);
    await expect(who.locator(".who__face")).toBeVisible();
    await expect(who).toBeInViewport();
    // No price on the first screen.
    expect(await page.locator("#top").textContent()).not.toMatch(/USD|\$/);
  });

  test("the two marks are the companies' own files, whole, on the second button", async ({
    page,
  }) => {
    await page.goto("/");
    const marks = page.locator(".btn--quiet .marks img");
    await expect(marks).toHaveCount(2);
    for (const mark of await marks.all()) {
      expect(await mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      // Nothing is drawn over a mark: the point at its center is the mark itself.
      const covered = await mark.evaluate((img) => {
        const box = img.getBoundingClientRect();
        return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) !== img;
      });
      expect(covered).toBe(false);
    }
    expect(await marks.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")))).toEqual([
      "/marks/claude-spark.svg",
      "/marks/openai-blossom.svg",
    ]);
  });

  test("section 5 says the deck's words, and each card has its number, date, title and body", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#get .label")).toHaveText(get.get("label"));
    await expect(page.locator("#get h2")).toHaveText(get.get("heading"));
    await expect(page.locator(".get__line")).toHaveText(get.get("line under it"));
    const cards = page.locator(".cards > .card");
    for (const [index, n] of ["01", "02"].entries()) {
      const card = cards.nth(index);
      await expect(card.locator(".card__n")).toHaveText(n);
      await expect(card.locator(".card__date")).toHaveText(get.get(`card ${n}, date`));
      await expect(card.locator(".card__h")).toHaveText(get.get(`card ${n}, title`));
      await expect(card.locator(".card__body").first()).toHaveText(get.get(`card ${n}, body`));
      await expect(card.locator("[data-loop]")).toBeVisible();
    }
  });

  test("a screen that waits for a real piece shows bars and the card's own words, nothing invented", async ({
    page,
  }) => {
    await page.goto("/");
    for (const [index, n] of ["01", "02"].entries()) {
      const own = ["title", "date", "body"].map((part) => get.get(`card ${n}, ${part}`)).join(" ");
      // Every piece of text inside the screen is a number or a run of the card's own words.
      const texts = await page
        .locator(".cards > .card")
        .nth(index)
        .locator(".card__stage")
        .evaluate((stage) => {
          const found: string[] = [];
          const walk = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
          while (walk.nextNode()) {
            const text = walk.currentNode.textContent!.trim();
            if (text) found.push(text);
          }
          return found;
        });
      for (const text of texts) if (!/^\d+$/.test(text)) expect(own).toContain(text);
    }
    // The first screen's loop holds no text at all.
    expect(flat(await page.locator(".take").textContent()).replace(/\d/g, "")).toBe("");
  });

  test("with reduced motion every screen shows its finished state and nothing loops", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(".cards > .card").nth(1).scrollIntoViewIfNeeded();
    await expect(page.locator(".is-looping")).toHaveCount(0);
    const hidden = await page
      .locator("[data-loop] [data-at]")
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "0").length);
    expect(hidden).toBe(0);
    for (const el of await page.locator("[data-reveal], [data-enter]").all()) {
      expect(await el.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      expect(await el.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
    }
  });

  test("names no social platform, and says videos, never episodes", async ({ page }) => {
    await page.goto("/");
    const text = (await page.locator("body").textContent())!;
    expect(text).not.toMatch(
      /instagram|tiktok|linkedin|youtube|facebook|twitter|\bepisodes?\b|\bLLC\b|\bInc\b/i,
    );
  });
});

test.describe("the home page in motion", () => {
  test("a screen plays its loop while it is on screen, and stops when it leaves", async ({
    page,
  }) => {
    await page.goto("/");
    const screen = page.locator(".cards > .card").first().locator("[data-loop]");
    await screen.scrollIntoViewIfNeeded();
    await expect(screen).toHaveClass(/is-looping/);
    // By the end of the build every part has arrived.
    await expect
      .poll(() => screen.locator("[data-at]:not(.on)").count(), { timeout: 8000 })
      .toBe(0);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(screen).not.toHaveClass(/is-looping/);
  });

  test("sections enter as you scroll", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".cards > .card").nth(1);
    await expect(card).not.toHaveClass(/is-in/);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/is-in/);
  });

  test("the header's button shows once the first button has left the screen", async ({ page }) => {
    await page.goto("/");
    const bar = page.locator(".bar");
    await expect(page.locator("#top [data-cta]")).toBeInViewport();
    await expect(bar).not.toHaveClass(/has-cta/);
    await page.locator(".cards > .card").nth(1).scrollIntoViewIfNeeded();
    await expect(bar).toHaveClass(/has-cta/);
    await expect(page.locator(".bar__cta")).toBeVisible();
    await expect(page.locator(".bar__cta")).toHaveText(words.pill);
  });

  test("the first button and the header's button open the same form", async ({ page }) => {
    await page.goto("/");
    await press(page.locator("#top [data-apply-open]"));
    const form = page.locator(".apply");
    await expect(form).toBeVisible();
    await expect(form.locator("#a-name")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(form).toBeHidden();
    await page.locator(".cards > .card").nth(1).scrollIntoViewIfNeeded();
    await press(page.locator(".bar__cta"));
    await expect(form).toBeVisible();
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("no sideways scroll, nothing wider than the screen, and every target is 44 px or more", async ({
    page,
  }) => {
    await page.goto("/");
    for (const width of [320, 360, 390, 414]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const small = await page.locator("header a, main a, main button, footer a").evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).visibility !== "hidden")
        .map((el) => ({ box: el.getBoundingClientRect(), text: el.textContent!.trim() }))
        .filter(({ box }) => box.width > 0 && (box.height < 44 || box.width < 44))
        .map(({ box, text }) => `${text}: ${Math.round(box.width)} x ${Math.round(box.height)}`),
    );
    expect(small).toEqual([]);
  });
});

test.describe("a phone's first screen", () => {
  test.use({ reducedMotion: "reduce" });
  for (const width of [360, 375, 390, 414]) {
    test(`${width} x 650: the headline, both buttons and his face show without scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 650 });
      await page.goto("/");
      for (const selector of ["h1", "#top [data-cta]", ".btn--quiet", ".who__face", ".who__name"])
        await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
    });
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("everything shows, and every screen is in its finished state", async ({ page }) => {
    await page.goto("/");
    for (const el of await page.locator("[data-reveal], [data-enter]").all()) {
      expect(await el.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      expect(await el.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
    }
    const hidden = await page
      .locator("[data-loop] [data-at]")
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "0").length);
    expect(hidden).toBe(0);
    await expect(page.locator(".bar__cta")).toBeVisible();
  });
});
