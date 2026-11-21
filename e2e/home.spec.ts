import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { founding, section } from "../src/content/deck";
import { page as words } from "../src/content/site";
import { press } from "./press";

/** The deck marks a small label with [square brackets]; on the page the brackets are gone. */
const plain = (text: string) => text.replace(/[[\]]/g, "");
/** A page's text with every run of spaces as one space. */
const flat = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

/** Letters and digits only: a row the page splits into cells still reads the same, word for word. */
const squash = (text: string | null) => (text ?? "").replace(/[^\p{L}\p{N}]+/gu, "");

const first = section(1);
const get = section(5);
/** The 12 sections, in the deck's order, with the id each has on the page. */
const SECTIONS = [
  "top",
  "believe",
  "zyade",
  "how",
  "get",
  "work",
  "weeks",
  "price",
  "guarantee",
  "fit",
  "questions",
  "apply",
];
/**
 * Section 6, the gallery, is on the page only once a real piece of it exists. The pieces are files in
 * src/content/proof/, which git ignores, so this is false until `node scripts/proof/import.mjs` brings one in.
 */
const PROOF = "src/content/proof";
const galleryOn =
  existsSync(PROOF) && readdirSync(PROOF).some((name) => /^gallery-\d-\d\.json$/.test(name));
const CARDS = Array.from({ length: 11 }, (_, n) => String(n + 1).padStart(2, "0"));

