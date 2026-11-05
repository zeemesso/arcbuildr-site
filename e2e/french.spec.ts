import { expect, test } from "@playwright/test";

test("/fr/ is in French, with hreflang twins and a link back to English", async ({ page }) => {
  await page.goto("/fr/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("vraie histoire");
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
    "href",
    "https://arcbuildr.co/",
  );
  await expect(page.locator('link[hreflang="fr"]')).toHaveAttribute(
    "href",
    "https://arcbuildr.co/fr/",
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "fr_FR");
  await expect(page.locator("footer").getByRole("link", { name: "English" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(
    page.locator("footer").getByRole("link", { name: "Confidentialité" }),
  ).toHaveAttribute("href", "/fr/privacy");
});

test("English pages link to their French twin", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("footer").getByRole("link", { name: "Français" })).toHaveAttribute(
    "href",
    /^\/fr\/privacy\/?$/,
  );
});

test("the switch remembers the choice in the lang cookie", async ({ page, context }) => {
  await page.goto("/fr/");
  await page.locator("footer").getByRole("link", { name: "English" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  const cookie = (await context.cookies()).find((c) => c.name === "lang");
  expect(cookie?.value).toBe("en");
});

test("the French form checks in French and sends the visitor to /fr/thanks", async ({ page }) => {
  const bodies: URLSearchParams[] = [];
  await page.route("**/api/lead", async (route) => {
    bodies.push(new URLSearchParams(route.request().postData() ?? ""));
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/fr/");
  await page.locator(".start__write summary").click();
  await page.getByRole("button", { name: "Envoyer et choisir un créneau" }).click();
  await expect(page.locator("#f-name-error")).toHaveText("Ajoutez votre nom.");

  await page.fill("#f-name", "TEST Zyade");
  await page.fill("#f-email", "test@example.com");
  await page.fill("#f-instagram", "@test");
  await page.fill("#f-business", "Studio");
  await page.selectOption("#f-camera", { label: "Je peux essayer" });
  await page.getByRole("button", { name: "Envoyer et choisir un créneau" }).click();
  await page.waitForURL(/\/fr\/thanks\?/);

  expect(bodies[0]!.get("lang")).toBe("fr");
  // Stored values stay English, so Notion reads the same in both languages.
  expect(bodies[0]!.get("camera")).toBe("I can try");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Merci. Nous avons bien reçu vos informations.",
  );
});
