import { expect, test, type Page } from "@playwright/test";
import { application as form, booked } from "../src/content/site";
import { section } from "../src/content/deck";
import { APPLICATION_URL, BOOKING_URL, TALLY_FORM } from "../src/config";
import { press } from "./press";
import {
  answers,
  apply,
  calendar,
  ending,
  layer,
  lowest,
  open as openForm,
  opened,
  popup,
  send,
  stub,
  submission,
} from "./stubs";

// The questions are a form on Tally, opened in Tally's popup. These tests cover the site's side: what
// it hands the form, what it does when the form is sent, and what the visitor sees next. Tally itself
// is a stand-in (e2e/stubs.ts).

const who = { name: "TEST Visitor", email: "test+a@example.com" };
const booking = `${BOOKING_URL}?${new URLSearchParams(who)}`;
const KEY = "arcbuildr-application";
const open = (page: Page) => openForm(page, who);
const kept = (page: Page) => page.evaluate((key) => localStorage.getItem(key), KEY);

test("an empty or wrong entry stays put, says why and clears as you type", async ({ page }) => {
  const calls = await stub(page);
  await page.goto("/");
  const name = page.locator("#apply input[name=name]");
  const email = page.locator("#apply input[name=email]");
  const errors = page.locator("#apply [data-entry-err]");
  await press(page.locator("#apply form button"));
  await expect(errors.nth(0)).toHaveText(form.who[0].err);
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill(who.name);
  await expect(errors.nth(0)).toHaveText("");
  await email.fill("bad@address");
  await press(page.locator("#apply form button"));
  await expect(errors.nth(1)).toHaveText(form.who[1].err);
  await expect(email).toBeFocused();
  await email.fill(who.email);
  await expect(errors.nth(1)).toHaveText("");
  // Nothing opened, and Tally was never asked for anything.
  await expect(popup(page)).toHaveCount(0);
  await expect(layer(page)).toBeHidden();
  expect(calls.forms).toHaveLength(0);
});

