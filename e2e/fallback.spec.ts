import { expect, test, type Page } from "@playwright/test";
import { application as form } from "../src/content/site";
import { BOOKING_URL } from "../src/config";
import { answer, press } from "./press";
import { calendar, current, layer, open as openForm, stub } from "./stubs";

// The form must never leave anyone stuck. Each test here breaks one thing (the script does not arrive,
// arrives late, throws, the save fails, hangs, the connection drops) and checks that a name and an email
// still get through POST /api/apply.

const who = { name: "TEST Visitor", email: "test+a@example.com" };
const booking = `${BOOKING_URL}?${new URLSearchParams(who)}`;
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
const note = (page: Page) => page.locator("[data-apply] [data-note]");
const plain = (page: Page) => page.locator("[data-apply-plain]");
const plainName = (page: Page) => plain(page).locator("input[name=name]");
const plainEmail = (page: Page) => plain(page).locator("input[name=email]");
const okButton = (page: Page) => page.locator("[data-ok]");
const SCRIPTS = "**/_astro/*.js";
/** Answers every question up to the last one, which is left on screen. */
async function untilLast(page: Page) {
  const ids = form.questions.map((question) => question.id as string);
  for (const id of ids.slice(0, -1)) await answer(page, id, answers[id]!);
  await expect(page.locator('.q.is-current[data-id="budget"]')).toBeVisible();
}
const pickBudget = (page: Page) => press(current(page).locator(".choice").nth(1));
/** What the browser posted by itself: the fields of the form, as the Worker reads them. */
const posted = (calls: Awaited<ReturnType<typeof stub>>) => {
  const request = calls.applies.at(-1)!;
  expect(request.method()).toBe("POST");
  expect(request.headers()["content-type"]).toContain("application/x-www-form-urlencoded");
  return Object.fromEntries(new URLSearchParams(request.postData() ?? ""));
};
/** Errors thrown on the site's own pages. The booking page's stand-in is another site. */
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
  await expect(layer(page)).toBeVisible();
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
  await fillEntry(page);
  await page.waitForURL(booking);
  expect(posted(calls)).toMatchObject(who);
  expect(errors).toEqual([]);
});

test.describe("the form's script throws in the middle of the questions", () => {
  test.beforeEach(async ({ page }) => {
    // The next move between two questions throws, once the test says so.
    await page.addInitScript(() => {
      const push = history.pushState.bind(history);
      history.pushState = (...args) => {
        if ((window as unknown as { __break?: boolean }).__break) throw new Error("TEST: broken");
        return push(...args);
      };
    });
  });
  async function breakIt(page: Page) {
    await openForm(page, who);
    await answer(page, "profile", answers.profile!);
    await expect(page.locator('.q.is-current[data-id="sell"]')).toBeVisible();
    await page.evaluate(() => ((window as unknown as { __break?: boolean }).__break = true));
    await page.locator("#a-sell").fill(answers.sell!);
    await press(okButton(page));
  }

  test("the plain form takes over with what was typed, and the browser posts it", async ({
    page,
  }) => {
    const calls = await stub(page);
    const errors = siteErrors(page);
    await breakIt(page);
    await expect(plain(page)).toBeVisible();
    await expect(note(page)).toHaveText(form.plain.broken);
    await expect(page.locator("[data-ok-label]")).toHaveText(form.plain.send);
    await expect(plainName(page)).toHaveValue(who.name);
    await expect(plainEmail(page)).toHaveValue(who.email);
    await expect(plainName(page)).toBeFocused();
    await expect(page.locator(".q.is-current")).toBeHidden();
    await expect(page.locator("[data-back]")).toBeHidden();
    // Closing works, and an apply button opens the plain form again.
    await press(page.locator("[data-close]"));
    await expect(layer(page)).toBeHidden();
    await press(page.locator("#top [data-apply-open]"));
    await expect(plain(page)).toBeVisible();
    // An empty name goes nowhere.
    await plainName(page).fill("");
    await press(okButton(page));
    expect(calls.applies).toHaveLength(0);
    await plainName(page).fill("TEST Other");
    await press(okButton(page));
    await page.waitForURL(`${BOOKING_URL}?${new URLSearchParams({ ...who, name: "TEST Other" })}`);
    const fields = posted(calls);
    expect(fields).toMatchObject({
      name: "TEST Other",
      email: who.email,
      kind: "application",
      page: "/",
      profile: answers.profile,
      sell: answers.sell,
      company: "",
    });
    expect(fields.ref).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(fields.tz).not.toBe("");
    expect(errors).toEqual([]);
  });

  test("with no connection the plain form says so and stays, then posts once the connection is back", async ({
    page,
    context,
  }) => {
    const calls = await stub(page);
    await breakIt(page);
    await expect(plain(page)).toBeVisible();
    await context.setOffline(true);
    await press(okButton(page));
    await expect(note(page)).toHaveText(form.send.offline);
    await expect(plain(page)).toBeVisible();
    expect(calls.applies).toHaveLength(0);
    await context.setOffline(false);
    await press(okButton(page));
    await page.waitForURL(booking);
    expect(posted(calls)).toMatchObject(who);
  });
});

