import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PACKAGES, PRODUCT, section } from "../src/content/deck";
import { samples } from "../src/content/samples";
import { page as words } from "../src/content/site";
import { VSL_VIDEO } from "../src/config";
import { press } from "./press";
import { opened, popup, stub } from "./stubs";

/** Letters and digits only: a row the page splits into cells still reads the same, word for word. */
const squash = (text: string | null) => (text ?? "").replace(/[^\p{L}\p{N}]+/gu, "");

const first = section(1);
const get = section(5);
const offer = section(8);
const door = section("the apply window");
/** The page's sections, in the deck's order: the deck's key, and the id each has on the page. */
const SECTIONS: [number | string, string][] = [
  [1, "top"],
  [2, "problem"],
  [3, "believe"],
  [4, "how"],
  [5, "get"],
  [6, "work"],
  [8, "packages"],
  ["8b. say it plain", "say-it-plain"],
  [9, "guarantee"],
  [10, "fit"],
  [11, "questions"],
  ["the apply window", "apply"],
];
/**
 * Section 6, the gallery, is on the page only once its twelve real pieces exist. The pieces are files in
 * src/content/proof/, which git ignores, so this is false until `node scripts/proof/import.mjs` brings
 * them in.
 */
const PROOF = "src/content/proof";
const has = (id: string) => existsSync(`${PROOF}/${id}.json`);
const workOn = [1, 2, 3, 4].every((tab) => [1, 2, 3].every((n) => has(`gallery-${tab}-${n}`)));
/** The ids of the page's sections, top to bottom. Section 8's bonuses are their own block, after Say It Plain. */
const IDS = SECTIONS.flatMap(([, id]) => (id === "say-it-plain" ? [id, "bonuses"] : [id]));
/** Where a deck section's words are on the page: section 8 is the three cards, then the bonuses. */
const where = (id: string) =>
  id === "top" ? "#top, [data-wins]" : id === "packages" ? "#packages, #bonuses" : `#${id}`;
/** A line the page holds back, with the reason. */
const waits = (key: number | string, slot: string) =>
  // The video's own line is on the page only with a film to play.
  key === 1 && slot.startsWith("video, ") && !VSL_VIDEO;
/**
 * A line the page places by design, out of the deck's order: a card's screen and its labels come before
 * its words, a tag and a badge sit above the name they belong to, a package's price is in its footer,
 * a bonus says "Included" before its body, and the note on the sample stands right under the sample.
 */
const placed = (key: number | string, slot: string) =>
  key === 1 ||
  (key === 4 && /, tag$/.test(slot)) ||
  (key === 5 && /, (label \d|tags)$/.test(slot)) ||
  (key === 8 && /^(package \d, (badge|price|price after)|bonus \d, (with|value))$/.test(slot)) ||
  (key === "8b. say it plain" && slot === "samples note");
