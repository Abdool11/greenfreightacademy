import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for GFA Commercial & Compliance V1 regression suite.
 *
 * Tests run against the Vercel Preview URL by default. Set GFA_TEST_BASE_URL
 * to point at a different environment (e.g. http://localhost:3000 for local).
 *
 * Test credentials are read from environment variables so secrets are never
 * committed to the repo:
 *   GFA_TEST_ADMIN_EMAIL    — admin login email
 *   GFA_TEST_ADMIN_PASSWORD — admin login password
 *   GFA_TEST_CLIENT_EMAIL   — client login email
 *   GFA_TEST_CLIENT_PASSWORD— client login password
 *   BD_EVENT_SECRET         — shared secret for HMAC-signed learning events
 */
export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.GFA_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
