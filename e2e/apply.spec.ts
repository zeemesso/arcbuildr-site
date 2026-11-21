import { expect, test, type Page } from "@playwright/test";
import { application as form, booked } from "../src/content/site";
import { section } from "../src/content/deck";
import { BOOKING_URL } from "../src/config";
import { answer, press } from "./press";
import { calendar, current, ending, layer, open as openForm, stub } from "./stubs";

const who = { name: "TEST Visitor", email: "test+a@example.com" };
/** The choices of one question, as the deck lists them. */
const options = (id: string) => {
  const question = form.questions.find((item) => item.id === id)!;
  return question.type === "choice" ? question.options : [];
};
const answers: Record<string, string> = {
  profile: "@test.visitor",
  sell: "TEST: bookkeeping. One client is worth 2,000 USD.",
  stranger: "TEST: that I do the books.",
  film: options("film")[2]!,
  count: options("count")[0]!,
  decides: options("decides")[1]!,
  start: options("start")[3]!,
  budget: options("budget")[1]!,
};
const booking = `${BOOKING_URL}?${new URLSearchParams(who)}`;
const KEY = "arcbuildr-application";

const note = (page: Page) => page.locator("[data-apply] [data-note]");
const open = (page: Page) => openForm(page, who);
/** Answers the questions from `from` up to, not including, `until`. */
async function type(page: Page, until = "budget", from = "profile") {
  const ids = form.questions.map((question) => question.id as string);
  for (const id of ids.slice(ids.indexOf(from), ids.indexOf(until)))
    await answer(page, id, answers[id]!);
  await expect(page.locator(`.q.is-current[data-id="${until}"]`)).toBeVisible();
}
const pickBudget = (page: Page) => press(current(page).locator(".choice").nth(1));

for (const where of ["#apply"]) {
  test(`${where}: an empty or wrong entry stays put, says why and clears as you type`, async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/");
    const name = page.locator(`${where} input[name=name]`);
    const email = page.locator(`${where} input[name=email]`);
    const errors = page.locator(`${where} [data-entry-err]`);
    await press(page.locator(`${where} form button`));
    await expect(errors.nth(0)).toHaveText(form.who[0].err);
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(layer(page)).toBeHidden();
    await name.fill(who.name);
    await expect(errors.nth(0)).toHaveText("");
    await email.fill("bad@address");
    await press(page.locator(`${where} form button`));
    await expect(errors.nth(1)).toHaveText(form.who[1].err);
    await expect(email).toBeFocused();
    await expect(layer(page)).toBeHidden();
    await email.fill(who.email);
    await expect(errors.nth(1)).toHaveText("");
  });
}

