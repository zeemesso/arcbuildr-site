import { existsSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PACKAGES, PRODUCT, founding, section } from "../src/content/deck";
import { page as words } from "../src/content/site";
import { FOUNDER_PHOTO, VSL_VIDEO } from "../src/config";
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
  [7, "water"],
  [8, "packages"],
  [9, "guarantee"],
  [10, "fit"],
  [11, "questions"],
  ["the apply window", "apply"],
];
/**
 * Section 6, the gallery, is on the page only once its twelve real pieces exist. The pieces are files in
 * src/content/proof/, which git ignores, so this is false until `node scripts/proof/import.mjs` brings
 * them in. One line of section 7 points at that work and waits with it.
 */
const PROOF = "src/content/proof";
const has = (id: string) => existsSync(`${PROOF}/${id}.json`);
const workOn = [1, 2, 3, 4].every((tab) => [1, 2, 3].every((n) => has(`gallery-${tab}-${n}`)));
const readingOn = workOn && has("script-1-full");
/** A line the page holds back, with the reason. */
const waits = (key: number | string, slot: string) =>
  (key === 7 && slot === "free 3" && !readingOn) ||
  // The video's own line is on the page only with a film to play.
  (key === 1 && slot.startsWith("video, ") && !VSL_VIDEO);
/**
 * A line the page places by design, out of the deck's order: a card's screen and its labels come before
 * its words, a tag and a badge sit above the name they belong to, a package's price is in its footer,
 * and the product's sample stands beside its words.
 */
const placed = (key: number | string, slot: string) =>
  key === 1 ||
  key === 7 ||
  (key === 4 && /, tag$/.test(slot)) ||
  (key === 5 && /, (label \d|tags)$/.test(slot)) ||
  (key === 8 && /^(package \d, (badge|price|price after)|bonus \d, with|sample, .+)$/.test(slot));
