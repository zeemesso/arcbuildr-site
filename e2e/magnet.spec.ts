import { expect, test, type Page } from "@playwright/test";
import {
  FIELD,
  answerField,
  PLAN_API_PATH,
  planPagePath,
  submitPath,
  unsubscribeApiPath,
  unsubscribePagePath,
  type PlanState,
  type SubmitResult,
} from "../src/lib/magnet/contract";
import {
  FIELD_ERROR,
  FORM_TEXT,
  PLAN_TEXT,
  SUBMIT_ERROR,
  UNSUBSCRIBE_TEXT,
} from "../src/lib/magnet/text";
import { testSample } from "../src/magnets/test-sample";

const MAGNET = `/m/${testSample.slug}`;
const TEST_TOKEN = "0123456789abcdefghij-_";
const RESULT = planPagePath(TEST_TOKEN);
const STORAGE_KEY = `arcbuildr:magnet:${testSample.slug}`;
const [business, stuck, posting, goal, notes] = testSample.questions;
const BUSINESS = "I sell workshops to local shops.";
const STUCK = "I run out of ideas.\nThen I stop posting.";
const GOAL = "Book more workshops.";
const NAME = "TEST Hanane";
const EMAIL = "hanane@example.com";
const INSTAGRAM = "@hanane";

const question = (page: Page, label: string) => page.getByLabel(label, { exact: true });
const button = (page: Page, label: string) =>
  page.getByRole("button", { name: label, exact: true });
const next = (page: Page) => button(page, FORM_TEXT.next).click();

async function walkQuestions(page: Page) {
  await button(page, FORM_TEXT.start).click();
  await question(page, business!.label).fill(BUSINESS);
  await next(page);
  await question(page, stuck!.label).fill(STUCK);
  await next(page);
  await page.getByRole("radio", { name: "Every week" }).check();
  await next(page);
  await question(page, goal!.label).fill(GOAL);
  await next(page);
  await next(page);
}

async function fillContact(page: Page, consent = true) {
  await question(page, FORM_TEXT.name).fill(NAME);
  await question(page, FORM_TEXT.email).fill(EMAIL);
  await question(page, FORM_TEXT.instagram).fill(INSTAGRAM);
  if (consent) await page.getByRole("checkbox", { name: FORM_TEXT.consent }).check();
}

async function mockSubmit(page: Page, answers: (SubmitResult | "down" | "html")[]) {
  const bodies: FormData[] = [];
  await page.route("**/api/magnet/**", async (route) => {
    const request = route.request();
    expect(new URL(request.url()).pathname).toBe(submitPath(testSample.slug));
    expect(request.method()).toBe("POST");
    const headers = request.headers();
    expect(headers.accept).toBe("application/json");
    const body = await new Response(request.postData(), {
      headers: { "content-type": headers["content-type"]! },
    }).formData();
    bodies.push(body);
    const answer = answers[bodies.length - 1]!;
    if (answer === "down") return route.abort();
    if (answer === "html")
      return route.fulfill({ status: 502, contentType: "text/html", body: "<p>Bad gateway</p>" });
    return route.fulfill({ json: answer, status: answer.ok ? 200 : 400 });
  });
  return bodies;
}

