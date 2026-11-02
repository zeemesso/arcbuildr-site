import { expect, test } from "@playwright/test";

// Headlines and key lines from COPY.md draft 2, Home, word for word.
const copy = [
  "For founders and business owners",
  "A personal brand built from your real story, in six weeks.",
  "You know your work. Your Instagram doesn't show it yet. We decide with you what you should be known for, shape how your profile looks, and write what to say and show in every piece.",
  "Book a call",
  "Free, 30 minutes. We look at your profile together and tell you if we're a fit.",
  "You know your work. Your page doesn't show it.",
  "I don't know what I should be known for.",
  "I run out of ideas after a few posts.",
  "I sit down to film and don't know what to say.",
  "My profile doesn't look like the business I run.",
  "Each of these comes from a decision nobody has made yet: who you speak to, what you stand for, how your page should look. We make those decisions with you first, so every piece has somewhere to come from.",
  "We start from what you've already lived",
  "Real material",
  "Direction",
  "Content",
  "What you get, in the order we build it",
  "Brand Strategy",
  "Visual Identity",
  "Profile Audit & Optimization",
  "Content Strategy",
  "Content Pieces",
  "We decide and write. You film and post.",
  "We don't edit your videos or post for you.",
  "Who this is for",
  "For you if",
  "Not for you if",
  "You work directly with me",
  "I won't show you results I don't have.",
  "Start with a call",
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

test("every headline and body line from COPY.md is on the page", async ({ page }) => {
  await page.goto("/");
  const text = norm(await page.locator("main").innerText());
  for (const line of copy) expect(text.toLowerCase(), line).toContain(line.toLowerCase());
});

test("section anchors exist", async ({ page }) => {
  await page.goto("/");
  for (const id of [
    "top",
    "for",
    "approach",
    "build",
    "roles",
    "fit",
    "us",
    "questions",
    "start",
  ]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test("the hero button jumps to #start", async ({ page }) => {
  await page.goto("/");
  const button = page.locator("#top").getByRole("link", { name: "Book a call" });
  await expect(button).toHaveAttribute("href", "#start");
  await button.click();
  await expect(page).toHaveURL(/#start$/);
});

test("hero fits a 375 x 667 first screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const note = page.getByText("Free, 30 minutes.");
  const box = (await note.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("questions: first is open, each opens and closes by keyboard, answers are in the HTML", async ({
  page,
}) => {
  const html = await (await page.request.get("/")).text();
  const items = page.locator("#questions details");
  await page.goto("/");
  expect(await items.count()).toBe(9);
  await expect(items.nth(0)).toHaveAttribute("open", "");
  for (let i = 1; i < 9; i++) await expect(items.nth(i)).not.toHaveAttribute("open", "");

  for (let i = 0; i < 9; i++) {
    const item = items.nth(i);
    const summary = item.locator("summary");
    const answer = norm(await item.locator("p").textContent());
    expect(norm(html.replace(/<[^>]+>/g, " ").replace(/&#39;|&apos;/g, "'"))).toContain(answer);
    const wasOpen = (await item.getAttribute("open")) !== null;
    await summary.focus();
    await page.keyboard.press("Enter");
    expect((await item.getAttribute("open")) !== null).toBe(!wasOpen);
    await page.keyboard.press("Space");
    expect((await item.getAttribute("open")) !== null).toBe(wasOpen);
  }
});
