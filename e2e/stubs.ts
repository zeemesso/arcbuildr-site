import { expect, type Page, type Request } from "@playwright/test";
import { press } from "./press";

/**
 * A stand-in for Cal.com's embed script: it puts an empty frame where the calendar goes, says it is
 * ready, and lets a test say "a booking was made". No test opens a real calendar or makes a booking.
 */
const EMBED = `(() => {
  const cal = window.Cal;
  const on = {};
  const run = (args) => {
    const [method, arg] = args;
    if (method === "on") on[arg.action] = arg.callback;
    if (method === "inline") {
      const frame = document.createElement("iframe");
      frame.title = "Calendar stand-in";
      frame.dataset.link = arg.calLink;
      frame.dataset.name = arg.config.name;
      frame.dataset.email = arg.config.email;
      arg.elementOrSelector.append(frame);
      setTimeout(() => on.linkReady && on.linkReady({ detail: {} }));
    }
  };
  const waiting = cal.q || [];
  cal.q = { push: run };
  waiting.forEach(run);
  window.__booked = () => on.bookingSuccessfulV2 && on.bookingSuccessfulV2({ detail: { data: {} } });
})();`;

/** The site's two endpoints, the calendar and the booking page are stand-ins: no test writes a row. */
export async function stub(page: Page, save: "ok" | "fail" = "ok") {
  const state = {
    save,
    applies: [] as Request[],
    leads: [] as Request[],
    calendars: [] as Request[],
  };
  // The visit counter is another company's script: a slow answer from it must not hold a test up.
  await page.route(/cloudflareinsights\.com/, (route) => route.abort());
  await page.route("**/api/lead", (route) => {
    state.leads.push(route.request());
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/apply", (route) => {
    state.applies.push(route.request());
    return state.save === "ok"
      ? route.fulfill({ json: { ok: true } })
      : route.fulfill({ status: 502, json: { ok: false } });
  });
  await page.route("https://app.cal.com/**", (route) => {
    state.calendars.push(route.request());
    return route.fulfill({ contentType: "text/javascript", body: EMBED });
  });
  await page.route("https://cal.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Booking stand-in</title><h1>Booking</h1>",
    }),
  );
  return state;
}

export const layer = (page: Page) => page.locator("[data-apply]");
export const current = (page: Page) => page.locator(".q.is-current");
export const calendar = (page: Page) => page.locator("[data-apply-calendar]");
export const ending = (page: Page) => page.locator("[data-apply-end]");

/** Fills the two fields of the final panel and opens the form at its first question. */
export async function open(page: Page, who: { name: string; email: string }, path = "/") {
  await page.goto(path);
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await press(page.locator("#apply form button"));
  await expect(layer(page)).toBeVisible();
  await expect(current(page).locator("#a-profile")).toBeVisible();
}
