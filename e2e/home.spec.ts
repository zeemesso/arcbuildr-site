import { expect, test } from "@playwright/test";
import {
  hero,
  founding,
  questions,
  fit,
  offer,
  evidence,
  proof,
  footer,
} from "../src/content/site";
import { CONTACT_EMAIL, FOUNDING_PLACES_LEFT } from "../src/config";
import { SECTION_IDS } from "../src/content/sections";

test("home has the headline, ten sections, the founding count and one price card", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(hero.h1.join(" "));
  expect(await page.locator("main > section").evaluateAll((els) => els.map((el) => el.id))).toEqual(
    [...SECTION_IDS],
  );
  const places = page.locator(".founding");
  await expect(places).toHaveCount(1);
  await expect(places).toContainText(founding.count.replace("{n}", String(FOUNDING_PLACES_LEFT)));
  await expect(places.locator(".is-free")).toHaveCount(FOUNDING_PLACES_LEFT);
  const price = page.locator(".price");
  await expect(price).toContainText(offer.price.from);
  await expect(price).toContainText(offer.price.to);
  await expect(price).toContainText(offer.price.line);
  // Prices live in the price card only. The one other figure is who the offer is for.
  const outside = await page.locator("main").evaluate((el, exception) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelector(".price")?.remove();
    clone.querySelectorAll("style").forEach((style) => style.remove());
    return clone.textContent!.replace(exception, "");
  }, fit.yes.items[2]!);
  expect(outside).not.toMatch(/\b(750|1,?000|1,?250|1,?500|1,?750)\b/);
});

test("the offer is shown as pictures: 12 weeks, 6 deliveries, 3 sizes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".weeks__row > li")).toHaveCount(12);
  await expect(page.locator(".weeks [role=img]")).toHaveAttribute("aria-label", offer.strip.alt);
  const cards = page.locator(".deliver > .dcard");
  await expect(cards).toHaveCount(offer.cards.length);
  for (const [i, card] of offer.cards.entries()) {
    await expect(cards.nth(i).locator(".when b")).toHaveText(String(card.day));
    await expect(cards.nth(i).locator("h3")).toContainText(card.title);
    await expect(cards.nth(i).locator(".dcard__body")).toHaveText(card.body);
    await expect(cards.nth(i).locator(".art")).toHaveCount(1);
  }
  await expect(page.locator(".sizes > .size")).toHaveCount(3);
  await expect(page.locator(".sizes > .size.is-pick")).toHaveCount(1);
  await expect(page.locator(".sizes > .size.is-pick")).toContainText(offer.sizes.pickTag);
});

test("questions are few, closed, and work from the keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#questions details")).toHaveCount(questions.items.length);
  await expect(page.locator("#questions")).not.toContainText(/\bAI\b/);
  for (const item of questions.items) {
    const row = page.locator(`#${item.id}`);
    await expect(row.locator("p")).toHaveText(item.a);
    await expect(row).not.toHaveAttribute("open");
    await row.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(row).toHaveAttribute("open", "");
    await expect(row.locator("p")).toBeVisible();
  }
});

test("the research sits behind one tap, with every source and the limit", async ({ page }) => {
  await page.goto("/");
  const research = page.locator("#evidence details");
  await expect(research).not.toHaveAttribute("open");
  await expect(page.locator(".finding").first()).toBeHidden();
  await research.locator("summary").click();
  for (const finding of evidence.findings) {
    const card = page.locator(`#${finding.id}`);
    await expect(card).toBeVisible();
    await expect(card.locator("b")).toHaveText(finding.figure);
    await expect(card.locator("p")).toHaveText(finding.claim);
    await expect(card.locator("cite")).toHaveText(finding.source);
  }
  await expect(page.locator(".limit")).toHaveText(evidence.limit);
});

test("the proof shows the sample, the audit and the refund", async ({ page }) => {
  await page.goto("/");
  const sample = page.locator(".pcard--sample");
  await expect(sample.locator(".script__row")).toHaveCount(1);
  await expect(sample.getByRole("link", { name: proof.sample.link.text })).toHaveAttribute(
    "href",
    "/sample",
  );
  await expect(page.locator(".pcard--audit")).toContainText(proof.audit.body);
  const refund = page.locator(".pcard--refund");
  for (const step of proof.refund.steps) {
    await expect(refund).toContainText(step.figure);
    await expect(refund).toContainText(step.text);
  }
  await expect(refund).toContainText(proof.refund.rewrites);
  await expect(refund).toContainText(proof.refund.not);
});

test("the footer gives the contact address", async ({ page }) => {
  await page.goto("/");
  const contact = page.locator('footer a[href^="mailto:"]');
  await expect(contact).toHaveText(CONTACT_EMAIL);
  await expect(contact).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
  await expect(page.locator("footer")).toContainText(
    footer.contact.replace("{email}", CONTACT_EMAIL),
  );
});

test("the page stays short: about 1,000 words, about 800 on load", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const words = await page.evaluate(() => {
    const count = (text: string) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,:-]*/gu) ?? []).length;
    const roots = [
      ...document.querySelectorAll<HTMLElement>("body > header, body > main, body > footer"),
    ];
    const read = () => roots.map((root) => root.innerText).join("\n");
    const onLoad = count(read());
    document.querySelectorAll("details").forEach((d) => (d.open = true));
    return { onLoad, all: count(read()) };
  });
  expect(words.onLoad).toBeLessThanOrEqual(850);
  expect(words.all).toBeLessThanOrEqual(1100);
});
