import { expect, test, type Page } from "@playwright/test";
import { press } from "./press";
import { calendar, ending, plain, stub } from "./stubs";

/**
 * The words the positioning dropped (VERDICT-3, rule 2), and the ones the packages dropped on 23 Nov:
 * any date ("Day 1", "Week 3", "Weeks 3 to 8") and the three names Clarity, Recognition, Momentum.
 * "Season One" is a package's name since VERDICT-6, so "Season" is off the list. "script" is a plain
 * word inside Say It Plain's own block (#say-it-plain, the deck's 8b) and banned everywhere else; "AI"
 * is banned everywhere, since the five tools that said it left the page (VERDICT-7).
 * A length is not a date: "8 weeks",
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
  ["a date (day N, week N)", /\b(day|week)s? \d/i],
  // The three names dropped on 23 Nov 2026 stay dropped.
  ["a package's old name", /\b(Clarity|Recognition|Momentum)\b/],
  ["a count of the founding places", /\d of (3|three)\b/i],
];
/** The one word Say It Plain's own block may say. */
const PLAIN_ONLY = ["script"];
/** Put in front of a line that was read inside Say It Plain's block. */
const IN_PLAIN = "\u0001";
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
        found.push(
          (parent.closest("#say-it-plain") ? "\u0001" : "") + (walk.currentNode.textContent ?? ""),
        );
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
    return found
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter((text) => text.replace("\u0001", "").trim());
  });

function check(lines: string[], where: string, film = false) {
  expect(lines.length, where).toBeGreaterThan(3);
  for (const read of lines) {
    const plain = read.startsWith(IN_PLAIN);
    const line = read.replace(IN_PLAIN, "").trim();
    if (!film) expect(NO_FILM.test(line) ? line : "", `${where}: no film`).toBe("");
    // An address in a meta tag is not words.
    if (/^https?:\/\/\S+$/.test(line)) continue;
    for (const [name, banned] of BANNED)
      if (!(plain && PLAIN_ONLY.includes(name)))
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
  // "script" is said, and only inside Say It Plain's block. "AI" is said nowhere.
  const saying = lines.filter((line) => /\bscripts?\b/i.test(line));
  expect(saying.length).toBeGreaterThan(0);
  expect(saying.filter((line) => !line.startsWith(IN_PLAIN))).toEqual([]);
  expect(lines.filter((line) => /\bAI\b/.test(line))).toEqual([]);
  // The last round's removals: no "Most Popular", and no dollar value on a bonus.
  expect(lines.filter((line) => /most popular/i.test(line))).toEqual([]);
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
    "Day 1. Your interview.",
    "Weeks 3 to 8",
    "After week 8",
    "Everything in Clarity, with 24 pieces.",
    "With Recognition and Momentum",
    "One idea becomes a checked script",
    "Your AI checks your setup before filming",
    "3 of 3 founding places left",
  ])
    expect(caught(line), line).toBe(true);
  for (const line of [
    "8 weeks, 24 videos",
    "Full Season",
    "A brand people recognize",
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
