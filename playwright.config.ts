import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// This sandbox has Chromium pre-installed and cannot download browsers.
// In CI, `npx playwright install chromium` provides the browser instead.
const sandboxChromium = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(sandboxChromium) ? sandboxChromium : undefined);

// PW_PORT lets the tests run while a dev server holds 4321.
const port = process.env.PW_PORT ?? "4321";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, launchOptions: { executablePath } },
  webServer: {
    command: `npx astro preview --port ${port} --host 127.0.0.1 --ignore-lock`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } },
    },
    // The iPhone engine, where most visitors are, and the same engine as desktop Safari. Opt in, because
    // they need `npx playwright install webkit`: PW_WEBKIT=1 npx playwright test --project=iphone
    // (or --project=safari).
    ...(process.env.PW_WEBKIT
      ? [
          { name: "iphone", use: { ...devices["iPhone 13"] } },
          { name: "safari", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
    // The Google Chrome installed on this computer: PW_CHROME=1 npx playwright test --project=chrome
    ...(process.env.PW_CHROME
      ? [{ name: "chrome", use: { channel: "chrome", viewport: { width: 1280, height: 800 } } }]
      : []),
  ],
});