test("a name and an email open the Tally form with both filled, and record one lead", async ({
  page,
}) => {
  const calls = await stub(page);
  await page.goto("/?src=card&utm_source=test&other=1");
  // Tally's script is not on the page until someone asks for the form.
  await page.waitForLoadState("networkidle");
  expect(calls.forms).toHaveLength(0);
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await page.locator("#apply input[name=email]").press("Enter");
  await expect(popup(page)).toBeVisible();
  expect(await opened(page)).toEqual([{ id: TALLY_FORM, layout: "modal", hiddenFields: who }]);
  expect(new URL(APPLICATION_URL).pathname).toBe(`/r/${TALLY_FORM}`);
  // The site's own layer stays shut while the form is open, and the page has not moved.
  await expect(layer(page)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe("/");
  await expect.poll(() => calls.leads.length).toBe(1);
  const body = new URLSearchParams(calls.leads[0]!.postData()!);
  expect(Object.fromEntries(body)).toMatchObject({
    name: who.name,
    email: who.email,
    src: "card",
    page: "/",
    utm: "utm_source=test",
  });
  expect(body.get("tz")).not.toBe("");
  expect(body.has("sent_at")).toBe(true);
  expect(calls.applies).toHaveLength(0);
});

test("the form sent: the answers are saved once, then the calendar shows inside the page with name and email filled", async ({
  page,
}) => {
  const calls = await stub(page);
  await apply(page, who);
  await expect(calendar(page)).toBeVisible();
  const frame = calendar(page).locator("iframe");
  await expect(frame).toHaveAttribute("data-link", new URL(BOOKING_URL).pathname.slice(1));
  await expect(frame).toHaveAttribute("data-name", who.name);
  await expect(frame).toHaveAttribute("data-email", who.email);
  // Tally's popup is gone, so its own closing page is never the last thing read. Nobody left the site.
  await expect(popup(page)).toHaveCount(0);
  await expect(layer(page)).toBeVisible();
  await expect(layer(page)).toHaveAttribute("role", "dialog");
  await expect(ending(page)).toBeHidden();
  await expect(page.locator("[data-calendar-link]")).toBeHidden();
  expect(new URL(page.url()).pathname).toBe("/");
  await expect.poll(() => calls.applies.length).toBe(1);
  const sent = calls.applies[0]!;
  expect(sent.method()).toBe("POST");
  expect(sent.headers()["content-type"]).toContain("application/json");
  const body = sent.postDataJSON();
  expect(body).toMatchObject({
    ...who,
    answers,
    kind: "application",
    src: "direct",
    utm: "",
    page: "/",
    trap: "",
  });
  expect(body.plain).toBeUndefined();
  expect(body.id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  expect(body.tz).not.toBe("");
});

test("each answer finds its question by place when Tally's words differ from the deck's", async ({
  page,
}) => {
  const calls = await stub(page);
  await open(page);
  await send(page, submission(who, answers, { titles: (q) => `Tally says: ${q.slice(0, 12)}` }));
  await expect(calendar(page)).toBeVisible();
  await expect.poll(() => calls.applies.length).toBe(1);
  expect(calls.applies[0]!.postDataJSON()).toMatchObject({ ...who, answers });
});

test("a button with no name opens the form empty, and the name and email typed in it are used", async ({
  page,
}) => {
  const calls = await stub(page);
  await page.goto("/");
  await press(page.locator("#top [data-apply-open]").first());
  await expect(popup(page)).toBeVisible();
  expect(await opened(page)).toEqual([{ id: TALLY_FORM, layout: "modal", hiddenFields: {} }]);
  // Nobody gave an email yet, so there is no lead to record.
  expect(calls.leads).toHaveLength(0);
  await send(page, submission(who, answers, { typed: true }));
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-name", who.name);
  await expect.poll(() => calls.applies.length).toBe(1);
  expect(calls.applies[0]!.postDataJSON()).toMatchObject({ ...who, answers });
});

test("the header's button opens the form", async ({ page }) => {
  await stub(page);
  await page.goto("/");
  await page.locator("#get").scrollIntoViewIfNeeded();
  await press(page.locator(".bar__cta"));
  await expect(popup(page)).toBeVisible();
});

test("the form closed without sending leaves the page as it was, and opens again", async ({
  page,
}) => {
  const calls = await stub(page);
  await open(page);
  await press(page.locator("[data-tally-close]"));
  await expect(popup(page)).toHaveCount(0);
  await expect(layer(page)).toBeHidden();
  expect(calls.applies).toHaveLength(0);
  await press(page.locator("#apply form button"));
  await expect(popup(page)).toBeVisible();
});

test("the answers stay on this device until they are saved", async ({ page }) => {
  const calls = await stub(page, "hang");
  await apply(page, who);
  // The calendar does not wait for the save.
  await expect(calendar(page)).toBeVisible();
  const waiting = JSON.parse((await kept(page))!);
  expect(waiting).toMatchObject({ ...who, answers, kind: "application" });
  // The next page that loads sends them once more, under the same id, and then lets go of them.
  calls.save = "ok";
  await page.goto("/");
  await expect.poll(() => kept(page)).toBeNull();
  expect(calls.applies.at(-1)!.postDataJSON()).toMatchObject({ id: waiting.id, ...who, answers });
});

test("when the sheet refuses the whole application, a plain row with the same id is saved", async ({
  page,
}) => {
  const calls = await stub(page, "plain only");
  await apply(page, who);
  await expect(calendar(page)).toBeVisible();
  await expect.poll(() => calls.applies.length).toBe(2);
  const [first, second] = calls.applies.map((request) => request.postDataJSON());
  expect(first.plain).toBeUndefined();
  expect(second).toMatchObject({ id: first.id, ...who, answers, plain: true });
  await expect.poll(() => kept(page)).toBeNull();
});

test("someone who applied in this visit goes straight to the calendar the second time", async ({
  page,
}) => {
  const calls = await stub(page);
  await apply(page, who);
  await expect(calendar(page)).toBeVisible();
  await page.goto("/");
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await press(page.locator("#apply form button"));
  await expect(calendar(page)).toBeVisible();
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
  await expect(popup(page)).toHaveCount(0);
  expect(calls.applies).toHaveLength(1);
});

test("the page after booking saves answers that had not saved", async ({ page }) => {
  const calls = await stub(page, "fail");
  await apply(page, who);
  await expect(calendar(page)).toBeVisible();
  await expect.poll(() => calls.applies.length).toBe(2);
  const id = calls.applies[0]!.postDataJSON().id;
  calls.save = "ok";
  await page.goto("/booked?attendeeName=TEST+Visitor&email=test%2Ba%40example.com");
  await expect(page.locator("[data-resend-note]")).toHaveText(booked.resent);
  await expect(page.locator("[data-resend-retry]")).toBeHidden();
  const again = calls.applies.at(-1)!.postDataJSON();
  expect(again).toMatchObject({ id, ...who, answers, kind: "application", page: "/booked" });
  expect(await kept(page)).toBeNull();
  // Nothing is left to send on the next visit.
  const count = calls.applies.length;
  await page.reload();
  await expect(page.locator("[data-resend]")).toBeHidden();
  expect(calls.applies).toHaveLength(count);
});

test("the page after booking says when the answers still have not saved, and offers one more try", async ({
  page,
}) => {
  const calls = await stub(page, "fail");
  await apply(page, who);
  await expect(calendar(page)).toBeVisible();
  await expect.poll(() => calls.applies.length).toBe(2);
  await page.goto("/booked");
  await expect(page.locator("[data-resend-note]")).toHaveText(booked.unsent);
  const retry = page.locator("[data-resend-retry]");
  await expect(retry).toBeVisible();
  await expect(retry).toHaveText(booked.retry);
  expect(await kept(page)).not.toBeNull();
  calls.save = "ok";
  await press(retry);
  await expect(page.locator("[data-resend-note]")).toHaveText(booked.resent);
  await expect(retry).toBeHidden();
});

test("a budget under 750 USD ends with the deck's two lines, and no calendar", async ({ page }) => {
  const calls = await stub(page);
  await apply(page, who, { ...answers, budget: lowest });
  await expect(ending(page)).toBeVisible();
  const lines = ["budget, under 750, line 1", "budget, under 750, line 2"].map((slot) =>
    section("the form, on tally").get(slot).replace("{name}", "TEST"),
  );
  await expect(ending(page).locator("p")).toHaveText(lines);
  await expect(popup(page)).toHaveCount(0);
  // The answers are saved all the same, with the budget they picked.
  await expect.poll(() => calls.applies.length).toBe(1);
  expect(calls.applies[0]!.postDataJSON().answers.budget).toBe(lowest);
  // No calendar: not on the page, not loaded, and no link to one.
  await expect(calendar(page)).toBeHidden();
  await expect(layer(page).locator("iframe")).toHaveCount(0);
  await expect(layer(page).locator("a:visible")).toHaveCount(0);
  expect(calls.calendars).toHaveLength(0);
  // Coming back in the same visit shows the same ending, and saves nothing twice.
  await page.goto("/");
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await press(page.locator("#apply form button"));
  await expect(ending(page)).toBeVisible();
  await expect(calendar(page)).toBeHidden();
  await expect(popup(page)).toHaveCount(0);
  expect(calls.applies).toHaveLength(1);
  expect(calls.calendars).toHaveLength(0);
});

test("a budget under 750 USD gets no way round to the calendar when saving fails", async ({
  page,
}) => {
  const calls = await stub(page, "fail");
  await apply(page, who, { ...answers, budget: lowest });
  await expect(ending(page)).toBeVisible();
  await expect(layer(page).locator("a:visible")).toHaveCount(0);
  expect(calls.calendars).toHaveLength(0);
  expect(await kept(page)).not.toBeNull();
});

// The site cannot stop a frame from another site moving the whole page, so the form on Tally must
// have no "redirect on completion". If it has one, the answers are still saved before the page leaves.
test("a form still set on Tally to redirect: the answers are saved before the page leaves", async ({
  page,
}) => {
  const calls = await stub(page);
  // Another site takes a moment to answer, as a real one does.
  await page.route("https://cal.com/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ contentType: "text/html", body: "<title>Booking stand-in</title>" });
  });
  await open(page);
  await send(page, submission(who), booking);
  await page.waitForURL(booking);
  expect(calls.applies).toHaveLength(1);
  expect(calls.applies[0]!.postDataJSON()).toMatchObject({ ...who, answers });
});

test("back from the form as a full page: the calendar opens, and the address is cleaned", async ({
  page,
}) => {
  const calls = await stub(page);
  await page.goto(`/?apply=calendar&${new URLSearchParams(who)}`);
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-name", who.name);
  expect(new URL(page.url()).search).toBe("");
  // The answers are on Tally: this page has none to save.
  expect(calls.applies).toHaveLength(0);
  expect(calls.forms).toHaveLength(0);
});

test("back from the form as a full page with the lowest budget: the two lines, and no calendar", async ({
  page,
}) => {
  const calls = await stub(page);
  const markup = '<img src=x onerror="document.title=1">';
  await page.goto(`/?apply=end&name=${encodeURIComponent("TEST " + markup)}`);
  await expect(ending(page)).toBeVisible();
  await expect(ending(page).locator("p").first()).toHaveText(
    section("the form, on tally").get("budget, under 750, line 1").replace("{name}", "TEST"),
  );
  await expect(layer(page).locator("img")).toHaveCount(0);
  await expect(calendar(page)).toBeHidden();
  expect(new URL(page.url()).search).toBe("");
  expect(calls.calendars).toHaveLength(0);
});

test("the layer closes with its button, with Escape and with Back", async ({ page }) => {
  await stub(page);
  for (const how of ["button", "Escape", "Back"]) {
    await page.goto(`/?apply=calendar&${new URLSearchParams(who)}`);
    await expect(layer(page)).toBeVisible();
    await expect(page).toHaveURL(/#apply$/);
    if (how === "button") await press(layer(page).locator("[data-close]"));
    else if (how === "Escape") await layer(page).locator("[data-close]").press("Escape");
    else await page.goBack();
    await expect(layer(page), how).toBeHidden();
    await expect(page, how).not.toHaveURL(/#apply$/);
  }
});

test("the apply link on another page leads to the two fields", async ({ page }) => {
  const calls = await stub(page);
  await page.goto("/privacy");
  await press(page.locator("header a[data-apply]"));
  await expect(page).toHaveURL(/\/#apply$/);
  await expect(page.locator("#apply input[name=name]")).toBeInViewport();
  await expect(popup(page)).toHaveCount(0);
  await expect(layer(page)).toBeHidden();
  expect(calls.forms).toHaveLength(0);
});

test("a finished booking lands on /booked, greeted by first name", async ({ page }) => {
  await stub(page);
  await apply(page, who);
  await expect(calendar(page).locator("iframe")).toBeVisible();
  await page.evaluate(() => (window as unknown as { __booked: () => void }).__booked());
  await page.waitForURL("**/booked");
  await expect(page.locator("h1")).toHaveText(
    section("the booked page").get("heading").replace("{name}", "TEST"),
  );
  // The name and the email are kept on the device, never in the address.
  expect(new URL(page.url()).search).toBe("");
});

test("a package card's button: the form is told the package, and /booked names it after the booking", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stub(page);
  await page.goto("/");
  const name = section(8).get("package 3, name");
  await press(page.locator('#packages [data-plan="3"] [data-apply-open]'));
  await expect(popup(page)).toBeVisible();
  expect((await opened(page)).at(-1)!.hiddenFields).toEqual({ package: name });
  await send(page, submission(who, answers, { extra: { package: name } }));
  await expect(calendar(page).locator("iframe")).toBeVisible();
  await page.evaluate(() => (window as unknown as { __booked: () => void }).__booked());
  await page.waitForURL("**/booked");
  await expect(page.locator("[data-picked]")).toHaveText(
    section("the booked page")
      .get("next, package line, only when a package was picked")
      .replace("{package}", name),
  );
  // Kept on the device, never in the address.
  expect(new URL(page.url()).search).toBe("");
});

test("/booked greets by name without waiting for the visit counter", async ({ page }) => {
  // The visit counter's server never answers here. The page's own script must still run.
  await page.route(/cloudflareinsights\.com/, () => new Promise(() => {}));
  await page.goto("/booked?attendeeName=TEST+Visitor", { waitUntil: "commit" });
  await expect(page.locator("h1")).toContainText("TEST");
});

test("when the calendar cannot load, a link to the booking page takes its place", async ({
  page,
}) => {
  await stub(page);
  await page.route("https://app.cal.com/**", (route) => route.abort());
  await apply(page, who);
  const link = page.locator("[data-calendar-link]");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", booking);
});
