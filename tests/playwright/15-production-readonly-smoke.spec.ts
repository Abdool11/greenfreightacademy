import { expect, test } from "@playwright/test";

const productionOrigin = "https://www.greenfreightacademy.co.za";
const configuredOrigin = process.env.GFA_PRODUCTION_TEST_BASE_URL;

if (configuredOrigin !== productionOrigin) {
  throw new Error(
    `This test accepts only ${productionOrigin}; received ${configuredOrigin || "no origin"}.`,
  );
}

const publicRoutes = [
  "/",
  "/about",
  "/programmes",
  "/pricing",
  "/contact",
  "/registry",
  "/verify",
  "/login",
  "/register",
  "/trial",
  "/privacy",
  "/terms",
];

/**
 * Production read-only smoke coverage.
 *
 * This suite never submits a form, authenticates a user, calls a mutating API,
 * performs a payment/deployment/certificate action, or reads a protected record.
 * State-changing end-to-end cases stay in the Preview-only suite.
 */
test.describe("GFA production read-only smoke", () => {
  test.use({ baseURL: productionOrigin });

  for (const route of publicRoutes) {
    test(`renders public route ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response, `Expected a response for ${route}`).not.toBeNull();
      expect(response!.status(), `Expected ${route} to succeed`).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }

  test("presents privacy-safe registry entry only", async ({ page }) => {
    await page.goto("/registry", { waitUntil: "networkidle" });
    await expect(page.getByLabel("Exact certificate number")).toBeVisible();
    await expect(page.getByText("verification does not search by name, ID number, mobile number or employer")).toBeVisible();
    await expect(page.getByText("Driver ID number or full name")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/certificate holder|download certificate/i);
  });
});