/** A line the deck writes for a screen reader: a picture's description or a button's name, never shown. */
const unseen = (slot: string) => /, words for a screen reader$/.test(slot);
/** A line the page shows one sentence at a time, each in its own row. */
const split = (slot: string) => /, tags$/.test(slot);
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

  test("the first screen carries the callout, the headline, one line, two buttons, one small line and the video frame", async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(first.get("headline"));
    const top = page.locator("#top");
    await expect(top.locator(".first__for")).toHaveText(first.get("label above the headline"));
    await expect(top.locator(".first__line")).toHaveText(first.get("line under it"));
    await expect(top.locator("[data-cta]")).toHaveText(first.get("button"));
    await expect(top.locator(".first__under")).toHaveText(first.get("under the button"));
    // The second button: a pill with the two marks, each whole in its own disc, that leads to What you get.
    const see = top.locator("[data-see]");
    await expect(see).toHaveText(first.get("see everything button"));
    await expect(see).toHaveAttribute("href", "#get");
    const marks = see.locator(".marks__disc img");
    expect(await marks.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).alt))).toEqual(
      [words.marks.claude, words.marks.chatgpt],
    );
    for (const mark of await marks.all()) {
      expect(
        await mark.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      ).toBe(true);
      const disc = (await mark.locator("xpath=..").boundingBox())!;
      const box = (await mark.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(disc.x);
      expect(box.x + box.width).toBeLessThanOrEqual(disc.x + disc.width);
    }
    // Its surface is not the page's paper: it reads as a button.
    expect(await see.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor),
    );
    // No line about who speaks, no count of places, and no price.
    await expect(top.locator("[data-who], .first__places, .hang__dots")).toHaveCount(0);
    if (!VSL_VIDEO) await expect(top.locator("a:visible, button:visible")).toHaveCount(2);
    expect(await top.textContent()).not.toMatch(/USD|\$/);
    // From top to bottom, in that order.
    const order = [".first__for", "h1", ".first__line", "[data-cta]", ".first__under", ".vsl"];
    const tops = [];
    for (const selector of order) tops.push((await top.locator(selector).boundingBox())!.y);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    // Side by side where there is room for both; one above the other on a phone.
    const cta = (await top.locator("[data-cta]").boundingBox())!;
    const pill = (await see.boundingBox())!;
    if (page.viewportSize()!.width >= 700) {
      expect(pill.y).toBe(cta.y);
      expect(pill.x).toBeGreaterThan(cta.x + cta.width);
    } else expect(pill.y).toBeGreaterThan(cta.y + cta.height - 1);
    // The pill scrolls to What you get and does not open the form.
    await press(see);
    await expect(page).toHaveURL(/#get$/);
    await expect(popup(page)).toHaveCount(0);
  });

  test("at 1440 the headline is display size and heavy, and the line above it is heavy too", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const type = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const { fontSize, fontWeight } = getComputedStyle(el);
        return { px: parseFloat(fontSize), weight: Number(fontWeight) };
      });
    const headline = await type("h1");
    expect(headline.px).toBeGreaterThanOrEqual(88);
    expect(headline.weight).toBeGreaterThanOrEqual(700);
    const callout = await type("#top .first__for");
    expect(callout.px).toBeGreaterThanOrEqual(14);
    expect(callout.weight).toBeGreaterThanOrEqual(700);
    // No other heading comes near the headline: a panel's heading is 44 px at most, a section's 30.
    const others = await page
      .locator("main h2")
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    expect(Math.max(...others)).toBeLessThanOrEqual(44);
    for (const id of ["believe", "get", "packages", "say-it-plain", "bonuses", "fit", "questions"])
      expect((await type(`#${id} h2`)).px, id).toBeLessThanOrEqual(30);
  });

  test("nothing on the page counts the founding places", async ({ page }) => {
    await page.goto("/");
    expect(await page.locator("body").textContent()).not.toMatch(/\d of (3|three)\b/i);
    await expect(page.locator(".hang__dots, .founding__line, .first__places")).toHaveCount(0);
  });

  test("the sections come in the deck's order, the work only with its twelve real pieces", async ({
    page,
  }) => {
    await page.goto("/");
    const ids = await page.locator("main > section").evaluateAll((els) => els.map((el) => el.id));
    expect(ids).toEqual(IDS.filter((id) => id !== "work" || workOn));
    expect(IDS).toHaveLength(13);
    // "Who directs it", the five tools and Under the water are gone: no section and no link to them.
    await expect(
      page.locator('#who, #tools, #water, a[href$="#who"], a[href$="#tools"], a[href$="#water"]'),
    ).toHaveCount(0);
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
          squash(section(6).get("heading")),
        );
        return;
      }
      // The three wins belong to section 1 and sit right under the first screen.
      const scope = page.locator(where(id));
      const text = squash((await scope.allTextContents()).join(" "));
      const body = squash(await page.locator("main").textContent());
      let from = 0;
      for (const { slot, words } of section(key).list("")) {
        // A note for a real piece has no words of its own. A gallery tab shows only once it has a piece.
        if (!words || /^tab \d/.test(slot)) continue;
        // A line written for a screen reader names a picture or a button: it is not text on the page.
        if (unseen(slot)) continue;
        const said = squash(words);
        if (waits(key, slot)) {
          expect(body, `${slot} waits`).not.toContain(said);
          continue;
        }
        if (split(slot)) {
          for (const sentence of words.split(".").filter((part) => part.trim()))
            expect(text, `${slot}: ${sentence}`).toContain(squash(sentence));
          continue;
        }
        // The page keeps the deck's order from top to bottom, but for the lines it places by design.
        const free = placed(key, slot);
        const at = text.indexOf(said, free ? 0 : from);
        expect(at, `${slot}: ${words}`).toBeGreaterThanOrEqual(0);
        if (!free) from = at;
      }
    });
  }

  test("the header has no shortcuts: the logo and the Apply button, and no link to a section", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.locator("header.bar");
    await expect(header.locator("nav")).toHaveCount(0);
    await expect(header.locator('a[href^="#"]:not(.bar__cta)')).toHaveCount(0);
    // The logo, and one thing to press: the button.
    await expect(header.locator(".logo")).toBeVisible();
    await expect(header.locator("a, button")).toHaveCount(1);
    await expect(header.locator(".bar__cta")).toHaveText(words.pill);
    await expect(header.locator(".bar__cta")).toBeVisible();
  });

  test("with no film the video frame still shows: 16:9, a poster and a play mark, no words, nothing to press", async ({
    page,
  }) => {
    test.skip(!!VSL_VIDEO, "The film is in");
    await page.goto("/");
    const top = page.locator("#top");
    const frame = top.locator("[data-vsl-still]");
    await expect(frame).toBeVisible();
    const box = (await frame.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    await expect(frame.locator(".vsl__poster")).toBeVisible();
    await expect(frame.locator(".vsl__play")).toBeVisible();
    // No words in it, no "filming" line near it, and nothing a visitor or a screen reader could take for a film.
    expect(squash(await frame.textContent())).toBe("");
    await expect(frame.locator("video, button, a, canvas")).toHaveCount(0);
    await expect(frame).toHaveAttribute("aria-hidden", "true");
    await expect(top.locator("[data-vsl], .first__cue, [data-vsl-soon]")).toHaveCount(0);
    expect(squash(await page.locator("body").textContent())).not.toContain("Watchthisfirst");
    // It sits under the buttons and their small line.
    const under = (await top.locator(".first__under").boundingBox())!;
    expect(box.y).toBeGreaterThan(under.y + under.height - 1);
  });

  for (const path of ["/demo/vsl/", "/?vsl=demo"]) {
    test(`the video block, with a test film (${path}): no label, 16:9, no words, a play button that plays`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForURL(/\/demo\/vsl\/$/);
      const top = page.locator("#top");
      await expect(top.locator(".first__cue")).toHaveCount(0);
      const slot = top.locator("[data-vsl]");
      const box = (await slot.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
      expect(squash(await slot.textContent())).toBe("");
      // The video comes under the buttons and their small line.
      const under = (await top.locator(".first__under").boundingBox())!;
      expect(box.y).toBeGreaterThan(under.y + under.height - 1);
      // No placeholder line, no drawn or generated face.
      await expect(top.locator("[data-vsl-soon]")).toHaveCount(0);
      await expect(slot.locator(".vsl__face, canvas")).toHaveCount(0);
      // Less motion was asked for: the film waits for its play button, and the sound button is not there.
      await expect(slot).not.toHaveClass(/is-playing/);
      await expect(slot.locator("[data-vsl-sound]")).toBeHidden();
      await press(slot.locator("button[data-vsl-play]"));
      await expect(slot).toHaveClass(/is-playing/);
      expect(await slot.locator("video").evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
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

  test("the Claude and ChatGPT marks are in two places only: the first screen's pill and Say It Plain", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".marks")).toHaveCount(2);
    await expect(
      page.locator("#top [data-see] .marks, #say-it-plain .compass__foot .marks"),
    ).toHaveCount(2);
    const files = await page
      .locator("img[src*='/marks/']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("src")));
    expect(files).toEqual([
      "/marks/claude-spark.svg",
      "/marks/openai-blossom.svg",
      "/marks/claude-spark.svg",
      "/marks/openai-blossom.svg",
    ]);
    for (const file of new Set(files)) expect((await page.request.get(file!)).status()).toBe(200);
    // Neither is on the page after a booking.
    await page.goto("/booked");
    await expect(page.locator(".marks, img[src*='/marks/']")).toHaveCount(0);
  });

  test("the type scale: one headline at display size, a panel's heading of 44 px at most, a section heading of 30", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    const size = (selector: string) =>
      page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    // The headline is the one line at display size, and it stops at 92 px.
    const [headline] = await size("h1");
    expect(headline).toBeGreaterThanOrEqual(88);
    expect(headline).toBeLessThanOrEqual(92);
    for (const px of await size("h2.h2, .show h2, .wins__h")) expect(px).toBeLessThanOrEqual(30);
    for (const px of await size(".promise__h, .final__h")) expect(px).toBeLessThanOrEqual(44);
    // The problem's two sentences are the one statement set larger than a section heading.
    for (const px of await size(".say__big *")) expect(px).toBeLessThanOrEqual(36);
    // Nothing else on the page comes near the headline.
    const largest = await page.evaluate(() =>
      Math.max(
        ...[...document.querySelectorAll("main *")]
          .filter((el) => !el.closest("svg, [hidden], h1") && el.textContent?.trim())
          .filter((el) => !el.querySelector("h1"))
          .map((el) => parseFloat(getComputedStyle(el).fontSize)),
      ),
    );
    expect(largest).toBeLessThanOrEqual(44);
  });

  test("How it works is one picture: what you bring, what we decide, what you get", async ({
    page,
  }) => {
    await page.goto("/");
    const show = section(4);
    const how = page.locator("#how");
    const ins = how.locator(".flow__col--in .flow__card");
    const outs = how.locator(".flow__col--out .flow__card");
    const hub = how.locator("[data-hub]");
    await expect(how.locator(".flow__col--in .flow__label")).toHaveText(
      show.get("diagram, left label"),
    );
    await expect(how.locator(".flow__col--hub .flow__label")).toHaveText(
      show.get("diagram, hub label"),
    );
    await expect(how.locator(".flow__col--out .flow__label")).toHaveText(
      show.get("diagram, right label"),
    );
    // "We decide" carries the one director's mark: a drawing of our own.
    await expect(how.locator("[data-director-mark]")).toHaveCount(1);
    await expect(how.locator(".flow__col--hub [data-director-mark]")).toBeVisible();
    await expect(ins).toHaveCount(3);
    for (const n of [1, 2, 3])
      expect(squash(await ins.nth(n - 1).textContent())).toBe(squash(show.get(`input ${n}`)));
    await expect(hub.locator(".hub__line")).toHaveText(show.get("hub, line"));
    const decided = hub.locator(".hub__steps > li");
    await expect(decided).toHaveCount(3);
    for (const [at, n] of ["01", "02", "03"].entries()) {
      const step = decided.nth(at);
      await expect(step.locator(".hub__name")).toHaveText(show.get(`step ${n}, name`));
      await expect(step.locator(".hub__plain")).toHaveText(show.get(`step ${n}, plain meaning`));
      await expect(step.locator(".hub__becomes")).toHaveText(show.get(`step ${n}, becomes`));
    }
    await expect(outs).toHaveCount(5);
    for (const n of [1, 2, 3, 4])
      expect(squash(await outs.nth(n - 1).textContent())).toBe(squash(show.get(`output ${n}`)));
    // The fifth comes only with the two larger packages, and says so.
    await expect(outs.nth(4).locator(".flow__tag")).toHaveText(show.get("output 5, tag"));
    expect(squash(await outs.nth(4).textContent())).toContain(squash(show.get("output 5")));
    const [left, middle, right] = await Promise.all([
      ins.first().boundingBox(),
      hub.boundingBox(),
      outs.first().boundingBox(),
    ]);
    if (page.viewportSize()!.width < 1024) {
      // On a phone: top to bottom.
      expect(middle!.y).toBeGreaterThan(left!.y);
      expect(right!.y).toBeGreaterThan(middle!.y);
    } else {
      // On a wide screen: left to right.
      expect(middle!.x).toBeGreaterThan(left!.x + left!.width);
      expect(right!.x).toBeGreaterThan(middle!.x + middle!.width);
    }
    await expect(how.locator(".how__close")).toHaveText(show.get("chain line"));
  });

  test("the five steps follow the picture: all open on a phone, one at a time on a wide screen", async ({
    page,
  }) => {
    await page.goto("/");
    const show = section(4);
    const list = page.locator("#how [data-steps]");
    const steps = list.locator("> li");
    await expect(steps).toHaveCount(5);
    for (const n of [1, 2, 3, 4, 5])
      expect(squash(await steps.nth(n - 1).textContent())).toBe(
        squash(`0${n} ${show.get(`step ${n}`)}`),
      );
    if (page.viewportSize()!.width < 1024) {
      for (const step of await steps.all()) {
        await expect(step.locator(".steps__text")).toBeVisible();
        await expect(step.locator("button")).toHaveAttribute("aria-expanded", "true");
      }
      return;
    }
    // The first is open on arrival. Picking another opens it and closes the rest.
    await expect(list).toHaveAttribute("data-active", "1");
    await press(steps.nth(3).locator("button"));
    await expect(list).toHaveAttribute("data-active", "4");
    for (const [n, step] of (await steps.all()).entries()) {
      await expect(step.locator("button")).toHaveAttribute("aria-expanded", String(n === 3));
      if (n === 3) await expect(step.locator(".steps__text")).toBeVisible();
      else await expect(step.locator(".steps__text")).toBeHidden();
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
      // Its number, its title as a heading, the step and the body: said once, in this order. No date.
      await expect(card.locator(".card__n")).toHaveText(n);
      await expect(card.locator("h3.card__h")).toHaveText(get.get(`card ${n}, title`));
      await expect(card.locator(".card__date, .card__meta")).toHaveCount(0);
      await expect(card.locator(".card__from")).toHaveText(get.get(`card ${n}, from`));
      await expect(card.locator(".card__body")).toHaveText(get.get(`card ${n}, body`));
      const tops = await card
        .locator(".card__n, .card__h, .card__from")
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
      // Every label of the deck is on it, and no other word: what is left is digits and the deck's tags.
      const labels = get.list(`card ${n}, label `).map(({ words }) => words);
      expect(labels.length, `card ${n}`).toBeGreaterThan(1);
      let left = squash(await stage.textContent());
      for (const label of labels) {
        expect(left, `card ${n}: ${label}`).toContain(squash(label));
        left = left.replace(squash(label), "");
      }
      for (const tag of (get.find(`card ${n}, tags`) ?? "").split("."))
        if (tag.trim()) left = left.replaceAll(squash(tag), "");
      expect(left.replace(/\d/g, ""), `card ${n}`).toBe("");
      // Nothing of the drawing runs out of its stage's width.
      const frame = (await stage.boundingBox())!;
      expect(frame.height).toBeGreaterThan(120);
    }
  });

  test("his audit's picture is described in the deck's words, and nothing of it is on the page before it exists", async ({
    page,
  }) => {
    await page.goto("/");
    const picture = page.locator("#apply img.final__audit");
    const said = section("the apply window").get("audit picture, words for a screen reader");
    expect(said.length).toBeGreaterThan(20);
    if (has("audit")) return void (await expect(picture).toHaveAttribute("alt", said));
    // No picture yet: no frame, no placeholder, and no description of a picture that is not there.
    await expect(picture).toHaveCount(0);
    expect(await page.locator("main").innerHTML()).not.toContain(said);
  });

  for (const width of [390, 820, 1440]) {
    test(`at ${width} px every label inside a screen is whole: in its stage, with nothing lying over it`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      const cut = await page.locator("#get .card__stage").evaluateAll((stages) =>
        stages.flatMap((stage) => {
          stage.scrollIntoView({ block: "center" });
          const frame = stage.getBoundingClientRect();
          return [...stage.querySelectorAll<HTMLElement>(".cap")].flatMap((label) => {
            const box = label.getBoundingClientRect();
            const inside =
              box.left >= frame.left - 1 &&
              box.right <= frame.right + 1 &&
              box.top >= frame.top - 1 &&
              box.bottom <= frame.bottom + 1;
            const top = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            const clear = !!top && (label.contains(top) || top.contains(label));
            return inside && clear
              ? []
              : [`${label.textContent!.trim()}: ${inside ? "covered" : "cut"}`];
          });
        }),
      );
      expect(cut).toEqual([]);
    });
  }

  test("nothing stands in for a thing that is not there yet", async ({ page }) => {
    await page.goto("/");
    // His own audit is a picture or nothing: no frame stands in for it.
    await expect(page.locator("main .final__audit")).toHaveCount(has("audit") ? 1 : 0);
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

  test("an apply button closes sections 5, 8 and 10, and each opens the same form", async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/");
    for (const [n, id] of [
      [5, "get"],
      [8, "bonuses"],
      [10, "fit"],
    ] as const) {
      const strip = page.locator(`#${id} .strip`);
      await expect(strip).toHaveCount(1);
      await expect(strip.locator("p")).toHaveText(section(n).get("apply strip"));
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

  test("three packages side by side: the length and size as a label, the name, the outcome, what's in it, then the price and one button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const cards = page.locator("#packages [data-plans] > li");
    await expect(cards).toHaveCount(3);
    const names = Object.values(PACKAGES);
    const boxes = [];
    for (const n of [1, 2, 3]) {
      const card = cards.nth(n - 1);
      await expect(card.locator(".plan__size")).toHaveText(offer.get(`package ${n}, size`));
      await expect(card.locator("h3.plan__name")).toHaveText(names[n - 1]!);
      await expect(card.locator(".plan__outcome")).toHaveText(offer.get(`package ${n}, outcome`));
      await expect(card.locator(".plan__items li")).toHaveText(
        offer.list(`package ${n}, item `).map(({ words }) => words),
      );
      expect(squash(await card.locator(".plan__price").textContent())).toBe(
        squash(offer.get(`package ${n}, price`) + offer.get(`package ${n}, price after`)),
      );
      // One button, and it tells the form which package it was.
      const button = card.locator("a, button");
      await expect(button).toHaveCount(1);
      await expect(button).toHaveText(offer.get(`package ${n}, button`));
      await expect(button).toHaveAttribute("data-package", names[n - 1]!);
      // Two parts split by a line: the price and the button are the footer, under what's in it.
      const items = (await card.locator(".plan__items").boundingBox())!;
      const foot = (await card.locator(".plan__foot").boundingBox())!;
      expect(foot.y).toBeGreaterThanOrEqual(items.y + items.height);
      expect(
        parseFloat(
          await card.locator(".plan__foot").evaluate((el) => getComputedStyle(el).borderTopWidth),
        ),
      ).toBeGreaterThan(0);
      // The figure is the largest thing in the footer; "Then" is small.
      const px = (selector: string) =>
        card.locator(selector).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(await px(".plan__price b")).toBeGreaterThan(1.8 * (await px(".plan__price small")));
      boxes.push((await card.boundingBox())!);
    }
    // In one row, in the deck's order.
    expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x + boxes[0]!.width - 1);
    expect(boxes[2]!.x).toBeGreaterThan(boxes[1]!.x + boxes[1]!.width - 1);
    // Only the middle one is marked: the badge, taller than its neighbours, and the one filled button.
    await expect(cards.locator(".plan__badge")).toHaveCount(1);
    await expect(cards.nth(1).locator(".plan__badge")).toHaveText(offer.get("package 2, badge"));
    expect(boxes[1]!.y).toBeLessThan(boxes[0]!.y);
    expect(boxes[1]!.height).toBeGreaterThan(boxes[0]!.height);
    expect(boxes[0]!.height).toBe(boxes[2]!.height);
    const fills = await cards
      .locator(".plan__btn")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    const clear = /rgba?\(0, 0, 0, 0\)|transparent/;
    expect(fills.map((fill) => !clear.test(fill))).toEqual([false, true, false]);
    // No tabs on a wide screen: the three stand together.
    await expect(page.locator("#packages [data-plans-tabs]")).toBeHidden();
    // The badge says "Recommended".
    await expect(cards.nth(1).locator(".plan__badge")).toHaveText("Recommended");
    expect(await page.locator("body").textContent()).not.toMatch(/most popular/i);
    // Nothing under the cards: they are the last thing in their section.
    expect(
      await page
        .locator("#packages")
        .evaluate((el) => el.lastElementChild!.hasAttribute("data-plans-box")),
    ).toBe(true);
    await expect(
      page.locator("#packages .plans__under, #packages .founding, .founding"),
    ).toHaveCount(0);
    // The names are the card titles, and the names the deck gave.
    expect(names).toEqual(["Pilot", "Season One", "Full Season"]);
    // No hired-out stack, no totals, no product card and no count of places in this section.
    await expect(
      page.locator(
        "#packages [data-ledger], #packages [data-sums], #packages [data-product], #packages [data-sample], #packages .founding__line",
      ),
    ).toHaveCount(0);
    expect(await page.locator("#packages").textContent()).not.toMatch(/hired|4,160|4,715|4,890/i);
  });

  test("a package's button opens the form and tells it which package", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await stub(page);
    await page.goto("/");
    await press(page.locator('#packages [data-plan="3"] [data-apply-open]'));
    await expect(popup(page)).toBeVisible();
    expect((await opened(page)).at(-1)!.hiddenFields).toEqual({ package: PACKAGES.p36 });
    // A button that belongs to no package says nothing about one.
    await press(page.locator("[data-tally-close]"));
    await press(page.locator("#bonuses .strip [data-apply-open]"));
    await expect(popup(page)).toBeVisible();
    expect((await opened(page)).at(-1)!.hiddenFields).toEqual({});
  });

  test("the bonuses are their own block after Say It Plain: white cards with the arc mark, no dollar value", async ({
    page,
  }) => {
    await page.goto("/");
    const block = page.locator("#bonuses");
    expect(await block.evaluate((el) => (el.previousElementSibling as HTMLElement).id)).toBe(
      "say-it-plain",
    );
    await expect(block.locator("h2")).toHaveText(offer.get("bonus title"));
    const items = block.locator("[data-bonuses] > li");
    await expect(items).toHaveCount(4);
    await expect(items.locator(".bonus__value")).toHaveText(
      Array.from({ length: 4 }, () => "Included"),
    );
    expect(await block.textContent()).not.toMatch(/USD|\$/);
    const paper = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
    const tones = [];
    for (const n of [1, 2, 3, 4]) {
      const item = items.nth(n - 1);
      await expect(item.locator(".bonus__name")).toHaveText(offer.get(`bonus ${n}, name`));
      await expect(item.locator(".bonus__body")).toHaveText(offer.get(`bonus ${n}, body`));
      // The line saying which packages hold it.
      await expect(item.locator(".bonus__held")).toHaveText(offer.get(`bonus ${n}, with`));
      // A white card on the paper, with a pastel square that holds the arc mark, left of the name.
      expect(await item.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(paper);
      const cover = item.locator(".bonus__cover");
      await expect(cover.locator("svg path")).toHaveCount(2);
      await expect(cover).toHaveAttribute("aria-hidden", "true");
      const tone = await cover.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(tone).not.toMatch(/rgba?\(0, 0, 0, 0\)|transparent/);
      tones.push(tone);
      const square = (await cover.boundingBox())!;
      const name = (await item.locator(".bonus__name").boundingBox())!;
      expect(Math.abs(square.width - square.height)).toBeLessThan(1);
      expect(name.x).toBeGreaterThan(square.x + square.width - 1);
      // The name, then the body, then who gets it.
      const body = (await item.locator(".bonus__body").boundingBox())!;
      const held = (await item.locator(".bonus__held").boundingBox())!;
      expect(body.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
      expect(held.y).toBeGreaterThanOrEqual(body.y + body.height - 1);
    }
    // Four squares, four tones.
    expect(new Set(tones).size).toBe(4);
    // No bonus is left inside the packages section.
    await expect(page.locator("#packages [data-bonuses], #packages .bonus")).toHaveCount(0);
  });

  test("Say It Plain is short, right under the cards: three steps beside one sample, five things inside", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const plain = section("8b. say it plain");
    const block = page.locator("#say-it-plain");
    expect(
      await block.evaluate((el) => (el.previousElementSibling as HTMLElement | null)?.id),
    ).toBe("packages");
    await expect(block.locator(".label")).toHaveText(PRODUCT);
    await expect(block.locator("h2")).toHaveText(plain.get("heading"));
    await expect(block.locator(".compass__line")).toHaveText(plain.get("line"));
    // The three steps, numbered.
    const steps = block.locator("[data-plain-steps] > li");
    await expect(steps.locator("span")).toHaveText(plain.list("step ").map(({ words }) => words));
    await expect(steps.locator("b")).toHaveText(["1", "2", "3"]);
    // One sample screen beside them: a drawing, marked as a sample the whole time, and not read out.
    const screens = block.locator("figure[data-sample]");
    await expect(screens).toHaveCount(1);
    await expect(page.locator("figure.ts")).toHaveCount(1);
    await expect(screens).toHaveAttribute("aria-hidden", "true");
    await expect(screens.locator(".ts__tag")).toHaveText(samples.tag);
    await expect(screens.locator(".ts__tag")).toBeVisible();
    await expect(block.locator(".compass__note")).toHaveText(plain.get("samples note"));
    const stepsBox = (await block.locator("[data-plain-steps]").boundingBox())!;
    const stage = (await block.locator(".compass__stage").boundingBox())!;
    expect(stage.x).toBeGreaterThan(stepsBox.x + stepsBox.width);
    expect(Math.abs(stage.y - stepsBox.y)).toBeLessThan(2);
    // What's inside: one short list of five, under the steps.
    await expect(block.locator(".compass__inside h3")).toHaveText(plain.get("inside title"));
    await expect(block.locator("[data-inside] > li")).toHaveText(
      [1, 2, 3, 4, 5].map((n) => plain.get(`inside ${n}`)),
    );
    const inside = (await block.locator(".compass__inside").boundingBox())!;
    expect(inside.y).toBeGreaterThanOrEqual(stepsBox.y + stepsBox.height);
    // About one screen high at 1440.
    expect((await block.boundingBox())!.height).toBeLessThanOrEqual(900);
    // The Claude and ChatGPT marks sit beside the small line, and the credit line is under it.
    const foot = block.locator(".compass__foot");
    await expect(foot.locator(".compass__small p")).toHaveText([
      plain.get("small line"),
      plain.get("credit"),
    ]);
    const marks = foot.locator(".marks__disc img");
    await expect(marks).toHaveCount(2);
    for (const mark of await marks.all())
      expect(
        await mark.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      ).toBe(true);
    const disc = (await foot.locator(".marks").boundingBox())!;
    const line = (await foot.locator(".compass__small").boundingBox())!;
    expect(line.x).toBeGreaterThan(disc.x + disc.width - 1);
    expect(disc.y + disc.height / 2).toBeGreaterThan(line.y);
    expect(disc.y + disc.height / 2).toBeLessThan(line.y + line.height);
    // The marks are in two places only: the first screen's second button, and here.
    await expect(page.locator(".marks")).toHaveCount(2);
    // The five-tools grid and its other screens are gone, and every name is filled in.
    await expect(
      page.locator("[data-tools], .tool, [data-tool-screen], [data-product]"),
    ).toHaveCount(0);
    expect(await page.locator("body").textContent()).not.toMatch(/\{(product|p12|p24|p36)\}/);
  });

  test("on a phone the sample sits under the steps, and what's inside under the sample", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const block = page.locator("#say-it-plain");
    const tops = [];
    for (const part of [
      "[data-plain-steps]",
      ".compass__stage",
      ".compass__inside",
      ".compass__foot",
    ]) {
      const box = (await block.locator(part).boundingBox())!;
      tops.push(box.y);
      expect(box.width, part).toBeGreaterThan(300);
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
  });

  test("the script's sample: an idea, three angles with one picked, the opening line, ten checks", async ({
    page,
  }) => {
    await page.goto("/");
    const sample = page.locator("#say-it-plain figure[data-sample]");
    await expect(sample.locator(".ts__said")).toHaveText(samples.script.idea);
    const angles = sample.locator(".ts__angles li");
    await expect(angles).toHaveText(samples.script.angles.map((angle, n) => `${n + 1}${angle}`));
    // The picked angle is the video's title.
    const picked = angles.filter({ has: page.locator(".ts__pick") });
    await expect(picked).toHaveCount(1);
    await expect(sample.locator(".ts__draft")).toContainText(
      (await picked.locator("span").textContent())!,
    );
    await expect(sample.locator(".ts__draft")).toContainText(samples.script.opening);
    await expect(sample.locator(".ts__checks li")).toHaveText(samples.script.checks);
    await expect(sample.locator(".ts__end")).toContainText(samples.script.result);
    await expect(sample.locator(".ts__end .ts__badge")).toHaveText(samples.script.ready);
    // With less motion every sample shows finished: every part is there to read.
    for (const part of await sample.locator("[data-at].pop").all())
      await expect(part).toHaveCSS("opacity", "1");
    // No date is on a sample.
    expect(await page.locator("#say-it-plain").textContent()).not.toMatch(
      /\b20\d\d\b|\b(day|week)s? \d/i,
    );
  });

  for (const width of [390, 820, 1440]) {
    test(`at ${width} px nothing inside the sample screen is cut off`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const cut = await page.locator("#say-it-plain figure[data-sample]").evaluateAll((screens) =>
        screens.flatMap((screen) => {
          const body = screen.querySelector<HTMLElement>(".ts__body")!;
          const frame = body.getBoundingClientRect();
          const out = [...body.querySelectorAll<HTMLElement>("*")].filter((part) => {
            const box = part.getBoundingClientRect();
            return (
              box.width > 0 &&
              (box.right > frame.right + 1 ||
                box.bottom > frame.bottom + 1 ||
                box.left < frame.left - 1)
            );
          });
          const bar = screen.querySelector<HTMLElement>(".ts__bar")!;
          return [
            ...out.map((part) => part.className || part.tagName),
            ...(bar.scrollWidth > bar.clientWidth + 1 ? ["bar"] : []),
          ];
        }),
      );
      expect(cut).toEqual([]);
    });
  }

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
    await expect(rows).toHaveCount(10);
    await expect(rows.first()).toHaveAttribute("open", "");
    // Question 1 holds its own answer only (not question 10's).
    await expect(rows.first()).not.toContainText(section(11).get("answer 10"));
    await expect(page.locator("#questions details[open]")).toHaveCount(1);
    await press(rows.nth(5).locator("summary"));
    await expect(rows.nth(5)).toHaveAttribute("open", "");
    await expect(rows.nth(5)).toContainText(section(11).get("answer 6"));
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
    // Three sections are a surface: how it works, the guarantee and the last panel. The rest is paper.
    expect(sections.filter((section) => section.painted).map((section) => section.id)).toEqual([
      "how",
      "guarantee",
      "apply",
    ]);
    for (const { id, painted, width } of sections)
      if (painted) expect(width, id).toBeLessThan(1440 - 16);
  });
});

