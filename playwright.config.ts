import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// This sandbox has Chromium pre-installed and cannot download browsers.
// In CI, `npx playwright install chromium` provides the browser instead.
const sandboxChromium = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(sandboxChromium) ? sandboxChromium : undefined);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4321", launchOptions: { executablePath } },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } },
    },
  ],
});
