import { expect, test } from "@playwright/test";

const fields = ["name", "email", "instagram", "business", "goal"];

test("form shows each error, then clears it when fixed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Send and pick a time" }).click();
  await expect(page.locator("#f-name-error")).toHaveText("Add your name.");
  await expect(page.locator("#f-email-error")).toContainText("Check your email address.");
  await expect(page.locator("#f-instagram-error")).toContainText("Add your Instagram handle");
  await expect(page.locator("#f-business-error")).toContainText("Add one line");
  await expect(page.locator("#f-name")).toBeFocused();

  await page.fill("#f-email", "hanane@gmail");
  await page.locator("#f-email").blur();
  await expect(page.locator("#f-email-error")).toContainText("full domain");
  await page.fill("#f-email", "hanane@gmail.com");
  await expect(page.locator("#f-email-error")).toBeHidden();
  await expect(page.locator("#f-email")).not.toHaveAttribute("aria-invalid", "true");
});

test("keyboards and attributes fit the fields", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#f-email")).toHaveAttribute("type", "email");
  const ig = page.locator("#f-instagram");
  await expect(ig).toHaveAttribute("autocapitalize", "none");
  await expect(ig).toHaveAttribute("autocorrect", "off");
  await expect(page.locator("#f-goal")).not.toHaveAttribute("required", "");
  for (const id of ["name", "email", "instagram", "business"]) {
    await expect(page.locator(`#f-${id}`)).toHaveAttribute("required", "");
  }
});

test("a valid submit sends every field once, shows Sending, then goes to /thanks", async ({
  page,
}) => {
  const bodies: URLSearchParams[] = [];
  await page.route("**/api/lead", async (route) => {
    bodies.push(new URLSearchParams(route.request().postData() ?? ""));
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/?src=ig");
  await page.fill("#f-name", "Hanane");
  await page.fill("#f-email", "hanane@example.com");
  await page.fill("#f-instagram", "@hanane");
  await page.fill("#f-business", "Coaching studio");
  await page.fill("#f-goal", "Be known for what I do.");

  const button = page.getByRole("button", { name: "Send and pick a time" });
  await button.click();
  await expect(page.getByRole("button", { name: "Sending..." })).toBeDisabled();
  await page.waitForURL(/\/thanks\?/);

  expect(bodies).toHaveLength(1);
  const body = bodies[0]!;
  for (const key of [...fields, "src", "referrer", "sent_at", "website"]) {
    expect(body.has(key), key).toBe(true);
  }
  expect(body.get("src")).toBe("ig");
  expect(body.get("website")).toBe("");
  expect(Number.isNaN(Date.parse(body.get("sent_at")!))).toBe(false);
  const url = new URL(page.url());
  expect(url.searchParams.get("name")).toBe("Hanane");
  expect(url.searchParams.get("email")).toBe("hanane@example.com");
});

test("an unknown src falls back to direct", async ({ page }) => {
  let src = "";
  await page.route("**/api/lead", async (route) => {
    src = new URLSearchParams(route.request().postData() ?? "").get("src") ?? "";
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/?src=evil");
  await page.fill("#f-name", "A");
  await page.fill("#f-email", "a@example.com");
  await page.fill("#f-instagram", "@a");
  await page.fill("#f-business", "B");
  await page.getByRole("button", { name: "Send and pick a time" }).click();
  await page.waitForURL(/\/thanks\?/);
  expect(src).toBe("direct");
});

test("a server failure shows the message and keeps what was typed", async ({ page }) => {
  await page.route("**/api/lead", (route) => route.fulfill({ status: 502, json: { ok: false } }));
  await page.goto("/");
  await page.fill("#f-name", "Hanane");
  await page.fill("#f-email", "hanane@example.com");
  await page.fill("#f-instagram", "@hanane");
  await page.fill("#f-business", "Coaching studio");
  await page.fill("#f-goal", "Be known.");
  await page.getByRole("button", { name: "Send and pick a time" }).click();
  await expect(page.locator("#form-error")).toContainText("We couldn't send your details.");
  await expect(page.locator("#form-error")).toContainText("What you typed is still here.");
  expect(page.url()).not.toContain("/thanks");
  await expect(page.locator("#f-name")).toHaveValue("Hanane");
  await expect(page.locator("#f-goal")).toHaveValue("Be known.");
  await expect(page.getByRole("button", { name: "Send and pick a time" })).toBeEnabled();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the form is a plain POST with native required fields", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#lead-form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", "/api/lead");
    await expect(page.locator("#f-name")).toHaveAttribute("required", "");
  });
});
