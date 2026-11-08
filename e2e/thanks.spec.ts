import { expect, test } from "@playwright/test";
import { PHONE_NUMBER, WHATSAPP_NUMBER } from "../src/config";

type Call = unknown[];

// Replaces Cal.com's embed with a recorder, so no outside request is needed.
async function recordCal(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const calls: unknown[][] = [];
    (window as unknown as { __cal: unknown[][] }).__cal = calls;
    (window as unknown as { Cal: unknown }).Cal = (...args: unknown[]) => calls.push(args);
  });
}
const calls = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __cal: Call[] }).__cal);

test("name and email from the URL reach the embed", async ({ page }) => {
  await recordCal(page);
  await page.goto("/thanks?name=Hanane&email=hanane%40example.com");
  const inline = (await calls(page)).find((c) => c[0] === "inline")![1] as {
    calLink: string;
    config: { name: string; email: string };
  };
  expect(inline.config).toMatchObject({ name: "Hanane", email: "hanane@example.com" });
  expect(inline.calLink).toMatch(/^[\w-]+\/[\w-]+$/);
});

test("a direct visit with no values still loads, with an empty prefill", async ({ page }) => {
  await recordCal(page);
  await page.goto("/thanks");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanks. Your answers are in.");
  const inline = (await calls(page)).find((c) => c[0] === "inline")![1] as {
    config: { name: string; email: string };
  };
  expect(inline.config).toMatchObject({ name: "", email: "" });
});

test("the fallback line shows when the embed script is blocked", async ({ page }) => {
  await page.route("https://app.cal.com/**", (route) => route.abort());
  await page.goto("/thanks");
  await expect(
    page.getByText(
      "If no time works, email us at [email] or send a DM to @arcbuildr on Instagram.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("header has no Book a call button, page is noindex", async ({ page }) => {
  await page.route("https://app.cal.com/**", (route) => route.abort());
  await page.goto("/thanks");
  await expect(page.getByRole("link", { name: "Book a call" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Arcbuildr", exact: true }).first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page).toHaveTitle("Talk now or pick a time | Arcbuildr");
});

test("talk now shows WhatsApp and phone only when their numbers are set", async ({ page }) => {
  await page.route("https://app.cal.com/**", (route) => route.abort());
  await page.goto("/thanks?name=A&email=a%40example.com");
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  const wa = page.locator("#call-whatsapp");
  if (WHATSAPP_NUMBER) {
    await expect(wa).toHaveAttribute(
      "href",
      new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}\\?text=`),
    );
  } else await expect(wa).toHaveCount(0);
  const tel = page.locator("#call-phone");
  if (PHONE_NUMBER) await expect(tel).toHaveAttribute("href", `tel:+${PHONE_NUMBER}`);
  else await expect(tel).toHaveCount(0);
});