test.describe("the home page in motion", () => {
  test("the picture draws itself as How it works comes on screen", async ({ page }) => {
    await page.goto("/");
    const flow = page.locator("#how [data-flow]");
    await expect(flow).not.toHaveClass(/is-in/);
    await flow.scrollIntoViewIfNeeded();
    await expect(flow).toHaveClass(/is-in/);
  });

  test("on a wide screen the five steps take turns, until someone picks one", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, "On a phone the five steps are all open");
    await page.goto("/");
    const list = page.locator("#how [data-steps]");
    await list.scrollIntoViewIfNeeded();
    await expect(list).toHaveAttribute("data-active", "2", { timeout: 9000 });
    await press(list.locator("> li").nth(4).locator("button"));
    await expect(list).toHaveAttribute("data-active", "5");
    await expect(list).not.toHaveClass(/is-turning/);
    await page.waitForTimeout(5600);
    await expect(list).toHaveAttribute("data-active", "5");
  });

  test("the film starts by itself without sound, and one button turns the sound on from the top", async ({
    page,
  }) => {
    await page.goto("/demo/vsl/");
    const slot = page.locator("#top [data-vsl]");
    const film = slot.locator("video");
    const state = () =>
      film.evaluate((el: HTMLVideoElement) => ({
        muted: el.muted,
        paused: el.paused,
        controls: el.controls,
        time: el.currentTime,
      }));
    const sound = slot.locator("[data-vsl-sound]");
    await expect(sound).toBeVisible();
    await expect(slot).toHaveClass(/is-playing/);
    await expect.poll(async () => (await state()).time).toBeGreaterThan(0.3);
    expect(await state()).toMatchObject({ muted: true, paused: false, controls: false });
    // The button covers the frame, so a press anywhere on the film turns the sound on.
    const [frame, box] = await Promise.all([slot.boundingBox(), sound.boundingBox()]);
    expect(Math.round(box!.width)).toBe(Math.round(frame!.width));
    await expect(sound).toHaveAttribute(
      "aria-label",
      section(1).get("video, sound button, words for a screen reader"),
    );
    const before = (await state()).time;
    await press(sound);
    await expect(sound).toBeHidden();
    await expect.poll(async () => (await state()).paused).toBe(false);
    const after = await state();
    expect(after).toMatchObject({ muted: false, controls: true });
    expect(after.time).toBeLessThan(before);
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

test.describe("the packages on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  test("three tabs, the marked package open on arrival, one card at a time, with no script needed", async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/");
    const tabs = page.locator("#packages [data-plans-tabs] label");
    const cards = page.locator("#packages [data-plans] > li");
    const showing = async (open: number) => {
      for (const n of [0, 1, 2])
        if (n === open) await expect(cards.nth(n)).toBeVisible();
        else await expect(cards.nth(n)).toBeHidden();
    };
    // A tab reads the package's length, so the name is said once: in the card under it.
    const lengths = [1, 2, 3].map((n) => offer.get(`package ${n}, size`).split(",")[0]!);
    expect(lengths).toEqual(["21 days", "8 weeks", "12 weeks"]);
    await expect(tabs).toHaveText(lengths);
    await expect(cards.nth(1).locator("h3.plan__name")).toHaveText(PACKAGES.p24);
    await expect(cards.nth(1).locator(".plan__size")).toHaveText(offer.get("package 2, size"));
    // The tabs are one group, named by the section's heading, in one row above the card.
    await expect(page.getByRole("radiogroup", { name: offer.get("heading") })).toBeVisible();
    const tops = await tabs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
    await expect(tabs.nth(1).locator("input")).toBeChecked();
    await showing(1);
    await expect(cards.nth(1).locator(".plan__badge")).toHaveText(offer.get("package 2, badge"));
    await press(tabs.nth(0));
    await showing(0);
    await press(tabs.nth(2));
    await showing(2);
    // The open card's button tells the form which package it is.
    await press(cards.nth(2).locator("[data-apply-open]"));
    await expect(popup(page)).toBeVisible();
    expect((await opened(page)).at(-1)!.hiddenFields).toEqual({ package: PACKAGES.p36 });
  });
});