test("a name and an email open the form on the page and record one lead", async ({ page }) => {
  const calls = await stub(page);
  await page.goto("/?src=card&utm_source=test&other=1");
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await page.locator("#apply input[name=email]").press("Enter");
  await expect(layer(page)).toBeVisible();
  await expect(layer(page)).toHaveAttribute("role", "dialog");
  await expect(page.locator("[data-hi]")).toContainText("8 questions, about 3 minutes");
  await expect(page.locator("[data-count]")).toHaveText("1");
  await expect(current(page).locator("label")).toHaveText(form.questions[0].q);
  await expect(page).toHaveURL(/#apply$/);
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

test("eight answers are saved once, then the calendar shows inside the page with name and email filled", async ({
  page,
}) => {
  const calls = await stub(page);
  await open(page);
  await type(page);
  await expect(page.locator("[data-count]")).toHaveText("8");
  await expect(page.locator("[data-ok-label]")).toHaveText(form.finish);
  await pickBudget(page);
  await expect(calendar(page)).toBeVisible();
  const frame = calendar(page).locator("iframe");
  await expect(frame).toHaveAttribute("data-link", new URL(BOOKING_URL).pathname.slice(1));
  await expect(frame).toHaveAttribute("data-name", who.name);
  await expect(frame).toHaveAttribute("data-email", who.email);
  // The form is gone, the layer stays, and nobody left the site.
  await expect(current(page)).toBeHidden();
  await expect(layer(page)).toBeVisible();
  await expect(ending(page)).toBeHidden();
  await expect(page.locator("[data-calendar-link]")).toBeHidden();
  expect(new URL(page.url()).pathname).toBe("/");
  expect(calls.applies).toHaveLength(1);
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
  expect(body.id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  expect(body.tz).not.toBe("");
});

test("the answers leave this device only once they are saved", async ({ page }) => {
  await stub(page);
  await open(page);
  await type(page);
  const kept = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(kept.answers).toMatchObject({ profile: answers.profile, start: answers.start });
  await pickBudget(page);
  await expect(calendar(page)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
});

test("someone who applied in this visit goes straight to the calendar the second time", async ({
  page,
}) => {
  const calls = await stub(page);
  await open(page);
  await type(page);
  await pickBudget(page);
  await expect(calendar(page)).toBeVisible();
  await page.goto("/");
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await press(page.locator("#apply form button"));
  await expect(calendar(page)).toBeVisible();
  await expect(calendar(page).locator("iframe")).toHaveAttribute("data-email", who.email);
  expect(calls.applies).toHaveLength(1);
});

test("a question left empty, typed or picked, says what to fix", async ({ page }) => {
  await stub(page);
  await open(page);
  await press(page.locator("[data-ok]"));
  await expect(current(page).locator("[data-err]")).toBeVisible();
  await expect(current(page).locator("[data-err]")).toHaveText(form.questions[0].err);
  await expect(current(page).locator("#a-profile")).toHaveAttribute("aria-invalid", "true");
  await current(page).locator("#a-profile").fill(answers.profile!);
  await expect(current(page).locator("[data-err]")).toBeHidden();
  await type(page, "count");
  await press(page.locator("[data-ok]"));
  await expect(current(page).locator("[data-err]")).toHaveText(form.questions[4].err);
  await expect(page.locator('.q.is-current[data-id="count"]')).toBeVisible();
  await answer(page, "count", answers.count!);
  await expect(page.locator('.q.is-current[data-id="decides"]')).toBeVisible();
});

test("Back returns to the question before, with its answer", async ({ page }) => {
  await stub(page);
  await open(page);
  await type(page, "stranger");
  await press(page.locator("[data-back]"));
  await expect(current(page).locator("#a-sell")).toHaveValue(answers.sell!);
  await page.goBack();
  await expect(current(page).locator("#a-profile")).toHaveValue(answers.profile!);
  await expect(layer(page)).toBeVisible();
});

test("a refresh comes back to the same question with everything typed", async ({ page }) => {
  await stub(page);
  await open(page);
  await type(page, "film");
  await page.reload();
  await expect(layer(page)).toBeVisible();
  await expect(page.locator('.q.is-current[data-id="film"]')).toBeVisible();
  await press(page.locator("[data-back]"));
  await expect(current(page).locator("#a-stranger")).toHaveValue(answers.stranger!);
});

test("closing keeps the answers, and opening again says so", async ({ page }) => {
  await stub(page);
  await open(page);
  await type(page, "stranger");
  await page.keyboard.press("Escape");
  await expect(layer(page)).toBeHidden();
  await expect(page).not.toHaveURL(/#apply$/);
  await press(page.locator("#apply form button"));
  await expect(layer(page)).toBeVisible();
  await expect(page.locator("[data-hi]")).toHaveText(form.again);
  await expect(page.locator('.q.is-current[data-id="stranger"]')).toBeVisible();
  await press(page.locator("[data-close]"));
  await expect(layer(page)).toBeHidden();
});

test("when saving fails the form says so, keeps every answer and saves on the next try", async ({
  page,
}) => {
  const calls = await stub(page, "fail");
  await open(page);
  await type(page);
  await pickBudget(page);
  await expect(note(page)).toHaveText(form.send.failed);
  await expect(page.locator("[data-ok-label]")).toHaveText(form.send.retry);
  await expect(page.locator("[data-anyway]")).toBeVisible();
  await expect(page.locator("[data-anyway]")).toHaveText(form.send.anyway);
  await expect(page).toHaveURL(/#apply$/);
  const kept = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(kept.answers).toEqual(answers);
  calls.save = "ok";
  await press(page.locator("[data-ok]"));
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies).toHaveLength(2);
  // The second try is the same application, so the sheet can tell it from a new one.
  expect(calls.applies[1]!.postDataJSON().id).toBe(calls.applies[0]!.postDataJSON().id);
});

test("with no connection the form says so, keeps the answers and saves when the connection is back", async ({
  page,
  context,
}) => {
  const calls = await stub(page);
  await open(page);
  await type(page);
  await context.setOffline(true);
  await pickBudget(page);
  await expect(note(page)).toHaveText(form.send.offline);
  const kept = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(kept.answers).toEqual(answers);
  expect(calls.applies).toHaveLength(0);
  // Back online: the form sends by itself, once, and moves on.
  await context.setOffline(false);
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies).toHaveLength(1);
});

test("Pick a time anyway books with the answers kept, and the page after booking saves them", async ({
  page,
}) => {
  const calls = await stub(page, "fail");
  await open(page);
  await type(page);
  await pickBudget(page);
  await expect(page.locator("[data-anyway]")).toBeVisible();
  await press(page.locator("[data-anyway]"));
  await page.waitForURL(booking);
  const id = calls.applies[0]!.postDataJSON().id;
  calls.save = "ok";
  await page.goto("/booked?attendeeName=TEST+Visitor&email=test%2Ba%40example.com");
  await expect(page.locator("[data-resend-note]")).toHaveText(booked.resent);
  await expect(page.locator("[data-resend-retry]")).toBeHidden();
  const again = calls.applies.at(-1)!.postDataJSON();
  expect(again).toMatchObject({ id, ...who, answers, kind: "application", page: "/booked" });
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
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
  await open(page);
  await type(page);
  await pickBudget(page);
  await press(page.locator("[data-anyway]"));
  await page.waitForURL(booking);
  await page.goto("/booked");
  await expect(page.locator("[data-resend-note]")).toHaveText(booked.unsent);
  const retry = page.locator("[data-resend-retry]");
  await expect(retry).toBeVisible();
  await expect(retry).toHaveText(booked.retry);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).not.toBeNull();
  calls.save = "ok";
  await press(retry);
  await expect(page.locator("[data-resend-note]")).toHaveText(booked.resent);
  await expect(retry).toBeHidden();
});

test("the trap field is out of reach for people and empty in what is sent", async ({ page }) => {
  await stub(page);
  await open(page);
  const trap = page.locator("[data-trap]");
  await expect(trap).not.toBeInViewport();
  await expect(trap).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".apply__trap")).toHaveAttribute("aria-hidden", "true");
});

test("the form opens from a link on another page", async ({ page }) => {
  await stub(page);
  await page.goto("/privacy");
  await press(page.locator("header a[data-apply]"));
  await expect(page).toHaveURL(/\/#apply$/);
  await expect(layer(page)).toBeVisible();
  await expect(current(page).locator("#a-name")).toBeVisible();
  await current(page).locator("#a-name").fill(who.name);
  await current(page).locator("#a-name").press("Enter");
  await current(page).locator("#a-email").fill("not-an-email");
  await current(page).locator("#a-email").press("Enter");
  await expect(current(page).locator("[data-err]")).toHaveText(form.who[1].err);
  await current(page).locator("#a-email").fill(who.email);
  await current(page).locator("#a-email").press("Enter");
  await expect(current(page).locator("#a-profile")).toBeVisible();
});

test("the header's button opens the form", async ({ page }) => {
  await stub(page);
  await page.goto("/");
  await page.locator("#how").scrollIntoViewIfNeeded();
  await press(page.locator(".bar__cta"));
  await expect(layer(page)).toBeVisible();
  await expect(current(page).locator("#a-name")).toBeVisible();
});

test("keyboard only: Enter moves on and letters pick the choices", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "A keyboard run");
  const calls = await stub(page);
  await open(page);
  await type(page, "film");
  const picks = { film: "e", count: "b", decides: "a", start: "d", budget: "c" };
  for (const [id, letter] of Object.entries(picks)) {
    await expect(page.locator(`.q.is-current[data-id="${id}"]`)).toBeVisible();
    await page.keyboard.press(letter);
  }
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies[0]!.postDataJSON().answers).toMatchObject({
    film: options("film")[4],
    count: options("count")[1],
    decides: options("decides")[0],
    start: options("start")[3],
    budget: options("budget")[2],
  });
});

