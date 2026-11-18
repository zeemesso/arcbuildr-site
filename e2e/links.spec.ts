import { expect, test } from "@playwright/test";
import { APPLICATION_AFTER_BOOKING_URL, APPLICATION_URL } from "../src/config";
test("all page links resolve and entry forms use the application URL", async ({ page }) => {
  for (const path of ["/", "/sample", "/booked", "/privacy", "/404"]) {
    await page.goto(path);
    const hrefs = await page
      .locator("header a[href], main a[href], footer a[href]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")!));
    expect(hrefs.length, path).toBeGreaterThan(0);
    for (const href of hrefs) {
      if (href.startsWith("mailto:")) continue;
      // The one outside link: the application for a booking made from a chat. It is not opened here.
      if (path === "/booked" && href === APPLICATION_AFTER_BOOKING_URL) continue;
      const url = new URL(href, page.url());
      expect(url.origin, href).toBe(new URL(page.url()).origin);
      if (url.pathname === new URL(page.url()).pathname && url.hash)
        await expect(page.locator(url.hash)).toHaveCount(1);
      else {
        const response = await page.request.get(url.pathname);
        expect(response.status(), href).toBe(200);
        if (url.hash) expect(await response.text()).toContain(`id="${url.hash.slice(1)}"`);
      }
    }
    for (const form of await page.locator("main form").all())
      await expect(form).toHaveAttribute("action", APPLICATION_URL);
  }
});
