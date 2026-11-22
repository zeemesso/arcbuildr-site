import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PRODUCT, founding, section } from "../src/content/deck";
import { page as words } from "../src/content/site";
import { VSL_VIDEO } from "../src/config";
import { press } from "./press";
import { popup, stub } from "./stubs";

/** Letters and digits only: a row the page splits into cells still reads the same, word for word. */
const squash = (text: string | null) => (text ?? "").replace(/[^\p{L}\p{N}]+/gu, "");

const first = section(1);
const get = section(5);
const offer = section(9);
const door = section("the apply window");
/** The page's sections, in the deck's order: the deck's key, and the id each has on the page. */
const SECTIONS: [number | string, string][] = [
  [1, "top"],
  [2, "problem"],
  [3, "believe"],
  [4, "framework"],
  [5, "get"],
  [7, "work"],
  [8, "weeks"],
  [9, "offer"],
  [10, "guarantee"],
  [11, "fit"],
  [12, "questions"],
  ["the apply window", "apply"],
];
/**
 * Section 7, the gallery, is on the page only once its twelve real pieces exist. The pieces are files in
 * src/content/proof/, which git ignores, so this is false until `node scripts/proof/import.mjs` brings
 * them in. One line of section 8 points at that work and waits with it.
 * Section 6 of the deck ("Who directs it") is no longer on the page (23 Nov).
 */
const PROOF = "src/content/proof";
const has = (id: string) => existsSync(`${PROOF}/${id}.json`);
const workOn = [1, 2, 3, 4].every((tab) => [1, 2, 3].every((n) => has(`gallery-${tab}-${n}`)));
const readingOn = workOn && has("script-1-full");
/** A line the page holds back, with the reason. */
const waits = (key: number | string, slot: string) =>
  (key === 8 && slot === "free 3" && !readingOn) ||
  // The video's own lines are on the page only with a film to play.
  (key === 1 && slot.startsWith("video, ") && (slot === "video, placeholder line" || !VSL_VIDEO));
const CARDS = Array.from({ length: 7 }, (_, n) => String(n + 1).padStart(2, "0"));

