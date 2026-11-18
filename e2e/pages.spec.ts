import { expect, test, type Page } from "@playwright/test";
import { booked, notFound, sample } from "../src/content/site";
import { CONFIRMATION_VIDEO, FOUNDER_VIDEO } from "../src/config";

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
    await expect(page.locator("main")).toContainText(
      "The invite comes by email. If it is not in your inbox in 2 minutes, check spam.",
    );
    for (const item of [...booked.call.items, ...booked.ready.items])
      await expect(page.locator("main")).toContainText(item);
    // No other offer on this page, and no way to start a second application.
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("header [data-apply]")).toHaveCount(0);
  });

  test("does not assume the application is done", async ({ page }) => {
    await page.goto("/booked");
    await expect(page.locator("main")).toContainText(booked.application.body);
    await expect(page.locator("main")).not.toContainText(
      /your answers are|you answered|thanks for/i,
    );
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
  const application = "https://tally.so/r/9NZpVV";
  const label = "Answer the 8 questions (3 minutes)";
  const button = (page: Page) => page.getByRole("link", { name: label, exact: true });
  /** The button's address without its query, then its query as pairs. */
  const address = async (page: Page) => {
    const url = new URL((await button(page).getAttribute("href"))!);
    return [url.origin + url.pathname, [...url.searchParams]] as const;
  };

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
      await expect(button(page), query).toHaveCount(0);
      await expect(page.locator('main a[href*="tally.so"]:visible'), query).toHaveCount(0);
    }
  });

  for (const sign of ["via=chat", "eventTypeSlug=15-minute-call-chat"]) {
    test(`${sign}: the 8 questions come first, with name and email filled`, async ({ page }) => {
      await page.goto(`/booked?${sign}&attendeeName=TEST+Visitor&email=test%2Bchat%40example.com`);
      await expect(button(page)).toBeVisible();
      expect(await address(page)).toEqual([
        application,
        [
          ["name", "TEST"],
          ["email", "test+chat@example.com"],
        ],
      ]);
      await expect(page.getByText(booked.application.first)).toBeVisible();
      await expect(page.getByText(booked.application.body)).toBeHidden();
      // The rest of the page is the same: the greeting, the invite line, no second application.
      await expect(page.locator("h1")).toHaveText(booked.h1Named.replace("{name}", "TEST"));
      await expect(page.locator("main")).toContainText(booked.invite);
      for (const item of booked.ready.items) await expect(page.getByText(item)).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);
      await expect(page.locator("header [data-apply]")).toHaveCount(0);
    });
  }

  test("only a plain name and a plain email are passed on", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    const markup = '"><img src=x onerror=alert(1)>';
    for (const [query, passed] of [
      ["", []],
      [
        `&attendeeName=${encodeURIComponent(markup)}&email=test%40example.com`,
        [["email", "test@example.com"]],
      ],
      [`&name=${"a".repeat(60)}&email=not-an-email`, []],
      [`&attendeeName=TEST&email=${encodeURIComponent("x@y.zz" + markup)}`, [["name", "TEST"]]],
      [`&attendeeName=TEST&email=${encodeURIComponent("javascript:alert(1)")}`, [["name", "TEST"]]],
      [`&attendeeName=TEST&email=${"a".repeat(250)}%40example.com`, [["name", "TEST"]]],
      [
        "&attendeeName=TEST&email=test%40example.com&url=https%3A%2F%2Fexample.org&redirect=1",
        [
          ["name", "TEST"],
          ["email", "test@example.com"],
        ],
      ],
    ] as const) {
      await page.goto("/booked?via=chat" + query);
      await expect(button(page), query).toBeVisible();
      expect(await address(page), query).toEqual([application, passed]);
      await expect(page.locator("main img"), query).toHaveCount(0);
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

test("video slots show a poster and load no video until one is set", async ({ page }) => {
  const media: string[] = [];
  page.on("request", (r) => r.resourceType() === "media" && media.push(r.url()));
  for (const [path, src] of [
    ["/", FOUNDER_VIDEO],
    ["/booked", CONFIRMATION_VIDEO],
  ] as const) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".video .video__zyade")).toHaveCount(1);
    // The video element is made on the first press, so there is none before it.
    await expect(page.locator(".video video")).toHaveCount(0);
    const play = page.locator(".video [data-play]");
    if (src) await expect(play).toHaveAttribute("href", src);
    else await expect(play).toHaveCount(0);
  }
  expect(media).toEqual([]);
});