test.describe("the home page", () => {
  test.use({ reducedMotion: "reduce" });

  test("the page's script does not wait for the visit counter", async ({ page }) => {
    // The visit counter's server never answers here. The form must still open.
    await page.route(/cloudflareinsights\.com/, () => new Promise(() => {}));
    await page.goto("/", { waitUntil: "commit" });
    await press(page.locator("#top [data-apply-open]").first());
    await expect(page.locator("#a-name")).toBeFocused();
  });

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

  test("the sections come in the deck's order, the gallery only with a real piece", async ({
    page,
  }) => {
    await page.goto("/");
    const ids = await page.locator("main > section").evaluateAll((els) => els.map((el) => el.id));
    expect(ids).toEqual(SECTIONS.filter((id) => id !== "work" || galleryOn));
  });

  for (const [index, id] of SECTIONS.entries()) {
    test(`section ${index + 1} (#${id}) says every line of the deck, word for word, in order`, async ({
      page,
    }) => {
      await page.goto("/");
      if (id === "work" && !galleryOn) {
        // No real piece yet: the section, its words and any link to it are not on the page.
        await expect(page.locator("#work")).toHaveCount(0);
        await expect(page.locator('a[href$="#work"]')).toHaveCount(0);
        expect(squash(await page.locator("body").textContent())).not.toContain(
          squash(section(6).get("heading")),
        );
        return;
      }
      const text = squash(await page.locator(`#${id}`).textContent());
      let from = 0;
      for (const { slot, words } of section(index + 1).list("")) {
        // A note for a real piece has no words of its own. A gallery tab shows only once it has a piece.
        if (!words || /^tab \d/.test(slot)) continue;
        const said = squash(founding(words));
        const at = text.indexOf(said, from);
        expect(at, `${slot}: ${words}`).toBeGreaterThanOrEqual(0);
        // Most sections keep the deck's order from top to bottom. Four place a line by design: the first
        // screen's hanging tab, the diagram's labels, a card's date above its title, and the iceberg's
        // picture before its list.
        if (![1, 4, 5, 7].includes(index + 1)) from = at;
      }
    });
  }

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

  test("the two marks are the companies' own files, whole, in the three places", async ({
    page,
  }) => {
    await page.goto("/");
    const files = ["/marks/claude-spark.svg", "/marks/openai-blossom.svg"];
    // The first screen's second button, the diagram's second output, the corner of card 10's screen.
    for (const place of [
      "#top .btn--quiet",
      "#how .flow",
      "#get .card:nth-child(10) .card__stage",
    ]) {
      const here = page.locator(`${place} .marks img`);
      await expect(here, place).toHaveCount(2);
      expect(
        await here.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src"))),
        place,
      ).toEqual(files);
    }
    await expect(page.locator("main .marks img")).toHaveCount(6);
    const marks = page.locator("main .marks img");
    for (const mark of await marks.all()) {
      await mark.scrollIntoViewIfNeeded();
      expect(await mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      // Nothing is drawn over a mark: the point at its center is the mark itself.
      const covered = await mark.evaluate((img) => {
        const box = img.getBoundingClientRect();
        return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) !== img;
      });
      expect(covered).toBe(false);
    }
  });

  test("section 5 says the deck's words, and each card has its number, date, title and body", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#get .label")).toHaveText(get.get("label"));
    await expect(page.locator("#get h2")).toHaveText(get.get("heading"));
    await expect(page.locator(".get__line")).toHaveText(get.get("line under it"));
    const cards = page.locator(".cards > .card");
    await expect(cards).toHaveCount(11);
    for (const [index, n] of CARDS.entries()) {
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
    for (const [index, n] of CARDS.entries()) {
      const own = get
        .list(`card ${n}, `)
        .map(({ words }) => words)
        .join(" ");
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
      for (const text of texts) {
        if (/^\d+$/.test(text)) continue;
        expect(own, `card ${n}: "${text}"`).toContain(text);
        // What an owner would read: never a file name, a time stamp, a version or a check code.
        expect(text, `card ${n}`).not.toMatch(/\.\w{2,4}$|\d:\d\d|\bv\d|#\w+|[A-F0-9]{6,}/);
      }
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
    // The gallery, when it is on, stays still with no pause button, and the diagram's lines do not run.
    if (galleryOn) {
      const row = page.locator("#work [data-reel-row]");
      await row.scrollIntoViewIfNeeded();
      await expect(page.locator("#work [data-reel-pause]")).toBeHidden();
      await page.waitForTimeout(3200);
      expect(await row.evaluate((el) => el.scrollLeft)).toBe(0);
    }
    const running = await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === "running").length,
    );
    expect(running).toBe(0);
  });

  test("names no social platform, and says videos, never episodes", async ({ page }) => {
    await page.goto("/");
    const text = (await page.locator("body").textContent())!;
    expect(text).not.toMatch(
      /instagram|tiktok|linkedin|youtube|facebook|twitter|\bepisodes?\b|\bLLC\b|\bInc\b|registered/i,
    );
    // No install steps, file names or jargon.
    expect(text).not.toMatch(/\binstall|\.zip\b|\.md\b|terminal|\bprompt\b|\bAPI\b|\brepo\b/i);
  });

  test("an apply button closes sections 3, 5, 8 and 10, and each opens the same form", async ({
    page,
  }) => {
    await page.goto("/");
    const form = page.locator(".apply");
    for (const [n, id] of [
      [3, "zyade"],
      [5, "get"],
      [8, "price"],
      [10, "fit"],
    ] as const) {
      const strip = page.locator(`#${id} .strip`);
      await expect(strip).toHaveCount(1);
      await expect(strip.locator("p")).toHaveText(founding(section(n).get("apply strip")));
      const button = strip.locator("[data-apply-open]");
      await expect(button).toHaveText(section(12).get("button"));
      // It is the last thing in its section.
      expect(await strip.evaluate((el) => el.parentElement!.lastElementChild === el), id).toBe(
        true,
      );
      await press(button);
      await expect(form, id).toBeVisible();
      await expect(form.locator("#a-name"), id).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(form, id).toBeHidden();
    }
    // The other sections have none, and the final panel has the two fields.
    await expect(page.locator("main .strip")).toHaveCount(4);
    await expect(page.locator("#apply form[data-apply-entry] input")).toHaveCount(2);
    await expect(page.locator("#apply form button")).toHaveText(section(12).get("button"));
  });

  test("the price shows the stack, the six prices and the founding places, and nothing negative", async ({
    page,
  }) => {
    await page.goto("/");
    const price = page.locator("#price");
    await expect(price.locator(".stack li")).toHaveCount(11);
    await expect(price.locator(".sizes__table tbody tr")).toHaveCount(3);
    const cells = await price.locator(".sizes__table tbody td").allTextContents();
    expect(cells.filter((cell) => /^[\d,]+ USD$/.test(cell.trim()))).toHaveLength(6);
    await expect(price.locator(".sizes__founding")).toHaveText(
      founding(section(8).get("founding line")),
    );
    await expect(price.locator(".sizes__founding i")).toHaveCount(3);
    // Beside the price: the total and the founding price, and no other figure or warning.
    await expect(price.locator(".sum p")).toHaveCount(2);
    expect(await price.locator(".sum").textContent()).not.toMatch(/\bno\b|\bnot\b|don't|never/i);
    // The AI kit is one line of the stack.
    expect(
      (await price.locator(".stack li").allTextContents()).filter((row) => /\bAI\b/.test(row)),
    ).toHaveLength(1);
  });

  test("the iceberg explains every band, each tied to its line by its color", async ({ page }) => {
    await page.goto("/");
    const bands = page.locator("#weeks .berg__band");
    const lines = page.locator("#weeks .berg__items li[data-band]");
    await expect(bands).toHaveCount(9);
    await expect(lines).toHaveCount(9);
    for (let n = 0; n < 9; n++) {
      const words = section(7).get(`band ${n + 1}`);
      await expect(lines.nth(n)).toHaveText(words);
      expect(words.startsWith(`${(await bands.nth(n).textContent())!.trim()}.`)).toBe(true);
      const band = await bands.nth(n).evaluate((el) => getComputedStyle(el).backgroundColor);
      const key = await lines
        .nth(n)
        .locator(".berg__key")
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(key, `band ${n + 1}`).toBe(band);
    }
    // Nine different colors.
    const colors = await bands.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).backgroundColor),
    );
    expect(new Set(colors).size).toBe(9);
  });

  test("the gallery shows only real pieces, and a tab with no piece is hidden", async ({
    page,
  }) => {
    test.skip(!galleryOn, "No real piece yet: the gallery is not on the page");
    await page.goto("/");
    const tabs = page.locator("#work [data-reel-tab]");
    expect(await page.locator("#work .piece").count()).toBeGreaterThan(0);
    expect(await tabs.count()).toBeGreaterThan(0);
    // Every tab on show has a piece of its own.
    for (const tab of await tabs.all()) {
      const n = await tab.getAttribute("data-reel-tab");
      expect(await page.locator(`#work .piece[data-tab="${n}"]`).count()).toBeGreaterThan(0);
    }
  });

  test("the questions open one at a time, the first one open", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator("#questions details");
    await expect(rows).toHaveCount(8);
    await expect(rows.first()).toHaveAttribute("open", "");
    await expect(page.locator("#questions details[open]")).toHaveCount(1);
    await press(rows.nth(5).locator("summary"));
    await expect(rows.nth(5)).toHaveAttribute("open", "");
    await expect(rows.nth(5)).toContainText(section(11).get("answer 6, second paragraph"));
    await expect(page.locator("#questions details[open]")).toHaveCount(1);
  });

  test("no section sits on the same surface as the one before it", async ({ page }) => {
    await page.goto("/");
    // A section is a window with its own color, or type straight on the canvas.
    const surfaces = await page.locator("main > section").evaluateAll((els) =>
      els.map((el) => {
        const color = getComputedStyle(el).backgroundColor;
        return /rgba?\(0, 0, 0, 0\)|transparent/.test(color) ? "canvas" : color;
      }),
    );
    for (let n = 1; n < surfaces.length; n++)
      expect(surfaces[n], `section ${n + 1} after section ${n}`).not.toBe(surfaces[n - 1]);
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

  test("the gallery steps forward by itself, and the pause button stops it", async ({ page }) => {
    test.skip(!galleryOn, "No real piece yet: the gallery is not on the page");
    await page.goto("/");
    const row = page.locator("#work [data-reel-row]");
    const pause = page.locator("#work [data-reel-pause]");
    await row.scrollIntoViewIfNeeded();
    if (await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 4)) {
      // Few pieces: the whole row is on screen, so nothing steps and there is nothing to pause.
      await expect(pause).toBeHidden();
      await page.waitForTimeout(3200);
      expect(await row.evaluate((el) => el.scrollLeft)).toBe(0);
      return;
    }
    await expect(pause).toBeVisible();
    await expect
      .poll(() => row.evaluate((el) => el.scrollLeft), { timeout: 9000 })
      .toBeGreaterThan(50);
    await press(pause);
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    // Let a step that had started finish, then nothing more moves.
    await page.waitForTimeout(1200);
    const held = await row.evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(3200);
    expect(await row.evaluate((el) => el.scrollLeft)).toBe(held);
  });

  test("the five steps turn by themselves on a wide screen, and a press picks one", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "The row of tabs is the wide layout");
    await page.goto("/");
    const steps = page.locator("#how [data-steps]");
    await steps.scrollIntoViewIfNeeded();
    await expect(steps).toHaveAttribute("data-active", "1");
    await expect(steps).toHaveAttribute("data-active", "2", { timeout: 9000 });
    await press(steps.locator("button").nth(4));
    await expect(steps).toHaveAttribute("data-active", "5");
    await expect(steps.locator("button").nth(4)).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(6000);
    await expect(steps).toHaveAttribute("data-active", "5");
  });

  test("every one of the 11 screens plays, and comes back to its start", async ({ page }) => {
    test.slow();
    await page.goto("/");
    for (const [index, n] of CARDS.entries()) {
      const screen = page.locator(".cards > .card").nth(index).locator("[data-loop]");
      await screen.scrollIntoViewIfNeeded();
      await expect(screen, `card ${n}`).toHaveClass(/is-looping/);
      expect(await screen.locator("[data-at]").count(), `card ${n}`).toBeGreaterThan(1);
      await expect
        .poll(() => screen.locator("[data-at].on").count(), { timeout: 8000 })
        .toBeGreaterThan(0);
    }
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

test.describe("the iceberg on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  test("one picture first, then the list with its color keys", async ({ page }) => {
    await page.goto("/");
    const picture = (await page.locator("#weeks .berg__pic").boundingBox())!;
    const list = (await page.locator("#weeks .berg__list").boundingBox())!;
    expect(picture.y + picture.height).toBeLessThanOrEqual(list.y);
    // The picture is one piece, as wide as the window lets it be.
    expect(picture.width).toBeGreaterThan(300);
    for (const key of await page.locator("#weeks .berg__items li[data-band] .berg__key").all())
      expect((await key.boundingBox())!.width).toBeGreaterThan(10);
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
    // The first screen's entrance is the style sheet's own, so it plays here too, and then it is done.
    for (const el of await page.locator("[data-reveal], [data-enter]").all()) {
      await expect(el).toHaveCSS("opacity", "1");
      await expect(el).toHaveCSS("translate", "none");
    }
    const hidden = await page
      .locator("[data-loop] [data-at]")
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "0").length);
    expect(hidden).toBe(0);
    await expect(page.locator(".bar__cta")).toBeVisible();
  });
});