test("walks the draft, validates each step, and submits the contract fields", async ({ page }) => {
  const bodies = await mockSubmit(page, [{ ok: true, url: RESULT }]);
  // The result route is covered separately; keep this mock scoped to the submission.
  await page.route(`**${PLAN_API_PATH}`, (route) =>
    route.fulfill({ json: { status: "working" } satisfies PlanState }),
  );
  await page.goto(`${MAGNET}?rr=abc12345&utm_source=insta&src=dm#intro`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(testSample.title);
  await expect(page.getByText(FORM_TEXT.draft, { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(question(page, business!.label)).toBeHidden();
  await button(page, FORM_TEXT.start).click();

  const first = question(page, business!.label);
  await expect(first).toBeFocused();
  await expect(page.getByRole("progressbar")).toHaveAccessibleName(FORM_TEXT.progress(1, 5));
  await next(page);
  await expect(page.locator("#magnet-q_business-error")).toHaveText(FIELD_ERROR.answer);
  await expect(first).toHaveAttribute("aria-invalid", "true");
  await expect(first).toHaveAccessibleDescription(FIELD_ERROR.answer);
  await first.fill(BUSINESS);
  await first.press("Enter");

  const paragraph = question(page, stuck!.label);
  await expect(paragraph).toBeFocused();
  await paragraph.fill("I run out of ideas.");
  await paragraph.press("Enter");
  await paragraph.press("End");
  await paragraph.pressSequentially("Then I stop posting.");
  await expect(paragraph).toHaveValue(STUCK);
  await next(page);

  const frequency = page.getByRole("group", { name: posting!.label });
  await next(page);
  await expect(frequency.getByText(FIELD_ERROR.choice, { exact: true })).toBeVisible();
  await frequency.getByRole("radio", { name: "Every week" }).check();
  await expect(frequency).toBeVisible();
  await next(page);
  await question(page, goal!.label).fill(GOAL);
  await next(page);
  await expect(question(page, notes!.label)).toHaveValue("");
  await expect(page.getByText(FORM_TEXT.optional, { exact: true })).toBeVisible();
  await button(page, FORM_TEXT.back).click();
  await expect(question(page, goal!.label)).toHaveValue(GOAL);
  await next(page);
  await next(page);

  const send = button(page, FORM_TEXT.send);
  await expect(page.getByRole("heading", { name: FORM_TEXT.contactTitle })).toBeFocused();
  await send.click();
  for (const key of ["name", "email", "instagram", "consent"] as const) {
    await expect(page.locator(`#magnet-${FIELD[key]}-error`)).toHaveText(FIELD_ERROR[key]);
  }
  expect(bodies).toHaveLength(0);
  await fillContact(page);
  await send.click();
  await page.waitForURL(`**${RESULT}`);

  expect(bodies).toHaveLength(1);
  const body = bodies[0]!;
  expect(Object.fromEntries(body)).toEqual({
    [answerField("business")]: BUSINESS,
    [answerField("stuck")]: STUCK.replace("\n", "\r\n"),
    [answerField("posting")]: "Weekly",
    [answerField("goal")]: GOAL,
    [answerField("notes")]: "",
    [FIELD.name]: NAME,
    [FIELD.email]: EMAIL,
    [FIELD.instagram]: INSTAGRAM,
    [FIELD.phone]: "",
    [FIELD.consent]: "on",
    [FIELD.trap]: "",
    [FIELD.timeZone]: expect.any(String),
    [FIELD.page]: new URL(`${MAGNET}?rr=abc12345&utm_source=insta&src=dm`, page.url()).href,
    [FIELD.utm]: "utm_source=insta&src=dm",
    [FIELD.replyRail]: "abc12345",
    [FIELD.sentAt]: expect.any(String),
  });
  expect([...body.keys()]).toHaveLength(16);
  expect(body.get(FIELD.timeZone)).not.toBe("");
  const sentAt = String(body.get(FIELD.sentAt));
  expect(new Date(sentAt).toISOString()).toBe(sentAt);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test("server errors return to the first marked question", async ({ page }) => {
  const message = "Tell us a little more about where you are stuck.";
  await mockSubmit(page, [
    {
      ok: false,
      error: SUBMIT_ERROR.check,
      errors: { [FIELD.email]: FIELD_ERROR.email, q_stuck: message },
    },
  ]);
  await page.goto(MAGNET);
  await walkQuestions(page);
  await fillContact(page);
  await button(page, FORM_TEXT.send).click();
  const input = question(page, stuck!.label);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(STUCK);
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(new RegExp(message));
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(SUBMIT_ERROR.check);
});

test("reload restores answers and contact details without restoring consent", async ({ page }) => {
  await page.goto(MAGNET);
  await walkQuestions(page);
  await fillContact(page);
  const consent = await page.evaluate(
    ({ key, field }) => JSON.parse(localStorage.getItem(key) ?? "{}")[field],
    { key: STORAGE_KEY, field: FIELD.consent },
  );
  expect(consent).toBeUndefined();
  await page.reload();
  await expect(page.getByText(FORM_TEXT.saved, { exact: true })).toBeVisible();
  await button(page, FORM_TEXT.start).click();
  await expect(question(page, business!.label)).toHaveValue(BUSINESS);
  await next(page);
  await expect(question(page, stuck!.label)).toHaveValue(STUCK);
  await next(page);
  await expect(page.getByRole("radio", { name: "Every week" })).toBeChecked();
  await next(page);
  await expect(question(page, goal!.label)).toHaveValue(GOAL);
  await next(page);
  await next(page);
  await expect(question(page, FORM_TEXT.email)).toHaveValue(EMAIL);
  await expect(page.getByRole("checkbox", { name: FORM_TEXT.consent })).not.toBeChecked();
});

test("network and non-JSON failures preserve the form and allow retry", async ({ page }) => {
  const bodies = await mockSubmit(page, ["down", "html"]);
  await page.goto(`${MAGNET}?rr=bad`);
  await walkQuestions(page);
  await fillContact(page);
  const send = button(page, FORM_TEXT.send);
  for (const attempt of [1, 2]) {
    await send.click();
    await expect(page.getByRole("alert")).toHaveText(SUBMIT_ERROR.failure);
    await expect(send).toBeEnabled();
    await expect(question(page, FORM_TEXT.email)).toHaveValue(EMAIL);
    expect(bodies).toHaveLength(attempt);
    expect(bodies[attempt - 1]!.get(FIELD.replyRail)).toBe("");
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the questions and contact fields are a plain POST form", async ({ page }) => {
    const bodies: URLSearchParams[] = [];
    const path = submitPath(testSample.slug);
    await page.route("**/api/magnet/**", (route) => {
      expect(route.request().method()).toBe("POST");
      bodies.push(new URLSearchParams(route.request().postData() ?? ""));
      return route.fulfill({ contentType: "text/html", body: "<p>Sent</p>" });
    });
    await page.goto(MAGNET);
    const form = page.locator("#magnet-form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", submitPath(testSample.slug));
    for (const item of [business, stuck, goal, notes]) {
      await expect(question(page, item!.label)).toBeVisible();
    }
    await expect(question(page, business!.label)).toHaveAttribute("required", "");
    await expect(question(page, notes!.label)).not.toHaveAttribute("required", "");
    await expect(page.getByRole("radio", { name: "Every week" })).toBeVisible();
    await expect(question(page, FORM_TEXT.name)).toHaveAttribute("required", "");
    await expect(page.getByRole("checkbox", { name: FORM_TEXT.consent })).toHaveAttribute(
      "required",
      "",
    );
    await expect(button(page, FORM_TEXT.start)).toBeHidden();
    await expect(button(page, FORM_TEXT.send)).toBeVisible();
    await question(page, business!.label).fill(BUSINESS);
    await question(page, stuck!.label).fill(STUCK);
    await page.getByRole("radio", { name: "Every week" }).check();
    await question(page, goal!.label).fill(GOAL);
    await fillContact(page);
    await button(page, FORM_TEXT.send).click();
    await page.waitForURL(`**${path}`);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.get(answerField("business"))).toBe(BUSINESS);
    expect(bodies[0]?.get(FIELD.consent)).toBe("on");
  });
});

test("a bad fragment shows the bad-link message without an API call", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/api/magnet/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto("/plan/#bad");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(PLAN_TEXT.badLink);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  expect(requests).toEqual([]);
});

test("a working plan polls through a failed request, then renders the plan and CTA", async ({
  page,
}) => {
  let polls = 0;
  let plan: PlanState = { status: "working" };
  await page.clock.install();
  await page.route("**/api/magnet/**", (route) => {
    const request = route.request();
    expect(new URL(request.url()).pathname).toBe(PLAN_API_PATH);
    expect(request.method()).toBe("GET");
    expect(request.headers().accept).toBe("application/json");
    expect(request.headers().authorization).toBe(`Bearer ${TEST_TOKEN}`);
    expect(request.headers().referer).toBeUndefined();
    polls += 1;
    return polls === 2 ? route.abort() : route.fulfill({ json: plan });
  });
  await page.goto(RESULT);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(PLAN_TEXT.workingTitle);
  await expect(page.getByText(PLAN_TEXT.workingBody, { exact: true })).toBeVisible();
  await expect.poll(() => polls).toBe(1);

  plan = {
    status: "ready",
    title: "Your sample plan",
    name: NAME,
    html: "<h2>First step</h2><p>Show the work <strong>each week</strong>.</p>",
  };
  await expect
    .poll(async () => {
      await page.clock.runFor(3_000);
      return polls;
    })
    .toBe(3);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(plan.title);
  await expect(page.getByText(PLAN_TEXT.kicker(NAME), { exact: true })).toBeVisible();
  const article = page.getByRole("article");
  await expect(article.getByRole("heading", { level: 2 })).toHaveText("First step");
  await expect(article.locator("strong")).toHaveText("each week");
  await expect(page.getByRole("heading", { name: PLAN_TEXT.ctaTitle })).toBeVisible();
  await expect(page.getByText(PLAN_TEXT.ctaBody, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: PLAN_TEXT.ctaButton })).toHaveAttribute(
    "href",
    PLAN_TEXT.ctaHref,
  );
});

test("an unavailable plan shows the server's message", async ({ page }) => {
  await page.route("**/api/magnet/**", (route) =>
    route.fulfill({
      status: 404,
      json: { status: "unavailable", message: PLAN_TEXT.held } satisfies PlanState,
    }),
  );
  await page.goto(RESULT);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(PLAN_TEXT.held);
  await expect(page.getByRole("article")).toBeHidden();
  await expect(page.getByRole("link", { name: PLAN_TEXT.ctaButton })).toBeHidden();
});

test("the stop page does nothing until the click, then stops the emails", async ({ page }) => {
  const requests: string[] = [];
  let answer: "down" | "ok" = "down";
  await page.route("**/api/magnet/**", (route) => {
    const request = route.request();
    requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return answer === "down" ? route.abort() : route.fulfill({ json: { ok: true } });
  });
  await page.goto(unsubscribePagePath(TEST_TOKEN));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(UNSUBSCRIBE_TEXT.title);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  expect(requests).toEqual([]);

  const stop = page.getByRole("button", { name: UNSUBSCRIBE_TEXT.button, exact: true });
  await stop.click();
  await expect(page.getByRole("status")).toHaveText(UNSUBSCRIBE_TEXT.failure);
  answer = "ok";
  await stop.click();
  await expect(page.getByRole("status")).toHaveText(UNSUBSCRIBE_TEXT.done);
  await expect(stop).toBeHidden();
  expect(requests).toEqual(Array(2).fill(`POST ${unsubscribeApiPath(TEST_TOKEN)}`));
});

test("the stop page with a broken link offers no button", async ({ page }) => {
  await page.goto("/unsubscribe/#bad");
  await expect(page.getByRole("status")).toHaveText(UNSUBSCRIBE_TEXT.badLink);
  await expect(page.getByRole("button")).toBeHidden();
});
