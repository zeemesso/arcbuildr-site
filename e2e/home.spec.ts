import { expect, test } from "@playwright/test";
import { hero, founding, questions, fit, method, evidence, footer } from "../src/content/site";
import { CONTACT_EMAIL } from "../src/config";
import { SECTION_IDS } from "../src/content/sections";
test("home has the content headline, thirteen sections, founding line and bounded price", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(hero.h1);
  expect(await page.locator("main > section").evaluateAll((els) => els.map((el) => el.id))).toEqual(
    [...SECTION_IDS],
  );
  await expect(page.getByText(founding.replace("{n}", "3"), { exact: true })).toHaveCount(2);
  await expect(page.locator("#q-price")).toContainText(questions.items[0]!.a);
  const outside = await page.locator("main").evaluate((el, exception) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelector("#q-price")?.remove();
    return clone.textContent!.replace(exception, "");
  }, fit.yes.items[2]!);
  expect(outside).not.toMatch(/\b(750|1,?000|1,?250|1,?500|1,?750)\b/);
});
test("questions have native keyboard controls and every answer in HTML", async ({ page }) => {
  await page.goto("/");
  for (const [i, item] of questions.items.entries()) {
    const row = page.locator(`#${item.id}`);
    await expect(row.locator("p")).toHaveText(item.a);
    if (i === 0) await expect(row).toHaveAttribute("open", "");
    else await expect(row).not.toHaveAttribute("open");
    await row.locator("summary").focus();
    await page.keyboard.press("Enter");
    expect((await row.getAttribute("open")) !== null).toBe(i !== 0);
  }
});

test("method steps, findings and contact use the full copy", async ({ page }) => {
  await page.goto("/");
  for (const [index, step] of method.steps.entries()) {
    const row = page.locator(".method-steps li").nth(index);
    await expect(row.locator("h3")).toHaveText([step.plain]);
    await expect(row.locator(".kicker")).toHaveText([method.getLabel, method.fixesLabel]);
    await expect(row.locator(".doc")).toHaveText(step.doc);
    await expect(row.locator(".quote")).toHaveText(step.fixes);
  }
  for (const [index, finding] of evidence.findings.entries()) {
    const why = page.locator(".finding .why").nth(index);
    await expect(why.locator(".kicker")).toHaveText(evidence.whyLabel);
    await expect(why).toContainText(finding.why);
  }
  const contact = page.locator('footer a[href^="mailto:"]');
  if (CONTACT_EMAIL) {
    await expect(contact).toHaveText(CONTACT_EMAIL);
    await expect(contact).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    await expect(page.locator("footer")).toContainText(
      footer.contact.replace("{email}", CONTACT_EMAIL),
    );
  } else await expect(contact).toHaveCount(0);
});