test.describe("the packages on a phone, without JavaScript", () => {
  test.use({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  test("the tabs still change the card", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("#packages [data-plans] > li");
    await expect(cards.nth(1)).toBeVisible();
    await page.locator("#packages [data-plans-tabs] label").nth(0).click();
    await expect(cards.nth(0)).toBeVisible();
    await expect(cards.nth(1)).toBeHidden();
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
    test(`${width} x 650, with a film: the headline and the apply button show without scrolling, the video begins under them`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 650 });
      await page.goto("/demo/vsl/");
      for (const selector of ["h1", "#top [data-cta]"])
        await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
      await expect(page.locator("#top [data-vsl]")).toBeVisible();
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

test.describe("the first screen's trail", () => {
  const squares = "#top [data-trail] i";
  test("soft square pixels follow the pointer and fade out; on a touch screen they drift by themselves", async ({
    page,
  }) => {
    await page.goto("/");
    const trail = page.locator("#top [data-trail]");
    await expect(trail).toHaveAttribute("aria-hidden", "true");
    const touch = await page.evaluate(() => matchMedia("(hover: none)").matches);
    if (touch) {
      // Nothing was touched: the trail moves by itself, slowly.
      await expect.poll(() => page.locator(squares).count(), { timeout: 6000 }).toBeGreaterThan(0);
      await page.waitForTimeout(1200);
      expect(await page.locator(squares).count()).toBeLessThan(40);
    } else {
      await expect(page.locator(squares)).toHaveCount(0);
      const box = (await page.locator("#top").boundingBox())!;
      for (let step = 0; step <= 12; step++)
        await page.mouse.move(box.x + 80 + step * 60, box.y + 200 + step * 12);
      const drawn = await page.locator(squares).count();
      expect(drawn).toBeGreaterThan(5);
      // Each is a blurred square in one of the page's own colors, behind the words, and cannot be pressed.
      const look = await page
        .locator(squares)
        .first()
        .evaluate((el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return { blur: style.filter, ratio: box.width / box.height, events: style.pointerEvents };
        });
      expect(look.blur).toMatch(/blur\(/);
      expect(look.ratio).toBeCloseTo(1, 1);
      expect(look.events).toBe("none");
      expect(
        await page.evaluate(() => {
          const h1 = document.querySelector("h1")!.getBoundingClientRect();
          const hit = document.elementFromPoint(h1.left + h1.width / 2, h1.top + h1.height / 2);
          return !!hit?.closest("h1");
        }),
      ).toBe(true);
      // The pointer rests: the trail fades away and leaves nothing behind.
      await expect.poll(() => page.locator(squares).count(), { timeout: 6000 }).toBe(0);
    }
  });

  test("with reduced motion the trail stands still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#top [data-trail]")).toHaveClass(/trail--still/);
    const before = await page
      .locator(squares)
      .evaluateAll((els) => els.map((el) => el.getAttribute("style")));
    expect(before.length).toBeGreaterThan(3);
    const box = (await page.locator("#top").boundingBox())!;
    for (let step = 0; step <= 8; step++)
      await page.mouse.move(box.x + 60 + step * 30, box.y + 240);
    await page.waitForTimeout(600);
    expect(
      await page.locator(squares).evaluateAll((els) => els.map((el) => el.getAttribute("style"))),
    ).toEqual(before);
    expect(
      await page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.playState === "running").length,
      ),
    ).toBe(0);
  });

  test("without scripts there is no trail, and the first screen is whole", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(squares)).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#top [data-see]")).toBeVisible();
    await context.close();
  });
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

  test("the script's sample plays: the idea is typed, an angle is picked, ten checks tick one by one", async ({
    page,
  }) => {
    await page.goto("/");
    const sample = page.locator("#say-it-plain figure[data-sample][data-loop]");
    await sample.scrollIntoViewIfNeeded();
    await expect(sample).toHaveClass(/is-looping/);
    const ticked = () => sample.locator(".ts__checks li.on").count();
    // Some checks are ticked before all of them are.
    await expect.poll(ticked, { timeout: 20000 }).toBeGreaterThan(2);
    expect(await ticked()).toBeLessThan(10);
    await expect.poll(ticked, { timeout: 20000 }).toBe(10);
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