test.describe("the home page", () => {
  test.use({ reducedMotion: "reduce" });

  test("the page's script does not wait for the visit counter", async ({ page }) => {
    // The visit counter's server never answers here. The form must still open.
    await stub(page);
    await page.route(/cloudflareinsights\.com/, () => new Promise(() => {}));
    await page.goto("/", { waitUntil: "commit" });
    await press(page.locator("#top [data-apply-open]").first());
    await expect(popup(page)).toBeVisible();
  });

  test("the first screen carries the callout, the headline, one line, the button, its line and the tab", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(first.get("headline"));
    const top = page.locator("#top");
    await expect(top.locator(".label")).toHaveText(first.get("label above the headline"));
    await expect(top.locator(".first__line")).toHaveText(first.get("line under it"));
    await expect(top.locator("[data-cta]")).toHaveText(first.get("button"));
    await expect(top.locator(".first__under")).toHaveText(first.get("under the button"));
    await expect(top.locator(".first__places")).toHaveText(founding(first.get("hanging tab")));
    // One button, no second action, no face beside it, and no price.
    await expect(top.locator("a, button")).toHaveCount(VSL_VIDEO ? 2 : 1);
    expect(await top.textContent()).not.toMatch(/USD|\$/);
    // From top to bottom, in that order.
    const order = [".label", "h1", ".first__line", "[data-cta]", ".first__under"];
    const tops = [];
    for (const selector of order) tops.push((await top.locator(selector).boundingBox())!.y);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
  });

  test("the sections come in the deck's order, the work only with its twelve real pieces", async ({
    page,
  }) => {
    await page.goto("/");
    const ids = await page.locator("main > section").evaluateAll((els) => els.map((el) => el.id));
    expect(ids).toEqual(SECTIONS.map(([, id]) => id).filter((id) => id !== "work" || workOn));
    expect(SECTIONS).toHaveLength(12);
    // "Who directs it" is gone: no section, no link to it, none of its words.
    await expect(page.locator('#who, a[href$="#who"]')).toHaveCount(0);
    expect(squash(await page.locator("body").textContent())).not.toContain(
      squash(section(6).get("heading")),
    );
  });

  for (const [index, [key, id]] of SECTIONS.entries()) {
    test(`section ${index + 1} (#${id}) says every line of the deck, word for word, in order`, async ({
      page,
    }) => {
      await page.goto("/");
      if (id === "work" && !workOn) {
        // Not twelve real pieces yet: the section, its words and any link to it are not on the page.
        await expect(page.locator("#work")).toHaveCount(0);
        await expect(page.locator('a[href$="#work"]')).toHaveCount(0);
        expect(squash(await page.locator("body").textContent())).not.toContain(
          squash(section(7).get("heading")),
        );
        return;
      }
      // The three wins belong to section 1 and sit right under the first screen.
      const scope = id === "top" ? page.locator("#top, [data-wins]") : page.locator(`#${id}`);
      const text = squash((await scope.allTextContents()).join(" "));
      const body = squash(await page.locator("main").textContent());
      let from = 0;
      for (const { slot, words } of section(key).list("")) {
        // A note for a real piece has no words of its own. A gallery tab shows only once it has a piece.
        if (!words || /^tab \d/.test(slot)) continue;
        const said = squash(founding(words));
        if (waits(key, slot)) {
          expect(body, `${slot} waits`).not.toContain(said);
          continue;
        }
        const at = text.indexOf(said, from);
        expect(at, `${slot}: ${words}`).toBeGreaterThanOrEqual(0);
        // Most sections keep the deck's order from top to bottom. Two place a line by design: the video's
        // poster comes before the line under its frame, and the iceberg's picture before its list.
        if (key !== 1 && key !== 8) from = at;
      }
    });
  }

  test("the header links to the framework, what you get, the offer and the questions, each by its own label", async ({
    page,
  }) => {
    // On a phone the links are in the page and out of sight: the header keeps only the logo and the button.
    await page.goto("/");
    const links = page.locator("header nav a");
    await expect(links).toHaveText(
      [4, 5, 9, 12].map((n) => section(n).get("label")),
      { ignoreCase: true },
    );
    expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))).toEqual([
      "#framework",
      "#get",
      "#offer",
      "#questions",
    ]);
  });

  test("with no film, the first screen has no video block, no cue and no placeholder: it reads complete", async ({
    page,
  }) => {
    test.skip(!!VSL_VIDEO, "The film is in");
    await page.goto("/");
    const top = page.locator("#top");
    await expect(top.locator("[data-vsl], video, .first__cue, [data-vsl-soon]")).toHaveCount(0);
    const text = squash(await page.locator("body").textContent());
    for (const slot of ["video, label", "video, placeholder line", "video, poster"])
      expect(text, slot).not.toContain(squash(first.get(slot)));
    // The button follows the line with no hole where the video would be.
    const line = (await top.locator(".first__line").boundingBox())!;
    const button = (await top.locator("[data-cta]").boundingBox())!;
    expect(button.y - (line.y + line.height)).toBeLessThan(64);
  });

  for (const path of ["/demo/vsl/", "/?vsl=demo"]) {
    test(`the video block, with a test film (${path}): the cue, 16:9, the poster line, a play button that plays`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForURL(/\/demo\/vsl\/$/);
      const top = page.locator("#top");
      await expect(top.locator(".first__cue")).toHaveText(first.get("video, label"));
      const slot = top.locator("[data-vsl]");
      const box = (await slot.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
      await expect(slot.locator(".vsl__who")).toHaveText(first.get("video, poster"));
      // The video comes after the headline and before the button.
      const headline = (await page.locator("h1").boundingBox())!;
      const button = (await top.locator("[data-cta]").boundingBox())!;
      expect(box.y).toBeGreaterThan(headline.y + headline.height - 1);
      expect(button.y).toBeGreaterThan(box.y + box.height - 1);
      // No placeholder line, no drawn or generated face.
      await expect(top.locator("[data-vsl-soon]")).toHaveCount(0);
      await expect(slot.locator(".vsl__face, canvas")).toHaveCount(0);
      await press(slot.locator("button[data-vsl-play]"));
      await expect(slot).toHaveClass(/is-playing/);
      await expect
        .poll(() => slot.locator("video").evaluate((el: HTMLVideoElement) => el.currentTime))
        .toBeGreaterThan(0);
      // The demo page is never for a search engine.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });
  }

  test("three wins follow the first screen, each with its title and its line", async ({ page }) => {
    await page.goto("/");
    const wins = page.locator("[data-wins] > li");
    await expect(wins).toHaveCount(3);
    for (const n of [1, 2, 3]) {
      await expect(wins.nth(n - 1).locator(".wins__h")).toHaveText(first.get(`win ${n}, title`));
      await expect(wins.nth(n - 1).locator("p")).toHaveText(first.get(`win ${n}, line`));
    }
    const top = (await page.locator("#top").boundingBox())!;
    expect((await page.locator("[data-wins]").boundingBox())!.y).toBeGreaterThan(
      top.y + top.height - 1,
    );
  });

  test("no company's mark is on the page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator(".marks, img[src*='/marks/'], img[src*='claude' i], img[src*='openai' i]"),
    ).toHaveCount(0);
    expect((await page.request.get("/marks/claude-spark.svg")).status()).toBe(404);
  });

  test("the type stays small: a headline of 56 px at most, a section heading of 36 px at most, a statement of 44", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    const size = (selector: string) =>
      page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    for (const px of await size("h1")) expect(px).toBeLessThanOrEqual(56);
    for (const px of await size("h2.h2, .show h2, .wins__h")) expect(px).toBeLessThanOrEqual(36);
    // The problem's two sentences are the one statement set larger than a heading.
    for (const px of await size(".say__big *")) expect(px).toBeLessThanOrEqual(44);
    // Nothing on the page is set larger than the headline.
    const largest = await page.evaluate(() =>
      Math.max(
        ...[...document.querySelectorAll("main *")]
          .filter((el) => !el.closest("svg, [hidden]") && el.textContent?.trim())
          .map((el) => parseFloat(getComputedStyle(el).fontSize)),
      ),
    );
    expect(largest).toBeLessThanOrEqual(56);
  });

  test("the framework is one chain: the interview, three steps in order, the piece ready to film", async ({
    page,
  }) => {
    await page.goto("/");
    const show = section(4);
    const links = page.locator("#framework [data-chain] > li");
    await expect(links).toHaveCount(5);
    await expect(links.nth(0).locator("h3")).toHaveText(show.get("start, title"));
    await expect(links.nth(4).locator("h3")).toHaveText(show.get("end, title"));
    for (const [at, n] of ["01", "02", "03"].entries()) {
      const link = links.nth(at + 1);
      await expect(link.locator(".chain__name")).toHaveText(show.get(`step ${n}, name`));
      // The plain meaning sits right under the name, and the name is the larger of the two.
      const name = (await link.locator(".chain__name").boundingBox())!;
      const plain = (await link.locator(".chain__plain").boundingBox())!;
      await expect(link.locator(".chain__plain")).toHaveText(show.get(`step ${n}, plain meaning`));
      expect(plain.y - (name.y + name.height)).toBeLessThan(16);
      await expect(link.locator(".chain__becomes")).toHaveText(show.get(`step ${n}, becomes`));
    }
    const boxes = [];
    for (const link of await links.all()) boxes.push((await link.boundingBox())!);
    if (page.viewportSize()!.width < 1024) {
      // On a phone: top to bottom.
      for (let n = 1; n < 5; n++) expect(boxes[n]!.y).toBeGreaterThan(boxes[n - 1]!.y);
    } else {
      // On a wide screen: left to right, on one line.
      for (let n = 1; n < 5; n++) {
        expect(boxes[n]!.x).toBeGreaterThan(boxes[n - 1]!.x);
        expect(boxes[n]!.y).toBe(boxes[0]!.y);
      }
    }
  });

  test("each of the seven cards has its screen: a drawing that moves, or the picture of the real document", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".cards > .card")).toHaveCount(7);
    for (const [index, n] of CARDS.entries()) {
      const card = page.locator(".cards > .card").nth(index);
      const stage = card.locator(".card__stage");
      // Its number, its title as a heading, the date, the step and the body: said once, in this order.
      await expect(card.locator(".card__n")).toHaveText(n);
      await expect(card.locator("h3.card__h")).toHaveText(get.get(`card ${n}, title`));
      await expect(card.locator(".card__date")).toHaveText(get.get(`card ${n}, date`));
      await expect(card.locator(".card__from")).toHaveText(get.get(`card ${n}, from`));
      await expect(card.locator(".card__body")).toHaveText(get.get(`card ${n}, body`));
      const tops = await card
        .locator(".card__n, .card__h, .card__meta")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
      await expect(stage.locator("figure.screen[data-loop]")).toHaveCount(1);
      if (await stage.locator("img").count()) {
        // The picture of the real document has words for someone who cannot see it.
        expect((await stage.locator("img").getAttribute("alt"))!.length).toBeGreaterThan(0);
        continue;
      }
      // A drawing: shapes, with only the deck's labels as words, and nothing for a screen reader to read.
      await expect(stage.locator("figure.screen")).toHaveAttribute("aria-hidden", "true");
      const labels = get.list(`card ${n}, screen label`).map(({ words }) => words);
      const said = (await stage.locator(".cap").allTextContents()).map((text) => text.trim());
      expect(said).toEqual(labels);
      const others = await stage.evaluate((el) => {
        const copy = el.cloneNode(true) as HTMLElement;
        copy.querySelectorAll(".cap, b").forEach((node) => node.remove());
        return (copy.textContent ?? "").trim();
      });
      expect(others).toBe("");
      // Nothing of the drawing runs out of its stage's width.
      const frame = (await stage.boundingBox())!;
      expect(frame.height).toBeGreaterThan(120);
    }
  });

  test("the lines that point at the work wait for it: nothing stands above an empty place", async ({
    page,
  }) => {
    test.skip(workOn, "The twelve real pieces are in");
    await page.goto("/");
    const text = squash(await page.locator("body").textContent());
    expect(text).not.toContain(squash(section(8).get("free 3")));
    await expect(page.locator("#weeks .berg__items--free li")).toHaveCount(2);
    // No grey bar, no "coming soon", no empty frame anywhere on the page.
    await expect(
      page.locator("main [aria-hidden='true'].bars, main .wait, main .skeleton"),
    ).toHaveCount(0);
  });

  test("with reduced motion everything shows in its finished state and nothing runs", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(".cards > .card").nth(1).scrollIntoViewIfNeeded();
    for (const el of await page.locator("[data-reveal], [data-enter]").all()) {
      expect(await el.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      expect(await el.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
    }
    // The gallery, when it is on, stays still with no pause button.
    if (workOn) {
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

  test("names no social platform and no company form, and holds no jargon", async ({ page }) => {
    await page.goto("/");
    const text = (await page.locator("body").textContent())!;
    expect(text).not.toMatch(
      /instagram|tiktok|linkedin|youtube|facebook|twitter|\bLLC\b|\bInc\b|registered/i,
    );
    // No install steps, file names or jargon.
    expect(text).not.toMatch(/\binstall|\.zip\b|\.md\b|terminal|\bprompt\b|\bAPI\b|\brepo\b/i);
  });

  test("an apply button closes sections 5, 9 and 11, and each opens the same form", async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/");
    for (const [n, id] of [
      [5, "get"],
      [9, "offer"],
      [11, "fit"],
    ] as const) {
      const strip = page.locator(`#${id} .strip`);
      await expect(strip).toHaveCount(1);
      await expect(strip.locator("p")).toHaveText(founding(section(n).get("apply strip")));
      const button = strip.locator("[data-apply-open]");
      await expect(button).toHaveText(door.get("button"));
      // It is the last thing in its section.
      expect(await strip.evaluate((el) => el.parentElement!.lastElementChild === el), id).toBe(
        true,
      );
      await press(button);
      await expect(popup(page), id).toBeVisible();
      await press(page.locator("[data-tally-close]"));
      await expect(popup(page), id).toHaveCount(0);
    }
    // The other sections have none, and the final panel has the two fields.
    await expect(page.locator("main .strip")).toHaveCount(3);
    await expect(page.locator("#apply form[data-apply-entry] input")).toHaveCount(2);
    await expect(page.locator("#apply form button")).toHaveText(door.get("button"));
  });

  test("the offer's work is a ledger: the core first and heavier, then the documents with their price, then what is included", async ({
    page,
  }) => {
    await page.goto("/");
    const rows = page.locator("#offer [data-ledger] > li");
    const deck = offer.list("stack row ");
    await expect(rows).toHaveCount(deck.length);
    expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-kind")))).toEqual([
      "core",
      "core",
      "priced",
      "priced",
      "priced",
      "priced",
      "included",
    ]);
    // Each row is the deck's row, word for word: its name, and its figure in the figure column.
    for (const [n, { words: row }] of deck.entries())
      expect(squash(await rows.nth(n).textContent()), `row ${n + 1}`).toBe(squash(row));
    await expect(rows.locator(".ledger__value")).toHaveText([
      "The core",
      "The core",
      "1,250 USD",
      "150 USD",
      "1,000 USD",
      "1,760 USD",
      "Included",
    ]);
    // The core is set heavier than a priced row.
    const size = (n: number) =>
      rows
        .nth(n)
        .locator(".ledger__name b")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size(0)).toBeGreaterThan(await size(2));
    expect(await size(1)).toBeGreaterThan(await size(2));
    // The note sits under the rows.
    const last = (await rows.last().boundingBox())!;
    const note = page.locator("#offer .offer__note");
    await expect(note).toHaveText(offer.get("stack note"));
    expect((await note.boundingBox())!.y).toBeGreaterThan(last.y + last.height - 1);
  });

  test("the bonuses are a stack of items, each with a name, a value and what it does", async ({
    page,
  }) => {
    await page.goto("/");
    const items = page.locator("#offer [data-bonuses] > li");
    await expect(items).toHaveCount(4);
    await expect(items.locator(".bonus__value")).toHaveText([
      "58 USD",
      "525 USD",
      "Included",
      "Included",
    ]);
    for (const n of [1, 2, 3, 4]) {
      const item = items.nth(n - 1);
      await expect(item.locator(".bonus__name")).toHaveText(offer.get(`bonus ${n}, name`));
      await expect(item.locator(".bonus__body")).toHaveText(offer.get(`bonus ${n}, body`));
      // Each is a card of its own, with a cover.
      await expect(item.locator(".bonus__cover")).toBeVisible();
      expect(await item.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toMatch(
        /rgba?\(0, 0, 0, 0\)|transparent/,
      );
    }
  });

  test("the product is a card of its own: its label, its name on one line, its value, three things inside", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.locator("#offer [data-product]");
    await expect(card).toHaveCount(1);
    await expect(card.locator(".product__label")).toHaveText(offer.get("add-on, label"));
    const name = card.locator(".product__name");
    await expect(name).toHaveText(PRODUCT);
    const lines = await name.evaluate(
      (el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
    );
    expect(Math.round(lines)).toBe(1);
    await expect(card.locator(".product__value")).toContainText("147 USD");
    await expect(card.locator(".product__inside li")).toHaveCount(3);
    for (const [n, { words: inside }] of offer.list("inside ").entries())
      expect(squash(await card.locator(".product__inside li").nth(n).textContent())).toBe(
        squash(inside),
      );
    // The line on what it needs stays small: the smallest words of the card.
    const px = (selector: string) =>
      card
        .locator(selector)
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    await expect(card.locator(".product__small")).toHaveText(offer.get("add-on, small line"));
    expect(await px(".product__small")).toBeLessThan(await px(".product__body"));
    expect(await px(".product__small")).toBeLessThanOrEqual(await px(".product__inside li"));
    // The name is filled in wherever a line calls for it.
    expect(await page.locator("body").textContent()).not.toContain("{product}");
  });

  test("the total stands beside the founding price, then the six prices and the founding places", async ({
    page,
  }) => {
    await page.goto("/");
    const price = page.locator("#offer");
    await expect(price.locator(".sum__total b")).toHaveText("4,890 USD");
    await expect(price.locator(".sum__price b")).toHaveText("1,000 USD");
    const px = (selector: string) =>
      price.locator(selector).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await px(".sum__price b")).toBeGreaterThan(await px(".sum__total b"));
    await expect(price.locator(".sum__note")).toHaveText(offer.get("line under the stack"));
    await expect(price.locator(".sizes__table tbody tr")).toHaveCount(3);
    const cells = await price.locator(".sizes__table tbody td").allTextContents();
    expect(cells.filter((cell) => /^[\d,]+ USD$/.test(cell.trim()))).toHaveLength(6);
    await expect(price.locator(".sizes__founding")).toHaveText(
      founding(offer.get("founding line")),
    );
    await expect(price.locator(".sizes__founding i")).toHaveCount(3);
  });

  test("the iceberg explains every band, each tied to its line by its color", async ({ page }) => {
    await page.goto("/");
    const bands = page.locator("#weeks .berg-band");
    const names = page.locator("#weeks .berg-name");
    const lines = page.locator("#weeks .berg__items li[data-band]");
    await expect(bands).toHaveCount(9);
    await expect(lines).toHaveCount(9);
    for (let n = 0; n < 9; n++) {
      const words = section(8).get(`band ${n + 1}`);
      await expect(lines.nth(n)).toHaveText(words);
      expect(words.startsWith(`${(await names.nth(n).textContent())!.trim()}.`)).toBe(true);
      const band = await bands.nth(n).evaluate((el) => getComputedStyle(el).fill);
      const key = await lines
        .nth(n)
        .locator(".berg__key")
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(key, `band ${n + 1}`).toBe(band);
    }
    // Nine different colors.
    const colors = await bands.evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));
    expect(new Set(colors).size).toBe(9);
  });

  test("the iceberg is a picture of one: a small tip above the waterline, the mass below it", async ({
    page,
  }) => {
    await page.goto("/");
    const box = (selector: string) =>
      page
        .locator(`#weeks ${selector}`)
        .first()
        .evaluate((el) => {
          const { top, bottom, left, right } = el.getBoundingClientRect();
          return { top, bottom, left, right, height: bottom - top, width: right - left };
        });
    const tip = await box(".berg-tip__ice");
    const line = await box(".berg-line");
    const mass = await box(".berg-mass__rim");
    const picture = await box(".berg__svg");
    // The tip ends at the waterline and the mass starts there.
    expect(Math.abs(tip.bottom - line.bottom)).toBeLessThan(4);
    expect(Math.abs(mass.top - line.bottom)).toBeLessThan(4);
    // The part under the water is at least four times as tall as the tip, and wider.
    expect(mass.height).toBeGreaterThan(4 * tip.height);
    expect(mass.width).toBeGreaterThan(1.5 * tip.width);
    // Water all around the mass: it touches no edge of the picture.
    expect(mass.left).toBeGreaterThan(picture.left + 8);
    expect(mass.right).toBeLessThan(picture.right - 8);
    expect(mass.bottom).toBeLessThan(picture.bottom - 8);
    // Every band sits under the water.
    for (const band of await page.locator("#weeks .berg-band").all()) {
      const top = await band.evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThan(line.bottom - 4);
    }
  });

  test("the gallery shows its twelve real pieces, three under each tab", async ({ page }) => {
    test.skip(!workOn, "Not twelve real pieces yet: the gallery is not on the page");
    await page.goto("/");
    const tabs = page.locator("#work [data-reel-tab]");
    await expect(tabs).toHaveCount(4);
    await expect(page.locator("#work .piece")).toHaveCount(12);
    for (const n of [1, 2, 3, 4])
      await expect(page.locator(`#work .piece[data-tab="${n}"]`)).toHaveCount(3);
  });

  test("the questions open one at a time, the first one open", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator("#questions details");
    await expect(rows).toHaveCount(9);
    await expect(rows.first()).toHaveAttribute("open", "");
    await expect(page.locator("#questions details[open]")).toHaveCount(1);
    await press(rows.nth(5).locator("summary"));
    await expect(rows.nth(5)).toHaveAttribute("open", "");
    await expect(rows.nth(5)).toContainText(section(12).get("answer 6"));
    await expect(page.locator("#questions details[open]")).toHaveCount(1);
  });

  test("the page is one sheet of paper: a painted section is a panel, never a band across the screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const sections = await page.locator("main > section").evaluateAll((els) =>
      els.map((el) => {
        const color = getComputedStyle(el).backgroundColor;
        return {
          id: el.id,
          painted: !/rgba?\(0, 0, 0, 0\)|transparent/.test(color),
          width: el.getBoundingClientRect().width,
        };
      }),
    );
    // Three sections are a surface: the framework, the guarantee and the last panel. The rest is paper.
    expect(sections.filter((section) => section.painted).map((section) => section.id)).toEqual([
      "framework",
      "guarantee",
      "apply",
    ]);
    for (const { id, painted, width } of sections)
      if (painted) expect(width, id).toBeLessThan(1440 - 16);
  });
});

