import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * A tap on a phone, a click on a desktop.
 * Phones are used by touch, and the iPhone engine that Playwright ships takes touches only on some Macs.
 */
export const press = (target: Locator) =>
  test.info().project.use.hasTouch ? target.tap() : target.click();

/** Answers the question on screen: a choice is pressed, anything else is typed and sent with Enter. */
export async function answer(page: Page, id: string, value: string) {
  const step = page.locator(`.q.is-current[data-id="${id}"]`);
  await expect(step).toBeVisible();
  if (await step.locator(".choice").count()) {
    await press(step.locator(".choice").filter({ has: page.getByText(value, { exact: true }) }));
    return;
  }
  const field = step.locator(`#a-${id}`);
  await field.fill(value);
  await field.press("Enter");
}
