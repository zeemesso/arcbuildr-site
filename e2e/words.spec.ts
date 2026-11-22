import { expect, test, type Page } from "@playwright/test";
import { press } from "./press";
import { calendar, ending, open, stub } from "./stubs";

/**
 * The words the positioning dropped (VERDICT-3, rule 2). This reads what a visitor can meet on the home
 * page, in the form (its questions, both endings and the plain form) and on the page after a booking:
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
];
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

function check(lines: string[], where: string) {
  expect(lines.length, where).toBeGreaterThan(3);
  for (const line of lines) {
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

test("the form says none of them: every question, the error lines, both endings and the plain form", async ({
  page,
}) => {
  await stub(page);
  await open(page, { name: "TEST Visitor", email: "test@example.com" });
  check(await said(page), "the form, opened");
  // Each question on screen in turn, with its error line showing.
  for (const id of ["profile", "sell", "stranger"]) {
    await press(page.locator("[data-ok]"));
    await expect(page.locator(".q.is-current [data-err]")).toBeVisible();
    check(await said(page), `the form, ${id}, with its error`);
    await page.locator(`.q.is-current #a-${id}`).fill("4");
    await page.locator(`.q.is-current #a-${id}`).press("Enter");
  }
  for (const id of ["film", "count", "decides", "start"]) {
    await expect(page.locator(`.q.is-current[data-id="${id}"]`)).toBeVisible();
    check(await said(page), `the form, ${id}`);
    await press(page.locator(`.q.is-current[data-id="${id}"] .choice`).first());
  }
  // The lowest budget: the ending with no calendar, which names the product.
  await press(page.locator('.q.is-current[data-id="budget"] .choice').first());
  await expect(ending(page)).toBeVisible();
  const low = await said(page);
  check(low, "the form, the ending with no calendar");
  expect(low.join(" ")).not.toContain("{product}");
});

test("the calendar's panel and the plain form say none of them", async ({ page }) => {
  await stub(page);
  await open(page, { name: "TEST Visitor", email: "test+b@example.com" });
  for (const id of ["profile", "sell", "stranger"]) {
    await page.locator(`.q.is-current #a-${id}`).fill("4");
    await page.locator(`.q.is-current #a-${id}`).press("Enter");
  }
  for (const id of ["film", "count", "decides", "start"])
    await press(page.locator(`.q.is-current[data-id="${id}"] .choice`).first());
  await press(page.locator('.q.is-current[data-id="budget"] .choice').nth(1));
  await expect(calendar(page).locator("iframe")).toBeVisible();
  // The plain form's lines are in the page from the start, so this reading holds them as well.
  const lines = await said(page);
  check(lines, "the form, the calendar");
  expect(await page.locator("[data-plain]").count()).toBeGreaterThan(0);
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
