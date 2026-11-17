import { expect, test, type Page } from "@playwright/test";
import { entry } from "../src/content/site";
const destination = "https://tally.so/r/M1aKGp?name=TEST+Visitor&email=test%2Ba%40example.com";
async function stub(page: Page) {
  await page.route("https://tally.so/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }),
  );
  await page.route("**/api/lead", (r) => r.fulfill({ status: 204 }));
}
async function fill(page: Page, id = "top") {
  await page.locator(`#${id}-name`).fill("TEST Visitor");
  await page.locator(`#${id}-email`).fill("test+a@example.com");
}
test.beforeEach(async ({ page }) => {
  await stub(page);
});
for (const id of ["top", "bottom"]) {
  test(`${id}: empty and invalid submissions stay put and errors clear on input`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(`#${id}-entry button`).click();
    await expect(page.locator(`#${id}-name-error`)).toHaveText(entry.errors.name);
    await expect(page.locator(`#${id}-name-error`)).toBeVisible();
    await expect(page.locator(`#${id}-name`)).toBeFocused();
    await expect(page).toHaveURL("/");
    await page.locator(`#${id}-name`).fill("TEST Visitor");
    await expect(page.locator(`#${id}-name-error`)).toBeHidden();
    await page.locator(`#${id}-email`).fill("bad@address");
    await page.locator(`#${id}-entry button`).click();
    await expect(page.locator(`#${id}-email-error`)).toHaveText(entry.errors.email);
    await expect(page.locator(`#${id}-email-error`)).toBeVisible();
    await expect(page.locator(`#${id}-email`)).toBeFocused();
    await page.locator(`#${id}-email`).fill("test+a@example.com");
    await expect(page.locator(`#${id}-email-error`)).toBeHidden();
  });
  test(`${id}: native GET preserves exact encoding`, async ({ page }) => {
    await page.goto("/");
    await fill(page, id);
    await page.locator(`#${id}-entry button`).click();
    await expect(page).toHaveURL(destination);
  });
  test(`${id}: works without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await stub(page);
    await page.goto("/");
    await fill(page, id);
    await page.locator(`#${id}-entry button`).click();
    await expect(page).toHaveURL(destination);
    await context.close();
  });
}
test("valid submit sends a beacon with attribution", async ({ page }) => {
  await page.goto("/?src=card&utm_source=test");
  await fill(page);
  const beacon = page.waitForRequest(
    (r) => new URL(r.url()).pathname === "/api/lead" && r.method() === "POST",
  );
  await page.locator("#top-entry button").click();
  const request = await beacon;
  const body = new URLSearchParams(request.postData()!);
  for (const key of ["name", "email", "src", "tz", "page", "utm", "sent_at"])
    expect(body.has(key), key).toBe(true);
  expect(body.get("name")).toBe("TEST Visitor");
  expect(body.get("email")).toBe("test+a@example.com");
  expect(body.get("src")).toBe("card");
  expect(body.get("utm")).toBe("utm_source=test");
  expect(body.get("page")).toBe("/");
  expect(body.get("tz")).not.toBe("");
  await expect(page).toHaveURL(destination);
});
test("opening label is announced before navigation and Enter submits", async ({ page }) => {
  let seen = "";
  await page.goto("/");
  await page.exposeFunction("reportLabel", (text: string) => {
    seen = text;
  });
  await page.evaluate(() => {
    const reportLabel = (window as Window & { reportLabel: (text: string) => Promise<void> })
      .reportLabel;
    document.querySelector("#top-entry")!.addEventListener("submit", () => {
      void reportLabel(document.querySelector("#top-entry [aria-live]")!.textContent!);
    });
  });
  await fill(page);
  await page.locator("#top-email").press("Enter");
  await expect(page).toHaveURL(destination);
  expect(seen.trim()).toBe(entry.opening);
});