test("a budget under 750 USD ends the form with the deck's message, and no calendar", async ({
  page,
}) => {
  const calls = await stub(page);
  await open(page);
  await type(page);
  await expect(page.locator("[data-ok-label]")).toHaveText(form.finish);
  await press(current(page).locator(".choice").first());
  await expect(ending(page)).toBeVisible();
  const lines = ["budget, under 750, line 1", "budget, under 750, line 2"].map((slot) =>
    section(13).get(slot).replace("{name}", "TEST"),
  );
  await expect(ending(page).locator("p")).toHaveText(lines);
  // The answers are saved all the same, with the budget they picked.
  expect(calls.applies).toHaveLength(1);
  expect(calls.applies[0]!.postDataJSON().answers.budget).toBe(options("budget")[0]);
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
  expect(calls.applies).toHaveLength(1);
  expect(calls.calendars).toHaveLength(0);
});

test("a budget under 750 USD gets no way round to the calendar when saving fails", async ({
  page,
}) => {
  await stub(page, "fail");
  await open(page);
  await type(page);
  await press(current(page).locator(".choice").first());
  await expect(note(page)).toHaveText(form.send.failed);
  await expect(page.locator("[data-anyway]")).toBeHidden();
});

test("a finished booking lands on /booked, greeted by first name", async ({ page }) => {
  await stub(page);
  await open(page);
  await type(page);
  await pickBudget(page);
  await expect(calendar(page).locator("iframe")).toBeVisible();
  await page.evaluate(() => (window as unknown as { __booked: () => void }).__booked());
  await page.waitForURL("**/booked");
  await expect(page.locator("h1")).toHaveText(section(14).get("heading").replace("{name}", "TEST"));
  // The name and the email are kept on the device, never in the address.
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
  await open(page);
  await type(page);
  await pickBudget(page);
  const link = page.locator("[data-calendar-link]");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", booking);
});
