import { expect, test, type Page } from "@playwright/test";
import { WHATSAPP_NUMBER } from "../src/config";

const SUBMIT = "Send my answers";
const KEYS = [
  "name",
  "email",
  "phone",
  "instagram",
  "language",
  "channel",
  "budget",
  "decision",
  "need",
  "timing",
  "heard",
  "referred_by",
  "lang",
  "tz",
  "page",
  "utm",
  "sent_at",
  "website",
];

const choose = (page: Page, question: string, label: string) =>
  page.locator(`#f-${question}`).getByRole("radio", { name: label, exact: true }).check();

async function fillValid(page: Page) {
  await page.fill("#f-name", "TEST Hanane");
  await page.fill("#f-email", "hanane@example.com");
  await page.fill("#f-phone", "+212 6 12 34 56 78");
  await page.fill("#f-instagram", "@hanane");
  await choose(page, "channel", "WhatsApp");
  await choose(page, "budget", "Not sure yet");
  await choose(page, "decision", "I decide alone");
  await choose(page, "need", "Bring me more clients");
  await choose(page, "timing", "This month");
}

/** Mocks /api/lead with the given answers in order; returns the bodies it received. */
async function mockLead(page: Page, answers: ("ok" | "down" | 502 | 400)[]) {
  const bodies: URLSearchParams[] = [];
  // /thanks loads Cal.com; keep the tests offline.
  await page.route("https://app.cal.com/**", (route) => route.abort());
  await page.route("**/api/lead", async (route) => {
    bodies.push(new URLSearchParams(route.request().postData() ?? ""));
    const answer = answers[bodies.length - 1] ?? "ok";
    if (answer === "down") return route.abort();
    if (answer === "ok") return route.fulfill({ json: { ok: true } });
    return route.fulfill({ status: answer, json: { ok: false } });
  });
  return bodies;
}

test("form shows each error, then clears it when fixed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(page.locator("#f-name-error")).toHaveText("Add your name.");
  await expect(page.locator("#f-email-error")).toContainText("Check your email address.");
  await expect(page.locator("#f-phone-error")).toContainText("country code");
  await expect(page.locator("#f-instagram-error")).toContainText("Add your Instagram handle");
  for (const q of ["channel", "budget", "decision", "need", "timing"]) {
    await expect(page.locator(`#f-${q}-error`)).toHaveText("Pick one.");
  }
  // The call language starts on the page's language, so it has no error.
  await expect(page.locator("#f-language-error")).toBeHidden();
  await expect(page.locator("#f-name")).toBeFocused();

  await page.fill("#f-email", "hanane@gmail");
  await page.locator("#f-email").blur();
  await expect(page.locator("#f-email-error")).toContainText("full domain");
  await page.fill("#f-email", "hanane@gmail.com");
  await expect(page.locator("#f-email-error")).toBeHidden();
  await choose(page, "budget", "Over $6,000");
  await expect(page.locator("#f-budget-error")).toBeHidden();
});

test("phone accepts international formats and refuses a local one", async ({ page }) => {
  await page.goto("/");
  const phone = page.locator("#f-phone");
  await expect(phone).toHaveAttribute("type", "tel");
  await expect(phone).toHaveAttribute("autocomplete", "tel");
  for (const bad of ["0612345678", "+212 6"]) {
    await phone.fill(bad);
    await phone.blur();
    await expect(page.locator("#f-phone-error")).toBeVisible();
  }
  for (const good of ["+212 6 12 34 56 78", "0033 6.12.34.56.78", "+1 (415) 555-0123"]) {
    await phone.fill(good);
    await phone.blur();
    await expect(page.locator("#f-phone-error")).toBeHidden();
  }
});

test("every field has a label", async ({ page }) => {
  await page.goto("/");
  const fields = page.locator(
    '#lead-form input:not([type="hidden"]):not([tabindex="-1"]), #lead-form select',
  );
  expect(await fields.count()).toBeGreaterThan(20);
  const unlabeled = await fields.evaluateAll((els) =>
    els
      .filter((el) => !(el as HTMLInputElement).labels?.[0]?.textContent?.trim())
      .map((el) => el.outerHTML),
  );
  expect(unlabeled).toEqual([]);
  for (const q of ["language", "channel", "budget", "decision", "need", "timing"]) {
    await expect(page.locator(`#f-${q} legend`)).not.toBeEmpty();
  }
});

