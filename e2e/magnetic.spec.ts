import { expect, test } from "@playwright/test";

test("page button leans toward a mouse and springs back on leave", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "needs a hovering mouse");
  await page.addInitScript(() => sessionStorage.setItem("arc-intro", "1"));
  await page.goto("/");
  const btn = page.locator("main a.btn.is-magnetic").first();
  await expect(btn).toBeVisible();
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
  await page.waitForTimeout(1200); // reveal transition
  const box = (await btn.boundingBox())!;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 5 });
  await expect.poll(async () => (await btn.boundingBox())!.x - box.x).toBeGreaterThan(10);

  await page.mouse.move(box.x - 200, box.y - 200);
  await expect.poll(async () => Math.abs((await btn.boundingBox())!.x - box.x)).toBeLessThan(0.5);
});
