import { expect, test, type Page, type Request } from "@playwright/test";
import { existsSync } from "node:fs";
import { application as form, booked, notFound, sample } from "../src/content/site";
import { CONFIRMATION_VIDEO } from "../src/config";
import { answer, press } from "./press";

test("404 renders content and a home link", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(notFound.title);
  await expect(page.locator("h1")).toHaveText(notFound.h1);
  await expect(page.locator("main")).toContainText(notFound.body);
  await expect(page.getByRole("link", { name: notFound.link })).toHaveAttribute("href", "/");
});

test("sitemap lists home, the sample and privacy", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])).toEqual([
    "https://arcbuildr.co/",
    "https://arcbuildr.co/sample",
    "https://arcbuildr.co/privacy",
  ]);
});

test("the sample page shows the whole episode and leads back to the form", async ({ page }) => {
  await page.goto("/sample");
  await expect(page.locator("h1")).toHaveText(sample.h1);
  const rows = page.locator(".script__row");
  await expect(rows).toHaveCount(sample.doc.rows.length);
  for (const [i, row] of sample.doc.rows.entries()) {
    await expect(rows.nth(i)).toContainText(row.say);
    await expect(rows.nth(i)).toContainText(row.show);
  }
  await expect(page.locator(".script__caption")).toContainText(sample.doc.caption);
  await expect(page.locator("main a.btn")).toHaveAttribute("href", "/#apply");
});

test.describe("the confirmation page", () => {
  test("says the invite line, the agenda and what to have ready", async ({ page }) => {
    await page.goto("/booked");
    await expect(page.locator("h1")).toHaveText(booked.h1);
    await expect(page.locator("main .lead").first()).toHaveText(booked.invite);
    await expect(page.locator("main")).toContainText(
      "If your email shows it as from an unknown sender, confirm that you know the sender, then accept it.",
    );
    for (const item of [...booked.call.items, ...booked.ready.items])
      await expect(page.locator("main")).toContainText(item);
    // No other offer on this page, and no way to start a second application.
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("header [data-apply]")).toHaveCount(0);
    // The chat line is for chat bookings only.
    await expect(page.getByText(booked.chat)).toBeHidden();
  });

  test("does not assume the application is done", async ({ page }) => {
    await page.goto("/booked");
    await expect(page.locator("main")).toContainText(booked.application.body);
    // What the visitor can see: the lines for a chat booking and for unsaved answers stay hidden.
    expect(await page.locator("main").innerText()).not.toMatch(
      /your answers are|you answered|thanks for/i,
    );
    await expect(page.locator("[data-resend]")).toBeHidden();
  });

  test("greets by first name when the booking passes one, and only a plain name", async ({
    page,
  }) => {
    await page.goto("/booked?attendeeName=TEST+Visitor&email=test%40example.com");
    await expect(page.locator("h1")).toHaveText(booked.h1Named.replace("{name}", "TEST"));
    await page.goto("/booked?attendeeName=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E");
    await expect(page.locator("h1")).toHaveText(booked.h1);
    await expect(page.locator("h1 img")).toHaveCount(0);
    await page.goto("/booked?name=" + "a".repeat(60));
    await expect(page.locator("h1")).toHaveText(booked.h1);
  });
});

