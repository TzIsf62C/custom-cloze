// playwright.config.js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  fullyParallel: false, // IndexedDB state must not bleed between tests

  use: {
    baseURL: "http://localhost:8765",
    headless: true,
    // Each test gets a fresh browser context (fresh IndexedDB) automatically
    // because Playwright isolates contexts per test by default.
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "python3 -m http.server 8765 --directory ../customcloze",
    port: 8765,
    reuseExistingServer: true,
  },
});
