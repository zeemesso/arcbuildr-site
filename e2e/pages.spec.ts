import { expect, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import {
  application as form,
  booked as status,
  notFound,
  page as words,
} from "../src/content/site";
import { section } from "../src/content/deck";
import { APPLICATION_AFTER_BOOKING_URL, CONFIRMATION_VIDEO } from "../src/config";
import { press } from "./press";
import { layer, opened, plain, popup, send, stub, submission } from "./stubs";

const booked = section("the booked page");
const named = (name: string) => booked.get("heading").replace("{name}", name);

test("404 renders content and a home link", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(notFound.title);
  await expect(page.locator("h1")).toHaveText(notFound.h1);
  await expect(page.locator("main")).toContainText(notFound.body);
  await expect(page.getByRole("link", { name: notFound.link })).toHaveAttribute("href", "/");
});

test("sitemap lists home and privacy, and the sample page is gone", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])).toEqual([
    "https://arcbuildr.co/",
    "https://arcbuildr.co/privacy",
  ]);
  expect((await page.request.get("/sample")).status()).toBe(404);
});

test.describe("the page after a booking", () => {
  test("shows the two practical lines and what happens next, in the deck's words; the video only with its film", async ({
    page,
  }) => {
    await page.goto("/booked");
    await expect(page.locator("h1")).toHaveText(booked.get("heading, no name"));
    for (const slot of ["practical 1", "practical 2"])
      await expect(page.locator("#top")).toContainText(booked.get(slot));
    for (const slot of ["video, title", "video, length"]) {
      if (existsSync(`public${CONFIRMATION_VIDEO}`))
        await expect(page.locator("#top")).toContainText(booked.get(slot));
      else await expect(page.locator("main")).not.toContainText(booked.get(slot));
    }
    await expect(page.locator("#next-h")).toHaveText(booked.get("next, title"));
    await expect(page.locator(".next__list > li")).toHaveCount(2);
    for (const slot of ["next 1", "next 2"])
      await expect(page.getByText(booked.get(slot), { exact: true })).toBeVisible();
    // The video block is there only with its film: no poster, no stand-in and no title for a film that
    // does not exist.
    const film = existsSync(`public${CONFIRMATION_VIDEO}`);
    await expect(page.locator("#top video")).toHaveCount(film ? 1 : 0);
    await expect(page.locator("#top .done__video")).toHaveCount(film ? 1 : 0);
    await expect(page.locator(".face, .video__poster")).toHaveCount(0);
    await expect(page.locator("main svg image, main canvas, .pixel, [class*=sprite]")).toHaveCount(
      0,
    );
    // No other offer on this page, and no way to start a second application.
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator(".bar__cta")).toHaveCount(0);
    // The chat lines are for chat bookings only.
    await expect(page.getByText(booked.get("booked from a chat, line"))).toBeHidden();
    await expect(page.locator("[data-resend]")).toBeHidden();
    // Two short lines and two steps: no wall of instructions.
    expect((await page.locator("main").innerText()).split(/\s+/).length).toBeLessThan(140);
  });

  test("greets by first name from the address or from the device, and only a plain name", async ({
    page,
  }) => {
    await page.goto("/booked?attendeeName=TEST+Visitor&email=test%40example.com");
    await expect(page.locator("h1")).toHaveText(named("TEST"));
    await page.goto("/booked?attendeeName=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E");
    await expect(page.locator("h1")).toHaveText(booked.get("heading, no name"));
    await expect(page.locator("h1 img")).toHaveCount(0);
    await page.goto("/booked?name=" + "a".repeat(60));
    await expect(page.locator("h1")).toHaveText(booked.get("heading, no name"));
    // What the calendar inside the form leaves behind.
    await page.evaluate(() =>
      sessionStorage.setItem("arcbuildr-booked", JSON.stringify({ name: "TEST", email: "t@e.co" })),
    );
    await page.goto("/booked");
    await expect(page.locator("h1")).toHaveText(named("TEST"));
    await page.evaluate(() =>
      sessionStorage.setItem("arcbuildr-booked", JSON.stringify({ name: "<b>x</b>" })),
    );
    await page.goto("/booked");
    await expect(page.locator("h1")).toHaveText(booked.get("heading, no name"));
    await page.evaluate(() => sessionStorage.setItem("arcbuildr-booked", "not json"));
    await page.goto("/booked");
    await expect(page.locator("h1")).toHaveText(booked.get("heading, no name"));
  });
});