test.describe("the home page in motion", () => {
  test("the chain's links arrive as the framework comes on screen", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("#framework [data-chain] > li");
    await expect(links.last()).not.toHaveClass(/is-in/);
    // On a phone the chain is taller than the screen, so each link arrives as it is reached.
    for (const link of await links.all()) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toHaveClass(/is-in/);
    }
  });

  test("the gallery steps forward by itself, and the pause button stops it", async ({ page }) => {
    test.skip(!workOn, "Not twelve real pieces yet: the gallery is not on the page");
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

  test("sections enter as you scroll", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".cards > .card").nth(1);
    await expect(card).not.toHaveClass(/is-in/);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/is-in/);
  });

  test("the header's button never disappears: at the top, in the middle and at the end of the page", async ({
    page,
  }) => {
    await page.goto("/");
    const button = page.locator(".bar__cta");
    await expect(button).toHaveText(words.pill);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (const at of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: "instant" }),
        Math.round(height * at),
      );
      await expect(button, `at ${at * 100}% of the page`).toBeInViewport({ ratio: 1 });
      await expect(button).toHaveCSS("opacity", "1");
      await expect(button).toHaveCSS("visibility", "visible");
    }
  });

  test("the first button and the header's button open the same form", async ({ page }) => {
    await stub(page);
    await page.goto("/");
    await press(page.locator("#top [data-apply-open]"));
    await expect(popup(page)).toBeVisible();
    await press(page.locator("[data-tally-close]"));
    await expect(popup(page)).toHaveCount(0);
    await page.locator(".cards > .card").nth(1).scrollIntoViewIfNeeded();
    await press(page.locator(".bar__cta"));
    await expect(popup(page)).toBeVisible();
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
    test(`${width} x 650: the headline and the apply button show without scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 650 });
      await page.goto("/");
      for (const selector of ["h1", "#top .first__line", "#top [data-cta]"])
        await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
    });
    test(`${width} x 650, with a film: the headline, the video and the apply button show without scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 650 });
      await page.goto("/demo/vsl/");
      for (const selector of ["h1", "#top [data-vsl]", "#top [data-cta]"])
        await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
    });
  }
});