test("saving fails: the plain form takes the questions' place, and its button saves through /api/apply", async ({
  page,
}) => {
  const calls = await stub(page, "fail");
  await openForm(page, who);
  await untilLast(page);
  await pickBudget(page);
  await expect(note(page)).toHaveText(form.send.failed);
  await expect(plain(page)).toBeVisible();
  await expect(plainName(page)).toHaveValue(who.name);
  await expect(plainEmail(page)).toHaveValue(who.email);
  await expect(page.locator(".q.is-current")).toBeHidden();
  await expect(page.locator("[data-ok-label]")).toHaveText(form.send.retry);
  // Back shows the last question again, with its answer; the next try brings the plain form back.
  await press(page.locator("[data-back]"));
  await expect(page.locator('.q.is-current[data-id="budget"]')).toBeVisible();
  await expect(plain(page)).toBeHidden();
  await press(okButton(page));
  await expect(plain(page)).toBeVisible();
  // A name or an email that cannot be used is said, and nothing is sent.
  const tries = calls.applies.length;
  await plainEmail(page).fill("not an email");
  await press(okButton(page));
  await expect(plain(page).locator("[data-plain-err]")).toHaveText(form.who[1].err);
  await plainEmail(page).fill(who.email);
  await expect(plain(page).locator("[data-plain-err]")).toHaveText("");
  // A letter typed in the name is a letter, never a choice of the question behind.
  await plainName(page).fill("");
  await plainName(page).pressSequentially("TEST Abe");
  expect(calls.applies).toHaveLength(tries);
  calls.save = "ok";
  await press(okButton(page));
  await expect(calendar(page)).toBeVisible();
  const sent = calls.applies.at(-1)!.postDataJSON();
  expect(sent).toMatchObject({ plain: true, name: "TEST Abe", email: who.email, answers });
  expect(sent.id).toBe(calls.applies[0]!.postDataJSON().id);
  expect(calls.applies).toHaveLength(tries + 1);
});

test("no connection: the plain form shows, and the form saves by itself once the connection is back", async ({
  page,
  context,
}) => {
  const calls = await stub(page);
  await openForm(page, who);
  await untilLast(page);
  await context.setOffline(true);
  await pickBudget(page);
  await expect(note(page)).toHaveText(form.send.offline);
  await expect(plain(page)).toBeVisible();
  await expect(plainName(page)).toHaveValue(who.name);
  expect(calls.applies).toHaveLength(0);
  await context.setOffline(false);
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies).toHaveLength(1);
  expect(calls.applies[0]!.postDataJSON()).toMatchObject({ plain: true, ...who, answers });
});

test("a save that never answers: the form says it is slow, gives up, and the plain form saves on the next try", async ({
  page,
}) => {
  const calls = await stub(page, "hang");
  await page.clock.install();
  await openForm(page, who);
  await untilLast(page);
  await pickBudget(page);
  await expect(note(page)).toHaveText(form.send.saving);
  await page.clock.fastForward(8000);
  await expect(note(page)).toHaveText(form.send.slow);
  await expect(plain(page)).toBeHidden();
  await page.clock.fastForward(12000);
  await expect(note(page)).toHaveText(form.send.failed);
  await expect(plain(page)).toBeVisible();
  calls.save = "ok";
  await press(okButton(page));
  await expect(calendar(page)).toBeVisible();
  expect(calls.applies).toHaveLength(2);
  expect(calls.applies[1]!.postDataJSON()).toMatchObject({ plain: true, ...who, answers });
});