/** A line the deck writes for a screen reader: a picture's description or a button's name, never shown. */
const unseen = (slot: string) => /, words for a screen reader$/.test(slot);
/** A line the page shows one sentence at a time, each in its own row. */
const split = (slot: string) => /, tags$|^sample, angles$/.test(slot);
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
    // Who is speaking: one line, with his photo only once a real one exists. Never initials, never a drawing.
    const who = top.locator("[data-who]");
    await expect(who).toHaveText(first.get("who, with his photo once it exists"));
    await expect(who.locator("img")).toHaveCount(FOUNDER_PHOTO || has("founder-photo") ? 1 : 0);
    await expect(who.locator("svg, canvas, .initials")).toHaveCount(0);
    // One button, no second action, and no price.
    await expect(top.locator("a:visible, button:visible")).toHaveCount(VSL_VIDEO ? 2 : 1);
    expect(await top.textContent()).not.toMatch(/USD|\$/);
    // From top to bottom, in that order.
    const order = [".label", "h1", ".first__line", "[data-cta]", "[data-who]", ".first__under"];
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
    // "Who directs it" is gone: no section and no link to it.
    await expect(page.locator('#who, a[href$="#who"]')).toHaveCount(0);
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
      const scope = id === "top" ? page.locator("#top, [data-wins]") : page.locator(`#${id}`);
      const text = squash((await scope.allTextContents()).join(" "));
      const body = squash(await page.locator("main").textContent());
      let from = 0;
      for (const { slot, words } of section(key).list("")) {
        // A note for a real piece has no words of its own. A gallery tab shows only once it has a piece.
        if (!words || /^tab \d/.test(slot)) continue;
        // A line written for a screen reader names a picture or a button: it is not text on the page.
        if (unseen(slot)) continue;
        const said = squash(founding(words));
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

  test("the header links to how it works, what you get, the packages and the questions, each by its own label", async ({
    page,
  }) => {
    // On a phone the links are in the page and out of sight: the header keeps only the logo and the button.
    await page.goto("/");
    const links = page.locator("header nav a");
    await expect(links).toHaveText(
      [4, 5, 8, 11].map((n) => section(n).get("label")),
      { ignoreCase: true },
    );
    expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")))).toEqual([
      "#how",
      "#get",
      "#packages",
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
    expect(text).not.toContain(squash(first.get("video, poster, only once the film exists")));
    expect(text).not.toContain("Watchthisfirst");
    // The button follows the line with no hole where the video would be.
    const line = (await top.locator(".first__line").boundingBox())!;
    const button = (await top.locator("[data-cta]").boundingBox())!;
    expect(button.y - (line.y + line.height)).toBeLessThan(64);
  });

  for (const path of ["/demo/vsl/", "/?vsl=demo"]) {
    test(`the video block, with a test film (${path}): no label, 16:9, the poster line, a play button that plays`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForURL(/\/demo\/vsl\/$/);
      const top = page.locator("#top");
      await expect(top.locator(".first__cue")).toHaveCount(0);
      const slot = top.locator("[data-vsl]");
      const box = (await slot.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
      await expect(slot.locator(".vsl__who")).toHaveText(
        first.get("video, poster, only once the film exists"),
      );
      // The video comes after the headline and before the button.
      const headline = (await page.locator("h1").boundingBox())!;
      const button = (await top.locator("[data-cta]").boundingBox())!;
      expect(box.y).toBeGreaterThan(headline.y + headline.height - 1);
      expect(button.y).toBeGreaterThan(box.y + box.height - 1);
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
    const places: [string, string][] = [
      ["#water img.berg__shot", section(7).get("free 2, picture, words for a screen reader")],
      [
        "#apply img.final__audit",
        section("the apply window").get("audit picture, words for a screen reader"),
      ],
    ];
    for (const [where, words] of places) {
      expect(words.length, where).toBeGreaterThan(20);
      if (has("audit")) {
        await expect(page.locator(where)).toHaveAttribute("alt", words);
        continue;
      }
      // No picture yet: no frame, no placeholder, and no description of a picture that is not there.
      await expect(page.locator(where)).toHaveCount(0);
      expect(await page.locator("main").innerHTML()).not.toContain(words);
    }
  });

  for (const width of [390, 820, 1440]) {
    test(`at ${width} px every label inside a screen is whole: in its stage, with nothing lying over it`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      const cut = await page
        .locator("#get .card__stage, #packages [data-sample]")
        .evaluateAll((stages) =>
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

  test("the lines that point at the work wait for it: nothing stands above an empty place", async ({
    page,
  }) => {
    test.skip(workOn, "The twelve real pieces are in");
    await page.goto("/");
    const text = squash(await page.locator("body").textContent());
    expect(text).not.toContain(squash(section(7).get("free 3")));
    await expect(page.locator("#water .berg__items--free li")).toHaveCount(2);
    // His own audit is a picture or nothing: no frame stands in for it.
    await expect(page.locator("main .berg__shot, main .final__audit")).toHaveCount(
      has("audit") ? 2 : 0,
    );
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
      [8, "packages"],
      [10, "fit"],
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

  test("three packages side by side: a size label, the name, the outcome, what's in it, then the price and one button", async ({
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
    // The two lines under the cards: the fixed price, and the guarantee.
    await expect(page.locator("#packages .plans__under p")).toHaveText(
      offer.list("under the cards").map(({ words }) => words),
    );
    await expect(page.locator("#packages .founding__line")).toHaveText(
      founding(offer.get("founding line")),
    );
    await expect(page.locator("#packages .founding__line i")).toHaveCount(3);
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
    await press(page.locator("#packages .strip [data-apply-open]"));
    await expect(popup(page)).toBeVisible();
    expect((await opened(page)).at(-1)!.hiddenFields).toEqual({});
  });

  test("the stack: what the same work costs hired out, row by row, then one total for each package", async ({
    page,
  }) => {
    await page.goto("/");
    const rows = page.locator("#packages [data-ledger] > li");
    const deck = offer.list("stack row ");
    await expect(rows).toHaveCount(deck.length);
    // Each row is the deck's row, word for word: its name, and its figure in the figure column.
    for (const [n, { words: row }] of deck.entries())
      expect(squash(await rows.nth(n).textContent()), `row ${n + 1}`).toBe(squash(row));
    await expect(rows.locator(".ledger__value")).toHaveText([
      "1,250 USD",
      "150 USD",
      "1,000 USD",
      "1,760 USD",
      "147 USD",
      "58 USD",
      "175 USD each",
    ]);
    // The note sits under the rows.
    const last = (await rows.last().boundingBox())!;
    const note = page.locator("#packages .offer__note");
    await expect(note).toHaveText(offer.get("stack note"));
    expect((await note.boundingBox())!.y).toBeGreaterThan(last.y + last.height - 1);
    // Three totals, each struck through beside the founding price that replaces it.
    const sums = page.locator("#packages [data-sums] > li");
    await expect(sums).toHaveCount(3);
    await expect(sums.locator(".sum__name")).toHaveText(Object.values(PACKAGES));
    await expect(sums.locator(".sum__total")).toHaveText(["4,160 USD", "4,715 USD", "4,890 USD"]);
    await expect(sums.locator(".sum__price b")).toHaveText(["750 USD", "1,000 USD", "1,250 USD"]);
    for (const [n, sum] of (await sums.all()).entries()) {
      expect(squash(await sum.textContent())).toBe(
        squash(offer.get(`stack total, package ${n + 1}`)),
      );
      await expect(sum.locator(".sum__total")).toHaveCSS("text-decoration-line", "line-through");
      const px = (selector: string) =>
        sum.locator(selector).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(await px(".sum__price b")).toBeGreaterThan(await px(".sum__total"));
    }
    await expect(page.locator("#packages .sum__note")).toHaveText(
      offer.get("line under the stack"),
    );
  });

  test("the bonuses: each with its name, its value, the packages that hold it and what it does", async ({
    page,
  }) => {
    await page.goto("/");
    const items = page.locator("#packages [data-bonuses] > li");
    await expect(items).toHaveCount(4);
    await expect(items.locator(".bonus__value")).toHaveText([
      "58 USD",
      "175 USD each",
      "Included",
      "Included",
    ]);
    for (const n of [1, 2, 3, 4]) {
      const item = items.nth(n - 1);
      await expect(item.locator(".bonus__name")).toHaveText(offer.get(`bonus ${n}, name`));
      await expect(item.locator(".bonus__held")).toHaveText(offer.get(`bonus ${n}, with`));
      await expect(item.locator(".bonus__body")).toHaveText(offer.get(`bonus ${n}, body`));
    }
  });

  test("the product is a card of its own: its label, its name, its value, the flow, the sample, eight things inside", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.locator("#packages [data-product]");
    await expect(card).toHaveCount(1);
    await expect(card.locator(".product__label")).toHaveText(offer.get("add-on, label"));
    const name = card.locator(".product__name");
    await expect(name).toHaveText(PRODUCT);
    const lines = await name.evaluate(
      (el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
    );
    expect(Math.round(lines)).toBe(1);
    await expect(card.locator(".product__value")).toContainText("147 USD");
    // It has its own frame: a surface that is not the page's paper.
    expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toMatch(
      /rgba?\(0, 0, 0, 0\)|transparent/,
    );
    // The flow: an idea in your own words, the piece, ten checks. Each a small drawing and the deck's line.
    const flow = card.locator("[data-flow-picture] li");
    await expect(flow).toHaveCount(3);
    for (const n of [1, 2, 3]) {
      await expect(flow.nth(n - 1)).toHaveText(offer.get(`flow ${n}`));
      await expect(flow.nth(n - 1).locator(".pflow__pic")).toBeVisible();
    }
    const inside = card.locator(".product__inside li");
    await expect(inside).toHaveCount(8);
    for (const [n, { words }] of offer.list("inside ").entries())
      expect(squash(await inside.nth(n).textContent())).toBe(squash(words));
    // The line on what it needs stays small: the smallest words of the card.
    const px = (selector: string) =>
      card
        .locator(selector)
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // The small line, and right under it, in the same type, the credit for buying it alone first.
    await expect(card.locator(".product__small p")).toHaveText([
      offer.get("add-on, small line"),
      offer.get("add-on, credit"),
    ]);
    expect(await px(".product__small")).toBeLessThan(await px(".product__body"));
    expect(await px(".product__small")).toBeLessThanOrEqual(await px(".product__inside li"));
    // ChatGPT and Claude are named in words only: no mark of either company, anywhere in the card.
    await expect(card.locator("img")).toHaveCount(0);
    expect(
      await card.locator("svg").evaluateAll((els) => els.map((el) => el.outerHTML)),
    ).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/claude|openai|chatgpt|anthropic/i)]),
    );
    // The names are filled in wherever a line calls for them.
    expect(await page.locator("body").textContent()).not.toMatch(/\{(product|p12|p24|p36)\}/);
  });

  test("the sample: an idea, three angles with one picked, the piece, ten checks, marked as a sample", async ({
    page,
  }) => {
    await page.goto("/");
    const sample = page.locator("#packages [data-sample]");
    await expect(sample).toHaveCount(1);
    // The tag and the note stay on it: nobody takes it for a client's.
    await expect(sample.locator(".sample__top")).toContainText(offer.get("sample, tag"));
    await expect(sample.locator(".sample__top")).toContainText(offer.get("sample, note"));
    await expect(sample.locator(".sample__said")).toHaveText(offer.get("sample, idea"));
    const angles = sample.locator(".sample__angles li");
    await expect(angles).toHaveCount(3);
    // The picked angle is the piece's title.
    const picked = angles.filter({ has: page.locator(".sample__pick") });
    await expect(picked).toHaveCount(1);
    await expect(picked).toContainText(offer.get("sample, piece title"));
    await expect(sample.locator(".sample__piece")).toContainText(offer.get("sample, piece title"));
    await expect(sample.locator(".sample__piece")).toContainText(offer.get("sample, opening"));
    await expect(sample.locator(".sample__checks li")).toHaveCount(10);
    await expect(sample.locator(".sample__end")).toContainText(offer.get("sample, result"));
    await expect(sample.locator(".sample__badge")).toHaveText(offer.get("sample, badge"));
    // With less motion it shows finished: every part is there to read.
    for (const part of await sample.locator("[data-at]").all())
      await expect(part).toHaveCSS("opacity", "1");
  });

  test("the iceberg explains every band, each tied to its line by its color", async ({ page }) => {
    await page.goto("/");
    const bands = page.locator("#water .berg-band");
    const names = page.locator("#water .berg-name");
    const lines = page.locator("#water .berg__items li[data-band]");
    await expect(bands).toHaveCount(9);
    await expect(lines).toHaveCount(9);
    for (let n = 0; n < 9; n++) {
      // No band has a day. Its number ties the line to its band, in the picture and in the list.
      const words = section(7).get(`band ${n + 1}`);
      const number = String(n + 1).padStart(2, "0");
      expect(squash(await lines.nth(n).textContent())).toBe(squash(number + words));
      await expect(lines.nth(n).locator(".berg__key")).toHaveText(number);
      expect((await names.nth(n).textContent())!.trim()).toBe(number);
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
        .locator(`#water ${selector}`)
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
    for (const band of await page.locator("#water .berg-band").all()) {
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
    await expect(tabs).toHaveText(Object.values(PACKAGES));
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

test.describe("the iceberg on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  test("one picture first, then the list with its color keys", async ({ page }) => {
    await page.goto("/");
    const picture = (await page.locator("#water .berg__pic").boundingBox())!;
    const list = (await page.locator("#water .berg__list").boundingBox())!;
    expect(picture.y + picture.height).toBeLessThanOrEqual(list.y);
    // The picture is one piece, as wide as the window lets it be.
    expect(picture.width).toBeGreaterThan(300);
    for (const key of await page.locator("#water .berg__items li[data-band] .berg__key").all())
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

  test("the product's sample plays too: the idea is typed, an angle is picked, ten checks tick one by one", async ({
    page,
  }) => {
    await page.goto("/");
    const sample = page.locator("#packages [data-sample][data-loop]");
    await sample.scrollIntoViewIfNeeded();
    await expect(sample).toHaveClass(/is-looping/);
    const ticked = () => sample.locator(".sample__checks li.on").count();
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
