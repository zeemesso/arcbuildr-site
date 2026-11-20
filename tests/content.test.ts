import { describe, expect, it } from "vitest";
import * as content from "../src/content/site";
import {
  APPLICATION_AFTER_BOOKING_URL,
  APPLICATION_MODE,
  APPLICATION_URL,
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
const words = (text: string) => text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
const { home } = content;

describe("content contract", () => {
  it("has no platform names, em dashes or middle dots", () => {
    for (const [path, text] of strings(content)) {
      expect(text, path).not.toMatch(
        /instagram|tiktok|linkedin|youtube|facebook|whatsapp|twitter|x\.com|threads|snapchat|pinterest/i,
      );
      expect(text, path).not.toContain("—");
      expect(text, path).not.toContain("–");
      expect(text, path).not.toContain("·");
    }
  });
  it("promises no followers, views or sales, and never says the company is registered", () => {
    for (const [path, text] of strings(content)) {
      expect(text, path).not.toMatch(
        /followers|go viral|more views|more sales|registered|\bLLC\b|\bInc\b/i,
      );
    }
  });
  it("leaves the failed feature off the page", () => {
    for (const [path, text] of strings(home))
      expect(text, path).not.toMatch(/one video into more/i);
  });
  it("reserves the places placeholder for the founding count", () => {
    expect(
      strings(content)
        .filter(([, text]) => text.includes("{n}"))
        .map(([path]) => path),
    ).toEqual([".founding.count"]);
  });
  it("keeps the first screen to 25 words and the headline to 8", () => {
    const h1 = home.start.h1.join(" ");
    expect(h1).toBe("Stop guessing what to post.");
    expect(words(h1)).toBeLessThanOrEqual(8);
    expect(words(`${h1} ${home.start.lede.replace(/[[\]]/g, "")}`)).toBeLessThanOrEqual(25);
  });
  it("keeps every headline to 8 words and every body line to 30", () => {
    const sections = [
      home.features,
      home.hub,
      home.iceberg,
      home.install,
      home.price,
      home.refund,
      home.faq,
      home.book,
    ];
    for (const section of sections) {
      expect(words(section.h2), section.h2).toBeLessThanOrEqual(8);
      if ("body" in section) expect(words(section.body), section.body).toBeLessThanOrEqual(30);
    }
    for (const card of home.features.cards) {
      expect(words(card.h3), card.h3).toBeLessThanOrEqual(8);
      expect(words(card.body), card.body).toBeLessThanOrEqual(30);
    }
  });
  it("labels the five screens as samples and gives each one a description", () => {
    expect(home.features.sample).toBe("Sample");
    expect(home.features.cards.map((card) => card.id)).toEqual([
      "profile",
      "script",
      "setup",
      "editor",
      "files",
    ]);
    for (const card of home.features.cards) {
      expect(
        home.features.screens[card.id as keyof typeof home.features.screens].alt,
        card.id,
      ).toMatch(/^Sample: /);
    }
  });
  it("puts the profile at the centre of the diagram", () => {
    expect(home.hub.core).toBe("Your profile");
    expect(home.hub.inputs).toHaveLength(4);
    expect(home.hub.outputs).toHaveLength(3);
  });
  it("has at most 5 questions, 40 words an answer, each with its own id", () => {
    const { items } = home.faq;
    expect(items.length).toBeLessThanOrEqual(5);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    for (const item of items) expect(words(item.a), item.id).toBeLessThanOrEqual(40);
  });
  it("links only to pages that exist", () => {
    const hrefs = strings(content).filter(([path, text]) => path.endsWith(".href") && text !== "");
    expect(hrefs.length).toBeGreaterThan(0);
    for (const [path, href] of hrefs) expect(["/", "/sample", "/privacy"], path).toContain(href);
  });
  it("carries the lines other documents depend on, word for word", () => {
    expect(content.booked.invite).toBe(
      "The invite comes by email. If it is not in your inbox in 2 minutes, check spam. If your email shows it as from an unknown sender, confirm that you know the sender, then accept it.",
    );
    expect(content.booked.chat).toBe(
      "Messages about your call come from Zyade or Hanane, in the chat you used.",
    );
    const audit = "the 3 things your videos leave unclear";
    expect(strings(content.booked).some(([, text]) => text.includes(audit))).toBe(true);
    expect(home.start.lede).toContain("[750 to 1,750 USD]");
    expect(home.price.h2).toContain("750 to 1,750 USD");
    expect(content.action).toBe("Apply and pick a time");
    expect(content.entry.button).toBe(content.action);
    expect(CONTACT_EMAIL).toBe("hello@arcbuildr.co");
  });
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
  it("keeps the form one swappable part, with the hosted forms still on file", () => {
    expect(["native", "embed"]).toContain(APPLICATION_MODE);
    expect(APPLICATION_URL).toBe("https://tally.so/r/M1aKGp");
    expect(APPLICATION_AFTER_BOOKING_URL).toBe("https://tally.so/r/9NZpVV");
    expect(BOOKING_URL).toBe("https://cal.com/arcbuildr/15-minute-call");
  });
  it("sends a booking made from a chat to the 8 questions", () => {
    expect(content.booked.application.link.join(" ")).toBe("Answer the 8 questions (3 minutes)");
    expect(content.booked.application.first).toContain("The 8 questions come first");
    expect(CHAT_EVENT_SLUG).toBe("15-minute-call-chat");
  });
  it("gives /booked its own video, not the home page's", () => {
    expect(CONFIRMATION_VIDEO).toBe("/video/confirmation.mp4");
    expect(CONFIRMATION_VIDEO).not.toBe(FOUNDER_VIDEO);
  });
});