test("a valid submit sends every field once, then goes to /thanks", async ({ page }) => {
  const bodies = await mockLead(page, ["ok"]);
  await page.goto("/?src=ig&utm_source=insta&utm_campaign=bio");
  await fillValid(page);
  await page.getByRole("button", { name: SUBMIT }).click();
  await page.waitForURL(/\/thanks\?/);

  expect(bodies).toHaveLength(1);
  const body = bodies[0]!;
  for (const key of KEYS) expect(body.has(key), key).toBe(true);
  expect(body.get("language")).toBe("English");
  expect(body.get("channel")).toBe("WhatsApp");
  expect(body.get("utm")).toBe("utm_source=insta&utm_campaign=bio&src=ig");
  expect(body.get("tz")).not.toBe("");
  expect(body.get("page")).toContain("/?src=ig");
  expect(body.get("website")).toBe("");
  const url = new URL(page.url());
  expect(url.searchParams.get("name")).toBe("TEST Hanane");
  expect(url.searchParams.get("email")).toBe("hanane@example.com");
});

test("a dropped request is retried once, then the visitor moves on", async ({ page }) => {
  const bodies = await mockLead(page, ["down", "ok"]);
  await page.goto("/");
  await fillValid(page);
  await page.getByRole("button", { name: SUBMIT }).click();
  await page.waitForURL(/\/thanks\?/);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]!.toString()).toBe(bodies[0]!.toString());
});

test("two failures show the error with a way out, and keep what was typed", async ({ page }) => {
  const bodies = await mockLead(page, [502, 502]);
  await page.goto("/");
  await fillValid(page);
  await page.getByRole("button", { name: SUBMIT }).click();
  const error = page.locator("#form-error");
  await expect(error).toBeVisible();
  await expect(error).toContainText("We couldn't save your answers.");
  expect(bodies).toHaveLength(2);
  if (WHATSAPP_NUMBER) {
    await expect(error.getByRole("link", { name: "Message me on WhatsApp" })).toHaveAttribute(
      "href",
      new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}`),
    );
  }
  await expect(error).toContainText("@arcbuildr");
  expect(page.url()).not.toContain("/thanks");
  await expect(page.locator("#f-name")).toHaveValue("TEST Hanane");
  await expect(
    page.locator("#f-budget").getByRole("radio", { name: "Not sure yet" }),
  ).toBeChecked();
  await expect(page.getByRole("button", { name: SUBMIT })).toBeEnabled();
});

test("a refused form (400) is not retried", async ({ page }) => {
  const bodies = await mockLead(page, [400]);
  await page.goto("/");
  await fillValid(page);
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(page.locator("#form-error")).toBeVisible();
  expect(bodies).toHaveLength(1);
});

test("the whole form works with the keyboard only", async ({ page }) => {
  const bodies = await mockLead(page, ["ok"]);
  await page.goto("/");
  await page.locator("#f-name").focus();
  const k = page.keyboard;
  await k.type("TEST Keys");
  await k.press("Tab");
  await k.type("keys@example.com");
  await k.press("Tab");
  await k.type("+33 6 12 34 56 78");
  await k.press("Tab");
  await k.type("@keys");
  await k.press("Tab"); // language: English is already chosen
  await k.press("ArrowRight"); // French
  for (let i = 0; i < 5; i++) {
    await k.press("Tab"); // channel, budget, decision, need, timing
    await k.press("Space");
  }
  await k.press("Tab"); // heard about us
  await k.press("Tab"); // referred by
  await k.press("Tab");
  await expect(page.getByRole("button", { name: SUBMIT })).toBeFocused();
  await k.press("Enter");
  await page.waitForURL(/\/thanks\?/);
  const body = bodies[0]!;
  expect(body.get("language")).toBe("French");
  expect(body.get("channel")).toBe("Phone call");
  expect(body.get("timing")).toBe("This month");
});

test("form and next page fit a 375 px phone with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.route("https://app.cal.com/**", (route) => route.abort());
  for (const path of ["/", "/thanks?name=A&email=a%40example.com"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the form is a plain POST with native required fields", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#lead-form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", "/api/lead");
    for (const id of ["name", "email", "phone", "instagram"]) {
      await expect(page.locator(`#f-${id}`)).toHaveAttribute("required", "");
    }
    await expect(page.locator('input[name="budget"]').first()).toHaveAttribute("required", "");
  });
});