// Someone who booked from a chat has not answered the 8 questions yet. The address says so:
// `via=chat`, or the chat event's slug. Nobody else sees the button.
test.describe("the confirmation page after a booking from a chat", () => {
  const label = "Answer the 8 questions (3 minutes)";
  const button = (page: Page) => page.getByRole("button", { name: label, exact: true });
  const layer = (page: Page) => page.locator("[data-apply]");
  const current = (page: Page) => page.locator(".q.is-current");
  const answers: Record<string, string> = {
    profile: "@test.visitor",
    sell: "TEST: bookkeeping",
    stranger: "TEST: the books",
    film: form.questions[3].options[1],
    count: form.questions[4].options[0],
    decides: form.questions[5].options[0],
    start: form.questions[6].options[1],
  };
  /** Stand-ins: no test writes a row. */
  async function stub(page: Page) {
    const applies: Request[] = [];
    const leads: Request[] = [];
    await page.route("**/api/lead", (route) => {
      leads.push(route.request());
      return route.fulfill({ status: 204 });
    });
    await page.route("**/api/apply", (route) => {
      applies.push(route.request());
      return route.fulfill({ json: { ok: true } });
    });
    return { applies, leads };
  }

  test("without a chat booking the page stays as it is", async ({ page }) => {
    for (const query of [
      "",
      "?via=email",
      "?via=Chat+",
      "?eventTypeSlug=15-minute-call",
      "?attendeeName=TEST+Visitor&email=test%40example.com",
    ]) {
      await page.goto("/booked" + query);
      await expect(page.getByText(booked.application.body), query).toBeVisible();
      await expect(page.getByText(booked.application.first), query).toBeHidden();
      await expect(page.getByText(booked.chat), query).toBeHidden();
      await expect(button(page), query).toHaveCount(0);
      await expect(page.locator('main a[href*="tally.so"]'), query).toHaveCount(0);
    }
  });

  for (const sign of ["via=chat", "eventTypeSlug=15-minute-call-chat"]) {
    test(`${sign}: the 8 questions come first and are answered on this page`, async ({ page }) => {
      const calls = await stub(page);
      await page.goto(`/booked?${sign}&attendeeName=TEST+Visitor&email=test%2Bchat%40example.com`);
      await expect(button(page)).toBeVisible();
      await expect(page.getByText(booked.application.first)).toBeVisible();
      await expect(page.getByText(booked.application.body)).toBeHidden();
      // Who writes to them, and where.
      await expect(page.getByText(booked.chat)).toBeVisible();
      // The rest of the page is the same: the greeting, the invite line, no second application.
      await expect(page.locator("h1")).toHaveText(booked.h1Named.replace("{name}", "TEST"));
      await expect(page.locator("main")).toContainText(booked.invite);
      for (const item of booked.ready.items) await expect(page.getByText(item)).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);
      await expect(page.locator("header [data-apply]")).toHaveCount(0);

      // The name and email are known, so the form starts at the first question.
      await press(button(page));
      await expect(layer(page)).toBeVisible();
      await expect(layer(page)).toHaveAttribute("data-kind", "prep");
      await expect(page.locator("[data-hi]")).toHaveText(form.hiPrep.replace("{name}", "TEST"));
      for (const [id, value] of Object.entries(answers)) await answer(page, id, value);
      await expect(page.locator('.q.is-current[data-id="budget"]')).toBeVisible();
      await expect(page.locator("[data-ok-label]")).toHaveText(form.finishPrep);
      await press(current(page).locator(".choice").first());

      // Saved: the layer closes, the page says so, and nobody is sent to a calendar.
      await expect(page.getByText(booked.application.saved)).toBeVisible();
      await expect(layer(page)).toBeHidden();
      await expect(button(page)).toBeHidden();
      await expect(page).toHaveURL(/\/booked\?/);
      expect(calls.applies).toHaveLength(1);
      expect(calls.applies[0]!.postDataJSON()).toMatchObject({
        kind: "prep",
        name: "TEST",
        email: "test+chat@example.com",
        page: "/booked",
        answers: { ...answers, budget: form.questions[7].options[0] },
      });
      // They are already a lead: the booking made the row.
      expect(calls.leads).toHaveLength(0);
    });
  }

  test("only a plain name and a plain email are taken from the address", async ({ page }) => {
    await stub(page);
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    const markup = '"><img src=x onerror=alert(1)>';
    for (const [query, first] of [
      ["", "name"],
      [`&attendeeName=${encodeURIComponent(markup)}&email=test%40example.com`, "name"],
      [`&name=${"a".repeat(60)}&email=not-an-email`, "name"],
      [`&attendeeName=TEST&email=${encodeURIComponent("x@y.zz" + markup)}`, "email"],
      [`&attendeeName=TEST&email=${encodeURIComponent("javascript:alert(1)")}`, "email"],
      [`&attendeeName=TEST&email=${"a".repeat(250)}%40example.com`, "email"],
      ["&attendeeName=TEST&email=test%40example.com&url=https%3A%2F%2Fexample.org", "profile"],
    ] as const) {
      await page.goto("/booked?via=chat" + query);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(button(page), query).toBeVisible();
      await press(button(page));
      // The form asks for whatever the address did not give in a plain form.
      await expect(current(page).locator(`#a-${first}`), query).toBeVisible();
      await expect(page.locator("main img, [data-apply] img"), query).toHaveCount(0);
    }
    expect(dialogs).toEqual([]);
  });

  test("on a phone the button breaks between its two parts, never inside one", async ({ page }) => {
    for (const width of [360, 390, 414]) {
      await page.setViewportSize({ width, height: 650 });
      await page.goto("/booked?via=chat");
      await page.evaluate(() => document.fonts.ready);
      const size = await button(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const parts = button(page).locator("span");
      await expect(parts).toHaveCount(2);
      for (const part of await parts.all())
        expect((await part.boundingBox())!.height, `${width}`).toBeLessThan(size * 1.5);
    }
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("the page stays the standard one", async ({ page }) => {
      await page.goto("/booked?via=chat&attendeeName=TEST+Visitor");
      await expect(page.locator("h1")).toHaveText(booked.h1);
      await expect(page.getByText(booked.application.body)).toBeVisible();
      await expect(button(page)).toHaveCount(0);
    });
  });
});

test("the /booked video slot takes the confirmation video, and loads none before a press", async ({
  page,
}) => {
  const media: string[] = [];
  page.on("request", (r) => r.resourceType() === "media" && media.push(r.url()));
  await page.goto("/booked");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".video .video__zyade")).toHaveCount(1);
  // The video element is made on the first press, so there is none before it.
  await expect(page.locator(".video video")).toHaveCount(0);
  const play = page.locator(".video [data-play]");
  // Until the file is in public/, the slot shows its poster and no play button.
  if (existsSync(`public${CONFIRMATION_VIDEO}`))
    await expect(play).toHaveAttribute("href", CONFIRMATION_VIDEO);
  else await expect(play).toHaveCount(0);
  expect(media).toEqual([]);
});
