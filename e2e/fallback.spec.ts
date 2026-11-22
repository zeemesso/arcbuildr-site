import { expect, test, type Page } from "@playwright/test";
import { application as form } from "../src/content/site";
import { APPLICATION_URL, BOOKING_URL } from "../src/config";
import { press } from "./press";
import { calendar, layer, plain, popup, stub } from "./stubs";

// The form must never leave anyone stuck. Each test here breaks one thing (the site's script does not
// arrive, arrives late or throws; Tally's popup cannot load, or opens empty; Tally cannot be reached at
// all; the save fails or the connection drops) and checks that a name and an email still get through.

const who = { name: "TEST Visitor", email: "test+a@example.com" };
const booking = `${BOOKING_URL}?${new URLSearchParams(who)}`;
const note = (page: Page) => page.locator("[data-apply] [data-note]");
const plainName = (page: Page) => plain(page).locator("input[name=name]");
const plainEmail = (page: Page) => plain(page).locator("input[name=email]");
const okButton = (page: Page) => page.locator("[data-ok]");
const SCRIPTS = "**/_astro/*.js";
/** What the browser posted by itself: the fields of the form, as the Worker reads them. */
const posted = (calls: Awaited<ReturnType<typeof stub>>) => {
  const request = calls.applies.at(-1)!;
  expect(request.method()).toBe("POST");
  expect(request.headers()["content-type"]).toContain("application/x-www-form-urlencoded");
  return Object.fromEntries(new URLSearchParams(request.postData() ?? ""));
};
/** Errors thrown on the site's own pages. The stand-ins for other sites are not ours. */
function siteErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    if (new URL(page.url()).hostname === "127.0.0.1") errors.push(error.message);
  });
  return errors;
}
/** Fills the page's two fields and presses their button. */
async function fillEntry(page: Page) {
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await press(page.locator("#apply form button"));
}

test("the script never arrives: the page shows whole, and the two fields save through /api/apply", async ({
  page,
}) => {
  const calls = await stub(page);
  await page.route(SCRIPTS, (route) => route.abort());
  await page.goto("/");
  // Motion waits 3 seconds for the script, then the page shows as if there were none.
  await expect(page.locator("html")).not.toHaveClass(/(^| )js( |$)/, { timeout: 8000 });
  await expect(page.locator("h1")).toBeVisible();
  for (const el of await page.locator("#apply [data-reveal]").all())
    await expect(el).toHaveCSS("opacity", "1");
  // An apply button is a link to the two fields.
  await press(page.locator("#top [data-apply-open]"));
  await expect(page).toHaveURL(/#apply$/);
  await expect(layer(page)).toBeHidden();
  // An empty form goes nowhere: the browser asks for the name itself.
  await press(page.locator("#apply form button"));
  expect(calls.applies).toHaveLength(0);
  await fillEntry(page);
  await page.waitForURL(booking);
  expect(posted(calls)).toMatchObject(who);
  expect(calls.applies).toHaveLength(1);
});

test("the script arrives late: the two fields work before it, and the form opens after it", async ({
  page,
}) => {
  const calls = await stub(page);
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(SCRIPTS, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator("html")).not.toHaveClass(/(^| )js( |$)/, { timeout: 8000 });
  await expect(page.locator("h1")).toBeVisible();
  // Before the script: the browser posts the two fields itself.
  await fillEntry(page);
  await page.waitForURL(booking);
  expect(posted(calls)).toMatchObject(who);
  // After the script: the same button opens the form.
  await page.goBack({ waitUntil: "commit" });
  release();
  await expect(page.locator("html")).toHaveClass(/ready/);
  await press(page.locator("#top [data-apply-open]"));
  await expect(popup(page)).toBeVisible();
});

test("the form's script throws as it starts: the page goes on, and the two fields save by themselves", async ({
  page,
}) => {
  const calls = await stub(page);
  const errors = siteErrors(page);
  // The form's own words arrive broken, so the form throws on its first line.
  await page.route("**/", async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/(data-apply-words[^>]*>)/, "$1{broken");
    await route.fulfill({ response, body: html });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/ready/);
  // The rest of the page's script still ran: sections arrive as they come on screen.
  const arriving = page.locator("#apply [data-reveal]").first();
  await arriving.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(arriving).toHaveClass(/is-in/);
  await press(page.locator("#top [data-apply-open]"));
  await expect(layer(page)).toBeHidden();
  await expect(popup(page)).toHaveCount(0);
  await fillEntry(page);
  await page.waitForURL(booking);
  expect(posted(calls)).toMatchObject(who);
  expect(errors).toEqual([]);
});

test("Tally's popup cannot load: the same form opens as a full page, with the name and email in its address", async ({
  page,
}) => {
  const calls = await stub(page, "ok", "page");
  await page.goto("/");
  await fillEntry(page);
  await page.waitForURL(`${APPLICATION_URL}?${new URLSearchParams(who)}`);
  await expect(page.locator("h1")).toHaveText("Form");
  // The lead was recorded before the page left.
  expect(calls.leads).toHaveLength(1);
});