test.describe("the header's button at every width", () => {
  test.use({ reducedMotion: "reduce" });
  for (const width of [320, 360, 390, 600, 768, 1024, 1440, 1920]) {
    test(`${width} px: the button is whole, in the header, clear of the logo, from top to bottom`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const button = page.locator(".bar__cta");
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (const at of [0, 0.5, 1]) {
        await page.evaluate(
          (y) => scrollTo({ top: y, behavior: "instant" }),
          Math.round(height * at),
        );
        await expect(button).toBeInViewport({ ratio: 1 });
        const [b, logo] = await Promise.all([
          button.boundingBox(),
          page.locator(".bar__pill > :first-child").boundingBox(),
        ]);
        expect(b!.x).toBeGreaterThanOrEqual(logo!.x + logo!.width);
        expect(b!.x + b!.width).toBeLessThanOrEqual(width);
        // Large enough to press with a thumb.
        expect(b!.height).toBeGreaterThanOrEqual(36);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }
});

test.describe("the moving screens", () => {
  test("7 of 7: each card's screen plays while it is on screen, and stops when it leaves", async ({
    page,
  }) => {
    await page.goto("/");
    let moving = 0;
    for (const n of CARDS) {
      const screen = page.locator(`[data-card="${n}"] figure.screen[data-loop]`);
      await screen.scrollIntoViewIfNeeded();
      await expect(screen).toHaveClass(/is-looping/);
      // Its parts arrive one after the other.
      await expect.poll(() => screen.locator(".on").count()).toBeGreaterThan(1);
      moving++;
    }
    expect(moving).toBe(7);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator('[data-card="07"] figure.screen')).not.toHaveClass(/is-looping/);
  });

  test("with reduced motion every screen shows finished and nothing loops", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator('[data-card="03"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(page.locator("figure.screen.is-looping")).toHaveCount(0);
    for (const part of await page.locator('[data-card="03"] .screen [data-at]').all())
      await expect(part).toHaveCSS("opacity", "1");
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("everything shows, and the header keeps its button", async ({ page }) => {
    await page.goto("/");
    // The first screen's entrance is the style sheet's own, so it plays here too, and then it is done.
    for (const el of await page.locator("[data-reveal], [data-enter]").all()) {
      await expect(el).toHaveCSS("opacity", "1");
      await expect(el).toHaveCSS("translate", "none");
    }
    await expect(page.locator(".bar__cta")).toBeVisible();
  });
});
