import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import deck from "../src/content/deck.json" with { type: "json" };
import { founding, labelled, section } from "../src/content/deck";
import {
  APPLICATION_AFTER_BOOKING_URL,
  APPLICATION_MODE,
  APPLICATION_URL,
  BOOKED_PATH,
  BOOKING_URL,
  CHAT_EVENT_SLUG,
  CONFIRMATION_VIDEO,
  CONTACT_EMAIL,
  FOUNDER_VIDEO,
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

describe("the words", () => {
  it("name no social platform, and have no em dashes or middle dots", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(
        /instagram|tiktok|linkedin|youtube|facebook|whatsapp|twitter|x\.com|threads|snapchat|pinterest|\breels?\b/i,
      );
      expect(text, path).not.toContain("—");
      expect(text, path).not.toContain("–");
      expect(text, path).not.toContain("·");
    }
  });
  it("never promise followers, views or sales: every mention says they are not promised", () => {
    const mentions = shown.flatMap(([path, text]) =>
      text
        .split(/(?<=[.?!])\s+/)
        .filter((sentence) => /followers|\bviews\b|\bsales\b|go viral/i.test(sentence))
        .map((sentence) => [path, sentence] as const),
    );
    expect(mentions.length).toBeGreaterThan(0);
    for (const [path, sentence] of mentions)
      expect(sentence, path).toMatch(/don't promise|don't guarantee|guaranteed\.$/);
  });
  it("say videos, never episodes, claim no registered company, and use US spelling", () => {
    for (const [path, text] of shown) {
      expect(text, path).not.toMatch(/\bepisodes?\b|registered|\bLLC\b|\bInc\b|\bLtd\b/i);
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
  it("has the 12 sections of the page, the form, the booked page and the head", () => {
    expect(Object.keys(deck.sections)).toEqual(Array.from({ length: 15 }, (_, n) => String(n + 1)));
  });
  it("keeps the first screen free of any price", () => {
    for (const [slot, text] of strings(deck.sections["1"]))
      expect(text, slot).not.toMatch(/USD|\$/);
  });
  it("marks four small labels inside the first screen's line", () => {
    const labels = labelled(section(1).get("line under it")).filter((part) => part.label);
    expect(labels.map((part) => part.text)).toEqual([
      "12 weeks",
      "every script",
      "your voice",
      "You film.",
    ]);
  });
  it("has 11 cards, each with a date, a title and a body", () => {
    const get = section(5);
    for (let n = 1; n <= 11; n++) {
      const card = String(n).padStart(2, "0");
      for (const part of ["date", "title", "body"])
        expect(get.get(`card ${card}, ${part}`).length, `${card} ${part}`).toBeGreaterThan(0);
    }
  });
  it("names the AI kit in one card and one line of the stack", () => {
    const titles = section(5)
      .list("card ")
      .filter(({ slot }) => slot.endsWith(", title"));
    expect(titles.filter(({ words }) => /\bAI\b/.test(words))).toHaveLength(1);
    expect(
      section(8)
        .list("stack row ")
        .filter(({ words }) => /\bAI\b/.test(words)),
    ).toHaveLength(1);
  });
  it("shows the stack, six prices and the founding places", () => {
    const price = section(8);
    expect(price.list("stack row ")).toHaveLength(11);
    const rows = price.list("price row ").map(({ words }) => words);
    expect(rows).toHaveLength(3);
    expect(rows.join(" ").match(/[\d,]+ USD/g)).toHaveLength(6);
    expect(founding(price.get("founding line"))).toMatch(/\d of 3 places left/);
  });
  it("explains nine bands under the water, each starting with its day or its weeks", () => {
    const bands = section(7).list("band ");
    expect(bands).toHaveLength(9);
    for (const { words } of bands) expect(words).toMatch(/^(Day|Weeks|After week|For life)/);
  });
  it("puts an apply strip after sections 3, 5, 8 and 10", () => {
    for (const n of [3, 5, 8, 10]) expect(section(n).get("apply strip").length).toBeGreaterThan(0);
    for (const n of [1, 2, 4, 6, 7, 9, 11, 12])
      expect(section(n).find("apply strip")).toBeUndefined();
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
    const form = section(13);
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
      section(13).get("budget, under 750, line 1"),
      section(13).get("budget, under 750, line 2"),
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
    expect(section(14).get("booked from a chat, button")).toBe(
      "Answer the 8 questions (3 minutes)",
    );
    expect(CHAT_EVENT_SLUG).toBe("15-minute-call-chat");
  });
  it("gives /booked its own video, not the home page's", () => {
    expect(CONFIRMATION_VIDEO).toBe("/video/confirmation.mp4");
    expect(CONFIRMATION_VIDEO).not.toBe(FOUNDER_VIDEO);
  });
  it("carries the lines other documents depend on, word for word", () => {
    expect(section(14).get("booked from a chat, line")).toBe(
      "Messages about your call come from Zyade or Hanane, in the chat you used.",
    );
    expect(section(12).get("button")).toBe("Apply and pick a time");
    expect(content.action).toBe(section(12).get("button"));
    expect(CONTACT_EMAIL).toBe("hello@arcbuildr.co");
  });
});