test("Tally cannot be reached at all: the plain form saves a name and an email, then the calendar opens", async ({
  page,
}) => {
  const calls = await stub(page, "ok", "blocked");
  const errors = siteErrors(page);
  await page.goto("/");
  await fillEntry(page);
  await expect(layer(page)).toBeVisible();
  await expect(plain(page)).toBeVisible();
  await expect(plain(page).locator(".plain__lead")).toHaveText(form.plain.broken);
  // What was typed on the page is already in it.
  await expect(plainName(page)).toHaveValue(who.name);
  await expect(plainEmail(page)).toHaveValue(who.email);
  await expect(okButton(page)).toHaveText(form.plain.send);
  await expect(page).toHaveURL(/#apply$/);
  await press(okButton(page));
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
  await expect(plain(page)).toBeHidden();
  expect(calls.applies).toHaveLength(1);
  const body = calls.applies[0]!.postDataJSON();
  expect(body).toMatchObject({ ...who, plain: true, answers: {}, kind: "application", trap: "" });
  expect(body.id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  expect(errors).toEqual([]);
});

test("from a button with no name, the plain form asks for both and says what is missing", async ({
  page,
}) => {
  const calls = await stub(page, "ok", "blocked");
  await page.goto("/");
  await press(page.locator("#top [data-apply-open]").first());
  await expect(plain(page)).toBeVisible();
  await expect(plainName(page)).toBeFocused();
  await press(okButton(page));
  await expect(page.locator("[data-plain-err]")).toHaveText(form.who[0].err);
  await expect(plainName(page)).toHaveAttribute("aria-invalid", "true");
  await plainName(page).fill(who.name);
  await expect(page.locator("[data-plain-err]")).toHaveText("");
  await plainEmail(page).fill("not-an-email");
  await press(okButton(page));
  await expect(page.locator("[data-plain-err]")).toHaveText(form.who[1].err);
  expect(calls.applies).toHaveLength(0);
  await plainEmail(page).fill(who.email);
  await plainEmail(page).press("Enter");
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-name", who.name);
  expect(calls.applies[0]!.postDataJSON()).toMatchObject({ ...who, plain: true });
});

test("the popup opens and its form never shows: the page gives up on it and falls back", async ({
  page,
}) => {
  const calls = await stub(page, "ok", "silent");
  await page.clock.install();
  await page.goto("/");
  await fillEntry(page);
  await expect(popup(page)).toBeVisible();
  // Tally's own site still answers here, so the same form opens as a full page.
  await page.clock.fastForward(13000);
  await page.waitForURL(`${APPLICATION_URL}?${new URLSearchParams(who)}`);
  expect(calls.applies).toHaveLength(0);
});

test("the plain form's save fails: it says so, keeps what was typed, and Pick a time anyway opens the calendar", async ({
  page,
}) => {
  const calls = await stub(page, "fail", "blocked");
  await page.goto("/");
  await fillEntry(page);
  await press(okButton(page));
  await expect(note(page)).toHaveText(form.send.failed);
  await expect(plainName(page)).toHaveValue(who.name);
  await expect(plainEmail(page)).toHaveValue(who.email);
  const anyway = page.locator("[data-anyway]");
  await expect(anyway).toBeVisible();
  await expect(anyway).toHaveText(form.send.anyway);
  // The next try saves.
  calls.save = "ok";
  await press(okButton(page));
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
  expect(calls.applies).toHaveLength(2);
});

test("the plain form's save fails and Pick a time anyway is pressed: the calendar opens with the name and email", async ({
  page,
}) => {
  await stub(page, "fail", "blocked");
  await page.goto("/");
  await fillEntry(page);
  await press(okButton(page));
  await press(page.locator("[data-anyway]"));
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-name", who.name);
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
});

test("no connection: the plain form says so and stays, then saves once the connection is back", async ({
  page,
  context,
}) => {
  const calls = await stub(page, "ok", "blocked");
  await page.goto("/");
  await fillEntry(page);
  await expect(plain(page)).toBeVisible();
  await context.setOffline(true);
  await press(okButton(page));
  await expect(note(page)).toHaveText(form.send.offline);
  await expect(plain(page)).toBeVisible();
  await context.setOffline(false);
  await press(okButton(page));
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies.at(-1)!.postDataJSON()).toMatchObject({ ...who, plain: true });
});

test("the trap field is out of reach for people and empty in what is sent", async ({ page }) => {
  const calls = await stub(page, "ok", "blocked");
  await page.goto("/");
  await fillEntry(page);
  await expect(plain(page)).toBeVisible();
  const trap = page.locator("[data-trap]");
  await expect(trap).not.toBeInViewport();
  await expect(trap).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".apply__trap")).toHaveAttribute("aria-hidden", "true");
  await press(okButton(page));
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies[0]!.postDataJSON().trap).toBe("");
});