// Someone who booked from a chat has not answered the 8 questions yet. The address says so:
// `via=chat`, or the chat event's slug. Nobody else sees the button.
test.describe("the page after a booking from a chat", () => {
  const label = booked.get("booked from a chat, button");
  const first = booked.get("booked from a chat, in place of next 1");
  const line = booked.get("booked from a chat, line");
  const button = (page: Page) => page.getByRole("button", { name: label, exact: true });
  const options = (id: string) => {
    const question = form.questions.find((item) => item.id === id)!;
    return question.type === "choice" ? question.options : [];
  };
  const answers: Record<string, string> = {
    profile: "@test.visitor",
    sell: "TEST: bookkeeping",
    stranger: "TEST: the books",
    film: options("film")[1]!,
    count: options("count")[0]!,
    decides: options("decides")[0]!,
    start: options("start")[1]!,
  };
  // The lowest budget ends nothing here: they have a call already.
  const given = { ...answers, budget: options("budget")[0]! };
  const CHAT_FORM = APPLICATION_AFTER_BOOKING_URL.slice(
    APPLICATION_AFTER_BOOKING_URL.lastIndexOf("/") + 1,
  );

  test("without a chat booking the page stays as it is", async ({ page }) => {
    for (const query of [
      "",
      "?via=email",
      "?via=Chat+",
      "?eventTypeSlug=15-minute-call",
      "?attendeeName=TEST+Visitor&email=test%40example.com",
    ]) {
      await page.goto("/booked" + query);
      await expect(page.getByText(booked.get("next 1")), query).toBeVisible();
      await expect(page.getByText(first), query).toBeHidden();
      await expect(page.getByText(line), query).toBeHidden();
      await expect(button(page), query).toHaveCount(0);
      await expect(page.locator('main a[href*="tally.so"]'), query).toHaveCount(0);
    }
  });

  for (const sign of ["via=chat", "eventTypeSlug=15-minute-call-chat"]) {
    test(`${sign}: the 8 questions come first and are answered on this page`, async ({ page }) => {
      const calls = await stub(page);
      await page.goto(`/booked?${sign}&attendeeName=TEST+Visitor&email=test%2Bchat%40example.com`);
      await expect(button(page)).toBeVisible();
      await expect(page.getByText(first)).toBeVisible();
      await expect(page.getByText(booked.get("next 1"))).toBeHidden();
      // Who writes to them, and where.
      await expect(page.getByText(line)).toBeVisible();
      // The rest of the page is the same: the greeting, the practical lines, no second application.
      await expect(page.locator("h1")).toHaveText(named("TEST"));
      await expect(page.locator("main")).toContainText(booked.get("practical 1"));
      await expect(page.getByText(booked.get("next 2"))).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);
      await expect(page.locator(".bar__cta")).toHaveCount(0);

      // The questions open here, in the popup of the form for chat bookings, with what is known filled.
      const person = { name: "TEST", email: "test+chat@example.com" };
      await press(button(page));
      await expect(popup(page)).toBeVisible();
      expect(await opened(page)).toEqual([
        { id: CHAT_FORM, layout: "modal", hiddenFields: person },
      ]);
      await send(page, submission(person, given, { formId: CHAT_FORM }));

      // Saved: the popup closes, the page says so, and nobody is sent to a calendar.
      await expect(page.getByText(status.saved)).toBeVisible();
      await expect(popup(page)).toHaveCount(0);
      await expect(layer(page)).toBeHidden();
      await expect(button(page)).toBeHidden();
      await expect(page).toHaveURL(/\/booked\?/);
      await expect.poll(() => calls.applies.length).toBe(1);
      expect(calls.applies[0]!.postDataJSON()).toMatchObject({
        kind: "prep",
        ...person,
        page: "/booked",
        answers: given,
      });
      // They are already a lead: the booking made the row. And no calendar loads here.
      expect(calls.leads).toHaveLength(0);
      expect(calls.calendars).toHaveLength(0);
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
    const good = "test@example.com";
    for (const [query, known] of [
      ["", {}],
      [`&attendeeName=${encodeURIComponent(markup)}&email=test%40example.com`, { email: good }],
      [`&name=${"a".repeat(60)}&email=not-an-email`, {}],
      [`&attendeeName=TEST&email=${encodeURIComponent("x@y.zz" + markup)}`, { name: "TEST" }],
      [`&attendeeName=TEST&email=${encodeURIComponent("javascript:alert(1)")}`, { name: "TEST" }],
      [`&attendeeName=TEST&email=${"a".repeat(250)}%40example.com`, { name: "TEST" }],
      [
        "&attendeeName=TEST&email=test%40example.com&url=https%3A%2F%2Fexample.org",
        { name: "TEST", email: good },
      ],
    ] as const) {
      await page.goto("/booked?via=chat" + query);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(button(page), query).toBeVisible();
      await press(button(page));
      // The form is handed what passed the check and nothing else; it asks for the rest itself.
      await expect(popup(page), query).toBeVisible();
      expect((await opened(page))[0]!.hiddenFields, query).toEqual(known);
      await expect(page.locator("main img, [data-apply] img"), query).toHaveCount(0);
    }
    expect(dialogs).toEqual([]);
  });

  test("when Tally cannot be reached, a name and an email are saved from this page", async ({
    page,
  }) => {
    const calls = await stub(page, "ok", "blocked");
    await page.goto("/booked?via=chat&attendeeName=TEST&email=test%2Bchat%40example.com");
    await press(button(page));
    await expect(plain(page)).toBeVisible();
    await expect(plain(page).locator("input[name=email]")).toHaveValue("test+chat@example.com");
    await press(page.locator("[data-ok]"));
    await expect(page.getByText(status.saved)).toBeVisible();
    await expect(layer(page)).toBeHidden();
    expect(calls.applies[0]!.postDataJSON()).toMatchObject({
      kind: "prep",
      name: "TEST",
      email: "test+chat@example.com",
      plain: true,
    });
    expect(calls.calendars).toHaveLength(0);
  });

  test("on a phone the button and its words stay inside the screen", async ({ page }) => {
    for (const width of [320, 360, 390, 414]) {
      await page.setViewportSize({ width, height: 650 });
      await page.goto("/booked?via=chat");
      await page.evaluate(() => document.fonts.ready);
      const box = (await button(page).boundingBox())!;
      expect(box.x, `${width}`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width}`).toBeLessThanOrEqual(width);
      expect(
        await button(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${width}`,
      ).toBe(true);
    }
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("the page stays the standard one", async ({ page }) => {
      await page.goto("/booked?via=chat&attendeeName=TEST+Visitor");
      await expect(page.locator("h1")).toHaveText(booked.get("heading, no name"));
      await expect(page.getByText(booked.get("next 1"))).toBeVisible();
      await expect(button(page)).toHaveCount(0);
    });
  });
});

test("the /booked video block takes the confirmation video, and is not there until it exists", async ({
  page,
}) => {
  const media: string[] = [];
  page.on("request", (r) => r.resourceType() === "media" && media.push(r.url()));
  await page.goto("/booked");
  await page.waitForLoadState("networkidle");
  const video = page.locator("#top video");
  if (existsSync(`public${CONFIRMATION_VIDEO}`)) {
    await expect(video).toHaveAttribute("src", CONFIRMATION_VIDEO);
    // Only its first bytes load before a press.
    await expect(video).toHaveAttribute("preload", "metadata");
  } else {
    // Until he films it: no block, no poster, nothing to press and nothing to load.
    await expect(video).toHaveCount(0);
    await expect(page.locator("#top [data-poster], #top figure")).toHaveCount(0);
    expect(media).toEqual([]);
  }
});
