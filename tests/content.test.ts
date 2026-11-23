import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import deck from "../src/content/deck.json" with { type: "json" };
import { PACKAGES, PRODUCT, section } from "../src/content/deck";
import { samples } from "../src/content/samples";
import {
  APPLICATION_AFTER_BOOKING_URL,
  APPLICATION_URL,
  BOOKED_PATH,
  BOOKING_URL,
  CHAT_EVENT_SLUG,
  CONFIRMATION_VIDEO,
  CONTACT_EMAIL,
  TALLY_FORM,
  VSL_VIDEO,
} from "../src/config";

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  return [];
}
/** Every word the site can show: the deck's, the few the deck does not hold, and the sample screens'. */
const all = [
  ...strings(content, "site"),
  ...strings(deck.sections, "deck"),
  ...strings(samples, "samples"),
];
/** Say It Plain's own section (5b) and its sample screens: the one place "script" and "AI" are plain words. */
const inPlain = (path: string) => /^(deck\.5b\. say it plain|samples)\./.test(path);
/** A note for a real piece is never shown, so it is not checked as page words. */
const shown = all.map(
  ([path, text]) => [path, text.replace(/\[(?:CLIENT ZERO|ZYADE'S AUDIT):[^\]]*\]/g, "")] as const,
);
/** The privacy page is not the deck's: it names what the site's own code does. */
const page = shown.filter(([path]) => !path.startsWith("site.privacy"));

describe("the words", () => {
  it("name no social platform, and have no long dashes or middle dots", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(
        /instagram|tiktok|linkedin|youtube|facebook|whatsapp|twitter|x\.com|threads|snapchat|pinterest|\breels?\b/i,
      );
      expect(text, path).not.toContain("—");
      expect(text, path).not.toContain("–");
      expect(text, path).not.toContain("·");
    }
  });
  it("never say the words the positioning dropped", () => {
    for (const [path, text] of page) {
      if (!inPlain(path)) expect(text, path).not.toMatch(/\bscripts?\b|\bAI\b/i);
      expect(text, path).not.toMatch(/\bkits?\b|ghostwrit|writers['’] room/i);
      expect(text, path).not.toMatch(/in your voice/i);
    }
    // The section that may say them does say them, so the rule above is about a real difference.
    expect(
      page.filter(([path, text]) => inPlain(path) && /\bscripts?\b/i.test(text)).length,
    ).toBeGreaterThan(0);
    expect(
      page.filter(([path, text]) => inPlain(path) && /\bAI\b/.test(text)).length,
    ).toBeGreaterThan(0);
    // "We don't chase viral." is the one place the word is used.
    const viral = page.filter(([, text]) => /viral/i.test(text));
    expect(viral.map(([, text]) => text)).toEqual(["We don't chase viral."]);
  });
  it("never promise followers or sales: every mention says they are not promised", () => {
    const mentions = shown.flatMap(([path, text]) =>
      text
        .split(/(?<=[.?!])\s+/)
        .filter((sentence) => /followers|\bsales\b/i.test(sentence))
        .map((sentence) => [path, sentence] as const),
    );
    expect(mentions.length).toBeGreaterThan(0);
    for (const [path, sentence] of mentions)
      expect(sentence, path).toMatch(/don't guarantee|guaranteed\.$/);
  });
  it("claim no registered company, and use US spelling", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(/registered|\bLLC\b|\bInc\b|\bLtd\b/i);
      expect(text, path).not.toMatch(
        /colour|favour|behaviour|centre\b|programme|organis|personalis|optimis|recognis|\bwhilst\b|cheque|licence/i,
      );
    }
  });
  it("say no date, no dropped package name and no count of places: a length (8 weeks, 21 days) is not a date", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(/\b(day|week)s? \d/i);
      expect(text, path).not.toMatch(/watch this first/i);
      // The three names dropped on 23 Nov stay dropped. "Season One" is a package's name now.
      expect(text, path).not.toMatch(/\b(Clarity|Recognition|Momentum)\b/);
      // Nothing counts the founding places.
      expect(text, path).not.toMatch(/\d of (3|three)\b/i);
    }
  });
  it("hold no install steps, file names or version numbers", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(
        /\.(md|json|zip|pdf|docx?|txt)\b|\bv\d+\.\d|npm |terminal|install/i,
      );
    }
  });
});

