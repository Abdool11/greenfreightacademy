import { expect, test } from "@playwright/test";

const baseUrl = process.env.GFA_TEST_BASE_URL;
const safePreview = Boolean(baseUrl) && !/greenfreightacademy\.co\.za/i.test(baseUrl || "");

test.describe("GFA public contact enquiry", () => {
  test.skip(!safePreview, "Requires an explicitly supplied non-production Preview URL; production is blocked by this suite.");

  test("renders the contact form and rejects an incomplete enquiry without writing data", async ({ page, request }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
    await expect(page.getByRole("button", { name: /send enquiry/i })).toBeEnabled();

    const invalid = await request.post("/api/submit-enquiry", {
      data: { type: "general" },
    });
    expect(invalid.status()).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
