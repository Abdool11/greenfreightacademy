import { expect, test } from "@playwright/test";
import { adminLogin, sessionCookieHeader } from "./helpers";

const baseUrl = process.env.GFA_TEST_BASE_URL;
const paymentId = process.env.GFA_TEST_EFT_PENDING_PAYMENT_ID;
const bankReference = process.env.GFA_TEST_EFT_BANK_REFERENCE;
const safePreview = Boolean(baseUrl) && !/greenfreightacademy\.co\.za/i.test(baseUrl || "");

test.describe("GFA EFT reconciliation audit", () => {
  test.skip(!safePreview, "Requires an explicitly supplied non-production Preview URL; production is blocked by this suite.");

  test("records a synthetic confirmed EFT with linked event, ledger and administrator audit identifiers", async ({ request }) => {
    test.skip(
      !paymentId || !bankReference || !process.env.GFA_TEST_ADMIN_EMAIL || !process.env.GFA_TEST_ADMIN_PASSWORD,
      "Requires a fresh synthetic pending EFT, a synthetic bank reference and Preview-only administrator credentials."
    );

    const admin = await adminLogin(request);
    const response = await request.post("/api/admin/payments/reconcile", {
      headers: { Cookie: sessionCookieHeader(admin.cookies) },
      data: {
        paymentId,
        decision: "confirm",
        bankTransactionReference: bankReference,
        reconciliationNotes: "Synthetic Preview-only reconciliation test.",
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, status: "confirmed" });
    expect(body.reconciliationEventId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body.ledgerEntryId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body.auditId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
