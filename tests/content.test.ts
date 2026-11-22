import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import deck from "../src/content/deck.json" with { type: "json" };
import { PACKAGES, PRODUCT, founding, section } from "../src/content/deck";
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
/** Every word the site can show: the deck's, and the few the deck does not hold. */
const all = [...strings(content, "site"), ...strings(deck.sections, "deck")];
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
      expect(text, path).not.toMatch(/\bscripts?\b|\bAI\b|\bkits?\b|ghostwrit|writers['’] room/i);
      expect(text, path).not.toMatch(/in your voice/i);
    }
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
  it("say no Season and no date: a length (8 weeks, 21 days) is not a date", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(/\bseasons?\b/i);
      expect(text, path).not.toMatch(/\b(day|week)s? \d/i);
      expect(text, path).not.toMatch(/watch this first/i);
      // The packages have no names: each is called by its size.
      expect(text, path).not.toMatch(/\b(Clarity|Recognition|Momentum)\b/);
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
  it("has the 11 numbered sections, then the names, the apply window, the form, the booked page and the head", () => {
    expect(Object.keys(deck.sections)).toEqual([
      ...Array.from({ length: 11 }, (_, n) => String(n + 1)),
      "names",
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
  it("gives the first screen three wins, his name line, and a video only once the film exists", () => {
    const first = section(1);
    expect(first.list("win ")).toHaveLength(6);
    expect(first.get("who, with his photo once it exists")).toContain("Zyade");
    expect(first.get("video, poster, only once the film exists").length).toBeGreaterThan(0);
    // Nothing announces a film that is not there.
    for (const slot of ["video, label", "video, placeholder line", "video, poster"])
      expect(first.find(slot), slot).toBeUndefined();
    // The film is not made yet: the slot is empty until Zyade sets it.
    expect(typeof VSL_VIDEO).toBe("string");
  });
  it("names the product and the three packages once, and fills them in wherever a line calls for them", () => {
    expect(PRODUCT).toBe("Say It Plain");
    // A package has no name of its own: it is called by its size.
    expect(PACKAGES).toEqual({ p12: "12 pieces", p24: "24 pieces", p36: "36 pieces" });
    expect(section(8).get("add-on, name")).toBe(PRODUCT);
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
    // The fifth output comes with the two larger packages only, and its tag says so by their sizes.
    expect(show.get("output 5, tag")).toMatch(/24 or 36 pieces/);
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
  it("shows three packages: 12, 24 and 36 pieces, the middle one marked, each with one button", () => {
    const offer = section(8);
    expect([1, 2, 3].map((n) => offer.get(`package ${n}, name`))).toEqual([
      "12 pieces",
      "24 pieces",
      "36 pieces",
    ]);
    // The small label above the name is the package's length.
    for (const n of [1, 2, 3])
      expect(offer.get(`package ${n}, size`)).toMatch(/^\d+ (days|weeks)$/);
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
    expect(founding(offer.get("founding line"))).toMatch(/\d of 3 places left/);
  });
  it("shows the stack: seven priced rows, four bonuses, and one total for each package that adds up", () => {
    const offer = section(8);
    const rows = offer.list("stack row ").map(({ words }) => words);
    expect(rows.map((row) => row.match(/([\d,]+ USD(?: each)?)\.$/)?.[1])).toEqual([
      "1,250 USD",
      "150 USD",
      "1,000 USD",
      "1,760 USD",
      "147 USD",
      "58 USD",
      "175 USD each",
    ]);
    expect([1, 2, 3, 4].map((n) => offer.get(`bonus ${n}, value`))).toEqual([
      "58 USD",
      "175 USD each",
      "Included",
      "Included",
    ]);
    for (const n of [1, 2, 3, 4])
      for (const part of ["name", "with", "body"])
        expect(offer.get(`bonus ${n}, ${part}`).length).toBeGreaterThan(0);
    expect(offer.list("inside ")).toHaveLength(8);
    expect(offer.list("flow ").filter(({ slot }) => /^flow \d$/.test(slot))).toHaveLength(3);
    expect(offer.get("add-on, value")).toContain("147 USD");
    const totals = [1, 2, 3].map((n) => offer.get(`stack total, package ${n}`));
    expect(totals.map((line) => line.match(/[\d,]+ USD/g))).toEqual([
      ["4,160 USD", "750 USD"],
      ["4,715 USD", "1,000 USD"],
      ["4,890 USD", "1,250 USD"],
    ]);
    // The four documents; then the product, the Setup Call and two Group Reviews; then a third review.
    const documents = 1250 + 150 + 1000 + 1760;
    expect(documents).toBe(4160);
    expect(documents + 147 + 58 + 2 * 175).toBe(4715);
    expect(documents + 147 + 58 + 3 * 175).toBe(4890);
  });
  it("shows a sample of the product: an idea, three angles, the piece, ten checks", () => {
    const offer = section(8);
    expect(offer.get("sample, tag")).toBe("Sample");
    expect(offer.get("sample, angles").split(". ")).toHaveLength(3);
    expect(offer.get("sample, angles")).toContain(offer.get("sample, piece title"));
    expect(offer.get("sample, checks").split(". ")).toHaveLength(10);
    // ChatGPT and Claude by name only, in the one line that says where the product runs.
    expect(offer.get("add-on, small line")).toMatch(/ChatGPT.*Claude/);
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
