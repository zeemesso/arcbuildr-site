import { test, type Locator } from "@playwright/test";

/**
 * A tap on a phone, a click on a desktop.
 * Phones are used by touch, and the iPhone engine that Playwright ships takes touches only on some Macs.
 */
export const press = (target: Locator, options?: { timeout?: number }) =>
  test.info().project.use.hasTouch ? target.tap(options) : target.click(options);
