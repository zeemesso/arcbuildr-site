import { expect, test, type Page } from "@playwright/test";
import { press } from "./press";
import { calendar, ending, plain, stub } from "./stubs";

/**
 * The words the positioning dropped (VERDICT-3, rule 2), and the ones the packages dropped on 23 Nov:
 * "Season", and any date ("Day 1", "Week 3", "Weeks 3 to 8"). A length is not a date: "8 weeks",
 * "21 days" and "30 more days" stay, and so does the day the prices were checked. This reads what a visitor can meet on the home
 * page, around the form (both endings and the plain form) and on the page after a booking:
 * the text, the alt text, the labels, the page title and the meta tags.
 * "We don't chase viral." is the one allowed use of "viral".
 */
const BANNED: [string, RegExp][] = [
  ["script", /\bscripts?\b/i],
  ["AI", /\bAI\b/],
  ["kit", /\bkits?\b/i],
  ["ghostwrite, ghostwriter", /ghost-?writ/i],
  ["writers' room", /writers?['’]?s? room/i],
  ["in your voice", /in your voice/i],
  ["a long dash", /[\u2012\u2013\u2014\u2015]/],
  ["Season", /\bseasons?\b/i],
  ["a date (day N, week N)", /\b(day|week)s? \d/i],
];
/** Nothing announces a film that is not there. */
const NO_FILM = /watch this first/i;
const ALLOWED_VIRAL = "We don't chase viral.";

/** Everything the page says at this moment, to the eye, to a screen reader and to a shared link. */
const said = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [document.title];
    // Every piece of text in the page, shown or waiting its turn: a line that is hidden now is still a line.
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const parent = walk.currentNode.parentElement;
      if (parent && !parent.closest("script, style, noscript, template"))
        found.push(walk.currentNode.textContent ?? "");
    }
    for (const name of ["alt", "title", "aria-label", "aria-description", "placeholder", "value"])
      for (const el of document.querySelectorAll(`body [${name}]`))
        if (!(name === "value" && el.matches("input[type=hidden], option")))
          found.push(el.getAttribute(name) ?? "");
    for (const el of document.querySelectorAll("label")) found.push(el.textContent ?? "");
    for (const el of document.querySelectorAll("head meta[content]"))
      if (!/viewport|charset|theme-color|robots|generator/.test(el.getAttribute("name") ?? ""))
        found.push(el.getAttribute("content") ?? "");
    for (const el of document.querySelectorAll("noscript, template"))
      found.push(el.textContent ?? "");
    return found.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  });

function check(lines: string[], where: string, film = false) {
  expect(lines.length, where).toBeGreaterThan(3);
  for (const line of lines) {
    if (!film) expect(NO_FILM.test(line) ? line : "", `${where}: no film`).toBe("");
    // An address in a meta tag is not words.
    if (/^https?:\/\/\S+$/.test(line)) continue;
    for (const [name, banned] of BANNED)
      expect(banned.test(line) ? `${name}: "${line}"` : "", where).toBe("");
    const viral = line.match(/viral/gi) ?? [];
    if (viral.length) expect(line, `${where}: viral`).toBe(ALLOWED_VIRAL);
  }
}

test.use({ reducedMotion: "reduce" });

test("the home page says none of the dropped words: text, alt text, labels, title and meta tags", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("details")
    .evaluateAll((els) => els.forEach((el) => ((el as HTMLDetailsElement).open = true)));
  const lines = await said(page);
  check(lines, "/");
  // The one allowed use is on the page, once.
  expect(lines.filter((line) => /viral/i.test(line))).toEqual([ALLOWED_VIRAL]);
  // What the page gives to a search engine and to a shared link is read too.
  expect(lines).toContain(await page.title());
  expect(lines).toContain(await page.locator('meta[name="description"]').getAttribute("content"));
  expect(lines).toContain(await page.locator('meta[property="og:title"]').getAttribute("content"));
});

// The questions themselves are on Tally, where this test cannot read them: they are checked against the
// deck when the Tally form is edited. What the site says around the form is read here.
test("the site's side of the form says none of them: the plain form, its error lines, and the ending", async ({
  page,
}) => {
  await stub(page, "fail", "blocked");
  await page.goto("/");
  await press(page.locator("#top [data-apply-open]").first());
  await expect(plain(page)).toBeVisible();
  check(await said(page), "the plain form");
  for (const [name, email] of [
    ["", ""],
    ["TEST Visitor", "not-an-email"],
    ["TEST Visitor", "test@example.com"],
  ]) {
    await plain(page).locator("input[name=name]").fill(name!);
    await plain(page).locator("input[name=email]").fill(email!);
    await press(page.locator("[data-ok]"));
    await expect(
      page.locator("[data-plain-err], [data-note]").filter({ hasText: /\S/ }),
    ).toBeVisible();
    check(await said(page), `the plain form, sent with "${name}" and "${email}"`);
  }
  // The lowest budget: the ending with no calendar, which names the product.
  await page.goto("/?apply=end&name=TEST+Visitor");
  await expect(ending(page)).toBeVisible();
  const low = await said(page);
  check(low, "the ending with no calendar");
  expect(low.join(" ")).not.toContain("{product}");
});

test("the calendar's panel says none of them", async ({ page }) => {
  await stub(page);
  await page.goto("/?apply=calendar&name=TEST+Visitor&email=test%2Bb%40example.com");
  await expect(calendar(page).locator("iframe")).toBeVisible();
  // The plain form's lines are in the page from the start, so this reading holds them as well.
  const lines = await said(page);
  check(lines, "the calendar");
  expect(await page.locator("[data-plain]").count()).toBeGreaterThan(0);
});

test("the banned list catches what it should, and leaves a length alone", () => {
  const caught = (line: string) => BANNED.some(([, banned]) => banned.test(line));
  for (const line of [
    "Season One",
    "your season",
    "Day 1. Your interview.",
    "Weeks 3 to 8",
    "After week 8",
  ])
    expect(caught(line), line).toBe(true);
  for (const line of [
    "24 pieces, 8 weeks",
    "12 pieces, 21 days",
    "30 more days of answers",
    "an answer within 3 days",
    "Every Monday I write to you about last week",
    "Checked on November 21, 2026.",
  ])
    expect(caught(line), line).toBe(false);
  expect(NO_FILM.test("Watch this first")).toBe(true);
});

test("with a test film the video block still says none of them", async ({ page }) => {
  await page.goto("/demo/vsl/");
  await expect(page.locator("[data-vsl]")).toBeVisible();
  // Even with a film, the page has no label above it: the deck gives none.
  check(await said(page), "/demo/vsl/");
});

for (const path of [
  "/booked",
  "/booked?via=chat",
  "/booked?attendeeName=TEST+Visitor",
  "/privacy",
]) {
  test(`${path} says none of them`, async ({ page }) => {
    await page.goto(path);
    check(await said(page), path);
  });
}
