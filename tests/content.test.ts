import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import deck from "../src/content/deck.json" with { type: "json" };
import { PRODUCT, founding, section } from "../src/content/deck";
import {
  APPLICATION_AFTER_BOOKING_URL,
  APPLICATION_MODE,
  APPLICATION_URL,
  BOOKED_PATH,
  BOOKING_URL,
  CHAT_EVENT_SLUG,
  CONFIRMATION_VIDEO,
  CONTACT_EMAIL,
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
  ([path, text]) => [path, text.replace(/\[CLIENT ZERO:[^\]]*\]/g, "")] as const,
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
  it("hold no install steps, file names or version numbers", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(
        /\.(md|json|zip|pdf|docx?|txt)\b|\bv\d+\.\d|npm |terminal|install/i,
      );
    }
  });
});

describe("the deck", () => {
  it("has the 12 numbered sections, then the names, the apply window, the form, the booked page and the head", () => {
    expect(Object.keys(deck.sections)).toEqual([
      ...Array.from({ length: 12 }, (_, n) => String(n + 1)),
      "names",
      "the apply window",
      "the form",
      "the booked page",
      "title and description",
    ]);
  });
  it("keeps the first screen free of any price", () => {
    for (const [slot, text] of strings(deck.sections["1"]))
      expect(text, slot).not.toMatch(/USD|\$/);
  });
  it("gives the first screen a video with its label, its poster line and its placeholder line, and three wins", () => {
    const first = section(1);
    for (const slot of ["video, label", "video, poster", "video, placeholder line"])
      expect(first.get(slot).length, slot).toBeGreaterThan(0);
    expect(first.list("win ")).toHaveLength(6);
    // Removed by VERDICT-3: no founder line and no line under the wins.
    expect(first.find("founder line")).toBeUndefined();
    expect(first.find("small line under the wins")).toBeUndefined();
    // The film is not made yet: the slot is empty until Zyade sets it.
    expect(typeof VSL_VIDEO).toBe("string");
  });
  it("names the product once, and fills its name in wherever a line calls for it", () => {
    expect(PRODUCT).toBe("Say It Plain");
    expect(section(9).get("add-on, name")).toBe(PRODUCT);
    for (const [path, text] of strings(content, "site"))
      expect(text, path).not.toContain("{product}");
    expect(section("the form").get("budget, under 750, line 2")).toContain(PRODUCT);
  });
  it("builds the framework as a chain: a start, three steps, an end", () => {
    const show = section(4);
    for (const n of ["01", "02", "03"])
      for (const part of ["name", "plain meaning", "becomes", "body"])
        expect(show.get(`step ${n}, ${part}`).length, `${n} ${part}`).toBeGreaterThan(0);
    for (const slot of ["start, title", "start, line", "end, title", "end, line", "chain line"])
      expect(show.get(slot).length, slot).toBeGreaterThan(0);
  });
  it("has 7 cards, each with a date, a title, the step it comes from and a body", () => {
    const get = section(5);
    for (let n = 1; n <= 7; n++) {
      const card = String(n).padStart(2, "0");
      for (const part of ["date", "title", "from", "body"])
        expect(get.get(`card ${card}, ${part}`).length, `${card} ${part}`).toBeGreaterThan(0);
    }
    expect(get.find("card 08, title")).toBeUndefined();
    expect(get.find("card 05, body 2")).toBeUndefined();
  });
  it("shows the stack: two core rows, four priced documents, one included, then the bonuses and the product", () => {
    const offer = section(9);
    const rows = offer.list("stack row ").map(({ words }) => words);
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.match(/(The core|[\d,]+ USD|Included)\.$/)?.[1])).toEqual([
      "The core",
      "The core",
      "1,250 USD",
      "150 USD",
      "1,000 USD",
      "1,760 USD",
      "Included",
    ]);
    expect([1, 2, 3, 4].map((n) => offer.get(`bonus ${n}, value`).replace(/\.$/, ""))).toEqual([
      "58 USD",
      "525 USD",
      "Included",
      "Included",
    ]);
    for (const n of [1, 2, 3, 4])
      for (const part of ["name", "body"])
        expect(offer.get(`bonus ${n}, ${part}`).length).toBeGreaterThan(0);
    expect(offer.list("inside ")).toHaveLength(3);
    expect(offer.get("add-on, label")).toBe("Premium add-on, included in Season One");
    expect(offer.get("stack total")).toContain("4,890 USD");
    // The priced rows, the product and the two valued bonuses add up to the total.
    expect(1250 + 150 + 1000 + 1760 + 147 + 58 + 525).toBe(4890);
    expect(offer.get("add-on, value")).toContain("147 USD");
  });
  it("shows six prices and the founding places", () => {
    const offer = section(9);
    const rows = offer.list("price row ").map(({ words }) => words);
    expect(rows).toHaveLength(3);
    expect(rows.join(" ").match(/[\d,]+ USD/g)).toHaveLength(6);
    expect(founding(offer.get("founding line"))).toMatch(/\d of 3 places left/);
  });
  it("explains nine bands under the water, each starting with its day or its weeks", () => {
    const bands = section(8).list("band ");
    expect(bands).toHaveLength(9);
    for (const { words } of bands) expect(words).toMatch(/^(Day|Weeks|After week|For life)/);
  });
  it("puts an apply strip after sections 5, 6, 9 and 11", () => {
    for (const n of [5, 6, 9, 11]) expect(section(n).get("apply strip").length).toBeGreaterThan(0);
    for (const n of [1, 2, 3, 4, 7, 8, 10, 12])
      expect(section(n).find("apply strip")).toBeUndefined();
  });
  it("answers nine questions", () => {
    expect(section(12).list("question ")).toHaveLength(9);
    expect(section(12).list("answer ")).toHaveLength(9);
  });
});

describe("the form and what follows it", () => {
  it("asks the 8 questions, each with an error line, after the name and the email", () => {
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
      expect(question.err.length, question.id).toBeGreaterThan(0);
    }
    expect(questions.at(-1)).toMatchObject({ type: "choice" });
    expect(content.application.send.failed).toContain("still here");
  });
  it("takes each question, hint and choice from the deck", () => {
    const form = section("the form");
    for (const question of content.application.questions) {
      expect(question.q).toBe(form.get(question.id));
      if (question.type === "choice")
        expect(`${question.options.join(". ")}.`).toBe(form.get(`${question.id}, choices`));
      else expect(question.ph).toBe(form.get(`${question.id}, hint`));
    }
  });
  it("ends without a calendar for the lowest budget, with the deck's two lines", () => {
    const { tooLow, questions } = content.application;
    const budget = questions.find((question) => question.id === "budget")!;
    expect(budget.type === "choice" && budget.options[0]).toBe("Under 750 USD");
    expect(tooLow).toMatchObject({ id: "budget", option: "Under 750 USD" });
    expect(tooLow.lines).toEqual([
      section("the form").get("budget, under 750, line 1"),
      section("the form").get("budget, under 750, line 2"),
    ]);
  });
  it("keeps the form one swappable part, with the hosted forms still on file", () => {
    expect(["native", "embed"]).toContain(APPLICATION_MODE);
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