describe("the deck", () => {
  it("has the 11 numbered sections, then the names, Say It Plain (5b), the apply window, the form, the booked page and the head", () => {
    expect(Object.keys(deck.sections)).toEqual([
      ...Array.from({ length: 11 }, (_, n) => String(n + 1)),
      "names",
      "5b. say it plain",
      "the apply window",
      "the form, on tally",
      "the booked page",
      "title and description",
    ]);
  });
  it("keeps the first screen free of any price", () => {
    for (const [slot, text] of strings(deck.sections["1"]))
      expect(text, slot).not.toMatch(/USD|\$/);
  });
  it("gives the first screen three wins and a second button, and no line that waits for a film", () => {
    const first = section(1);
    expect(first.list("win ")).toHaveLength(6);
    expect(first.get("see everything button").length).toBeGreaterThan(0);
    // The frame shows a poster and a play mark with no words; nothing announces a film that is not there.
    for (const slot of [
      "video, label",
      "video, placeholder line",
      "video, poster",
      "video, poster, only once the film exists",
      "who, with his photo once it exists",
      "hanging tab",
    ])
      expect(first.find(slot), slot).toBeUndefined();
    // The film is not made yet: the slot is empty until Zyade sets it.
    expect(typeof VSL_VIDEO).toBe("string");
  });
  it("names the product and the three packages once, and fills them in wherever a line calls for them", () => {
    expect(PRODUCT).toBe("Say It Plain");
    expect(PACKAGES).toEqual({
      p12: "Personal Brand Accelerator",
      p24: "Season One",
      p36: "Season One Extended",
    });
    expect(section("5b. say it plain").get("label")).toBe(PRODUCT);
    expect([1, 2, 3].map((n) => section(8).get(`package ${n}, name`))).toEqual(
      Object.values(PACKAGES),
    );
    for (const [path, text] of strings(content, "site"))
      expect(text, path).not.toMatch(/\{(product|p12|p24|p36)\}/);
    for (const key of Object.keys(deck.sections))
      for (const { slot, words } of section(key).list(""))
        expect(words, `${key} ${slot}`).not.toMatch(/\{(product|p12|p24|p36)\}/);
    expect(section("the form, on tally").get("budget, under 750, line 2")).toContain(PRODUCT);
  });
  it("lays How it works out as You bring, We decide, You get, then five steps", () => {
    const show = section(4);
    for (const slot of ["diagram, left label", "diagram, hub label", "diagram, right label"])
      expect(show.get(slot).length, slot).toBeGreaterThan(0);
    expect(show.list("input ")).toHaveLength(3);
    for (const n of ["01", "02", "03"])
      for (const part of ["name", "plain meaning", "becomes"])
        expect(show.get(`step ${n}, ${part}`).length, `${n} ${part}`).toBeGreaterThan(0);
    expect(show.list("output ").filter(({ slot }) => /^output \d$/.test(slot))).toHaveLength(5);
    // The fifth output comes with the two larger packages only, and its tag says so by name.
    expect(show.get("output 5, tag")).toContain(PACKAGES.p24);
    expect(show.list("step ").filter(({ slot }) => /^step \d$/.test(slot))).toHaveLength(5);
    expect(show.get("chain line").length).toBeGreaterThan(0);
  });
  it("has 7 cards, each with a title, the step it comes from, a body and labels for its screen, and no date", () => {
    const get = section(5);
    for (let n = 1; n <= 7; n++) {
      const card = String(n).padStart(2, "0");
      for (const part of ["title", "from", "body", "label 1", "label 2"])
        expect(get.get(`card ${card}, ${part}`).length, `${card} ${part}`).toBeGreaterThan(0);
      expect(get.find(`card ${card}, date`)).toBeUndefined();
    }
    expect(get.find("card 08, title")).toBeUndefined();
    expect(get.get("card 04, tags")).toBe("Reach. Like. Believe. Buy.");
  });
  it("shows three named packages, the middle one marked, each with its length and size and one button", () => {
    const offer = section(8);
    expect([1, 2, 3].map((n) => offer.get(`package ${n}, name`))).toEqual(Object.values(PACKAGES));
    // The small label above the name: the length, then the size. A phone tab reads the length alone.
    expect([1, 2, 3].map((n) => offer.get(`package ${n}, size`))).toEqual([
      expect.stringMatching(/^\d+ days, 12 videos$/),
      expect.stringMatching(/^\d+ weeks, 24 videos$/),
      expect.stringMatching(/^\d+ weeks, 36 videos$/),
    ]);
    expect([1, 2, 3].map((n) => offer.find(`package ${n}, badge`))).toEqual([
      undefined,
      "Most Popular",
      undefined,
    ]);
    expect([1, 2, 3].map((n) => offer.get(`package ${n}, price`).match(/[\d,]+ USD/)?.[0])).toEqual(
      ["750 USD", "1,000 USD", "1,250 USD"],
    );
    for (const n of [1, 2, 3]) {
      for (const part of ["outcome", "price after", "button"])
        expect(offer.get(`package ${n}, ${part}`).length, `${n} ${part}`).toBeGreaterThan(0);
      // Aesthetory's frame: four lines at most in a card.
      const items = offer.list(`package ${n}, item `);
      expect(items.length, `package ${n}`).toBeGreaterThan(0);
      expect(items.length, `package ${n}`).toBeLessThanOrEqual(4);
    }
    expect(offer.get("package 2, item 2")).toContain(PRODUCT);
    expect(offer.list("under the cards")).toHaveLength(2);
  });
  it("shows four bonuses, and no hired-out stack, product card or count of places in the packages", () => {
    const offer = section(8);
    expect([1, 2, 3, 4].map((n) => offer.get(`bonus ${n}, value`))).toEqual([
      "58 USD",
      "175 USD each",
      "Included",
      "Included",
    ]);
    for (const n of [1, 2, 3, 4])
      for (const part of ["name", "with", "body"])
        expect(offer.get(`bonus ${n}, ${part}`).length).toBeGreaterThan(0);
    for (const gone of [
      "stack",
      "add-on",
      "flow",
      "inside ",
      "sample",
      "founding line",
      "line under the stack",
    ])
      expect(offer.list(gone), gone).toHaveLength(0);
  });
  it("gives Say It Plain its own section: five tools, the samples note, where it runs and the credit", () => {
    const plain = section("5b. say it plain");
    for (const n of [1, 2, 3, 4, 5])
      for (const part of ["title", "line"])
        expect(plain.get(`tool ${n}, ${part}`).length, `${n} ${part}`).toBeGreaterThan(0);
    expect(plain.find("tool 6, title")).toBeUndefined();
    expect(plain.get("line")).toContain("147 USD");
    expect(plain.get("samples note").length).toBeGreaterThan(0);
    // ChatGPT and Claude are named in the line their two marks sit beside.
    expect(plain.get("small line")).toMatch(/ChatGPT.*Claude/);
    expect(plain.get("credit")).toContain("147 USD");
    // The sample screens: three angles, ten checks, and the tag that says the owner is invented.
    expect(samples.tag).toBe("Sample");
    expect(samples.script.angles).toHaveLength(3);
    expect(samples.script.title).toContain(samples.script.angles[0]);
    expect(samples.script.checks).toHaveLength(10);
  });
  it("explains nine bands under the water, and none starts with a day or a week", () => {
    const bands = section(7).list("band ");
    expect(bands).toHaveLength(9);
    for (const { words } of bands) expect(words).not.toMatch(/^(Day|Weeks?|After week)\b/);
    expect(section(7).find("line under it")).toBeUndefined();
  });
  it("puts an apply strip after sections 5, 8 and 10", () => {
    for (const n of [5, 8, 10]) expect(section(n).get("apply strip").length).toBeGreaterThan(0);
    for (const n of [1, 2, 3, 4, 6, 7, 9, 11])
      expect(section(n).find("apply strip")).toBeUndefined();
  });
  it("answers ten questions", () => {
    expect(section(11).list("question ")).toHaveLength(10);
    expect(section(11).list("answer ")).toHaveLength(10);
  });
  it("hides the notes to the build: a real piece or his own audit is never shown as words", () => {
    for (const key of Object.keys(deck.sections))
      for (const { slot, words } of section(key).list(""))
        expect(words, `${key} ${slot}`).not.toMatch(/\[(CLIENT ZERO|ZYADE'S AUDIT)/);
  });
});

describe("the form and what follows it", () => {
  it("knows the 8 questions of the Tally form, after the name and the email", () => {
    const { who, questions } = content.application;
    expect(who.map((step) => step.id)).toEqual(["name", "email"]);
    expect(questions.map((question) => question.id)).toEqual([
      "profile",
      "sell",
      "stranger",
      "film",
      "count",
      "decides",
      "start",
      "budget",
    ]);
    for (const question of questions) {
      expect(question.q.length, question.id).toBeGreaterThan(0);
    }
    expect(questions.at(-1)).toMatchObject({ type: "choice" });
    expect(content.application.send.failed).toContain("still here");
  });
  it("takes each question and choice from the deck", () => {
    const form = section("the form, on tally");
    for (const question of content.application.questions) {
      expect(question.q).toBe(form.get(question.id));
      if (question.type === "choice")
        expect(`${question.options.join(". ")}.`).toBe(form.get(`${question.id}, choices`));
    }
  });
  it("ends without a calendar for the lowest budget, with the deck's three lines", () => {
    const { tooLow, questions } = content.application;
    const budget = questions.find((question) => question.id === "budget")!;
    expect(budget.type === "choice" && budget.options[0]).toBe("Under 750 USD");
    expect(tooLow).toMatchObject({ id: "budget", option: "Under 750 USD" });
    expect(tooLow.lines).toEqual(
      [1, 2, 3].map((n) => section("the form, on tally").get(`budget, under 750, line ${n}`)),
    );
  });
  it("opens the Tally form, and keeps the form for chat bookings on file", () => {
    expect(TALLY_FORM).toBe("M1aKGp");
    expect(APPLICATION_URL).toBe("https://tally.so/r/M1aKGp");
    expect(APPLICATION_AFTER_BOOKING_URL).toBe("https://tally.so/r/9NZpVV");
    expect(BOOKING_URL).toBe("https://cal.com/arcbuildr/15-minute-call");
  });
  it("sends a finished booking to /booked, and a booking made from a chat to the 8 questions", () => {
    expect(BOOKED_PATH).toBe("/booked");
    expect(section("the booked page").get("booked from a chat, button")).toBe(
      "Answer the 8 questions (3 minutes)",
    );
    expect(CHAT_EVENT_SLUG).toBe("15-minute-call-chat");
  });
  it("gives /booked its own video, not the home page's", () => {
    expect(CONFIRMATION_VIDEO).toBe("/video/confirmation.mp4");
    expect(CONFIRMATION_VIDEO).not.toBe(VSL_VIDEO);
  });
  it("carries the lines other documents depend on, word for word", () => {
    expect(section("the booked page").get("booked from a chat, line")).toBe(
      "Messages about your call come from Zyade or Hanane, in the chat you used.",
    );
    expect(section("the apply window").get("button")).toBe("Apply and pick a time");
    expect(content.action).toBe(section("the apply window").get("button"));
    expect(CONTACT_EMAIL).toBe("hello@arcbuildr.co");
  });
});
