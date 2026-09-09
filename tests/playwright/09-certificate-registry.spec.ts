import { expect, test } from "@playwright/test";

const baseUrl = process.env.GFA_TEST_BASE_URL;
const certificateNumber = process.env.GFA_TEST_CERTIFICATE_NUMBER;
const expectedStatus = process.env.GFA_TEST_CERTIFICATE_STATUS || "active";
const canVerifySyntheticCertificate = Boolean(baseUrl && certificateNumber);

test.describe("GFA certificate registry safeguards", () => {
  test.skip(!baseUrl, "Requires an explicitly supplied non-production GFA_TEST_BASE_URL.");
  test("presents certificate-number-only verification with no learner identity search", async ({ page }) => {
    await page.goto("/registry");
    await expect(page.getByRole("heading", { name: "Certificate verification" })).toBeVisible();
    await expect(page.getByLabel("Exact certificate number")).toBeVisible();
    await expect(page.getByText("verification does not search by name, ID number, mobile number or employer")).toBeVisible();
    await expect(page.getByText("Driver ID number or full name")).toHaveCount(0);
  });

  test("keeps the certificate issue service gated or rejects an invalid signed event", async ({ request }) => {
    const response = await request.post("/api/integrations/certificates/issue", {
      headers: { Authorization: "Bearer intentionally-invalid" },
    });
    expect([401, 503]).toContain(response.status());
  });

  test("keeps document redemption gated or rejects an invalid code", async ({ request }) => {
    const response = await request.get("/api/certificates/document/intentionally-invalid-code");
    expect([404, 503]).toContain(response.status());
  });

  test("verifies only an approved synthetic Preview certificate when explicitly configured", async ({ request }) => {
    test.skip(!canVerifySyntheticCertificate, "Requires GFA_TEST_CERTIFICATE_NUMBER for a pre-existing synthetic Preview certificate.");
    const response = await request.post("/api/public/certificates/verify", {
      data: { certificateNumber },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.verified).toBe(expectedStatus === "active");
    expect(body.status).toBe(expectedStatus);
    expect(body.certificateNumber).toBe(certificateNumber);
    expect(body).not.toHaveProperty("driverName");
    expect(body).not.toHaveProperty("idNumber");
    expect(body).not.toHaveProperty("documentUrl");
  });
});
