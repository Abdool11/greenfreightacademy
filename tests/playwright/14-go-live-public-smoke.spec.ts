import { expect, test } from "@playwright/test";

const baseUrl = process.env.GFA_TEST_BASE_URL;
const safePreview = Boolean(baseUrl) && !/greenfreightacademy\.co\.za/i.test(baseUrl || "");

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

test.describe("GFA final public-route smoke", () => {
  test.skip(!safePreview, "Requires an explicitly supplied non-production Preview URL; production is blocked by this suite.");

  for (const route of publicRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `Expected ${route} to return a successful response`).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }

  test("keeps the public registry privacy-preserving when no certificate number is supplied", async ({ request }) => {
    const response = await request.get("/api/public/certificates/verify");
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/driverName|idNumber|documentUrl/i);
  });
});
