import { expect, test } from "@playwright/test";

// Every headline and body line from COPY.md, Home sections 1 to 5, word for word.
const copy = [
  "We build your personal brand from your real story.",
  "Arcbuildr is a personal brand service for business-driven people. We take your story and what you know, and build the brand and content that show it on Instagram, and on TikTok when it fits you.",
  "Book an intro call",
  "Free, 30 minutes. We'll tell you on the call if we're a fit.",
  "For people who build businesses",
  "You run a business, or you're building one. You know your field well. Your Instagram shows a small part of that, or none of it, because your time goes into the work.",
  "We don't split clients by industry. Each brand starts from the person behind it, so two clients in the same field end up with different brands.",
  "What we build, in the order we build it",
  "Brand Strategy",
  "We start with your story and your expertise. Together we decide who you speak to, what you want to be known for, and what you have to say about it.",
  "Visual Identity System",
  "Your colors, type and templates for posts and stories, so everything you publish looks like it comes from the same person.",
  "Profile Audit & Optimization",
  "We go through your Instagram profile as it is today and fix what gets in the way: your name field, bio, link and pinned posts.",
  "Content Strategy & Production",
  "A content plan, a story sequence system, suggested highlights, carousels and short-form pieces. We choose the format for each piece based on what it has to say.",
  "Ongoing Support",
  "We stay with you after we deliver. When you have a question, you get an answer. When something needs to change, we revise it.",
  "Who does what",
  "We build the strategy, the identity and the content, and hand it to you ready to post.",
  "You publish it on your own account. We don't post for you. Your account stays yours, and the conversations with your audience stay with you.",
  "For some clients we also edit their videos. We'll tell you on the call whether that makes sense for you.",
  "Who we are",
  "Arcbuildr is Zyade and Hanane. We started it on September 23, 2026, and you work with the two of us directly.",
  "We're new. That's why this page lays out every step of how we work. On the call, we open your profile together and show you what we'd build for it.",
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

test("every headline and body line from COPY.md is on the page", async ({ page }) => {
  await page.goto("/");
  const text = norm(await page.locator("main").innerText());
  for (const line of copy) expect(text, line).toContain(line);
});

test("section anchors exist", async ({ page }) => {
  await page.goto("/");
  for (const id of ["top", "for", "build", "roles", "us", "start"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test("the hero button jumps to #start", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("link", { name: "Book an intro call" });
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
