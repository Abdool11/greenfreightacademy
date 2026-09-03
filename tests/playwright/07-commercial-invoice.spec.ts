import { expect, test } from "@playwright/test";
import { adminLogin } from "./helpers";

const invoiceQuoteId = process.env.GFA_TEST_INVOICE_QUOTE_ID;
const canRun = Boolean(process.env.GFA_TEST_ADMIN_EMAIL && process.env.GFA_TEST_ADMIN_PASSWORD && invoiceQuoteId);

test.describe("Commercial invoice regression", () => {
  test.skip(!canRun, "Requires Preview-only GFA_TEST_ADMIN credentials and a dedicated GFA_TEST_INVOICE_QUOTE_ID.");

  test("issues or reuses the dedicated synthetic-quote invoice and renders its PDF", async ({ request }) => {
    const auth = await adminLogin(request);
    const issue = await request.post("/api/admin/invoices", {
      data: { quoteId: invoiceQuoteId },
      headers: { Cookie: `gfa_session=${auth.cookies.gfa_session}` },
    });

    let invoiceId = "";
    if (issue.status() === 200) {
      const body = await issue.json();
      invoiceId = body.invoice?.id || "";
      expect(body.invoice?.invoice_number).toMatch(/^GFA-INV-\d{4}-\d{4}$/);
      expect(body.invoice?.amount_due).toBeGreaterThanOrEqual(0);
    } else {
      expect(issue.status()).toBe(409);
      const existing = await request.get("/api/admin/invoices", { headers: { Cookie: `gfa_session=${auth.cookies.gfa_session}` } });
      expect(existing.ok()).toBeTruthy();
      const body = await existing.json();
      invoiceId = (body.invoices || []).find((invoice: { source_quote_id?: string; id?: string }) => invoice.source_quote_id === invoiceQuoteId)?.id || "";
    }

    expect(invoiceId).toBeTruthy();
    const pdf = await request.get(`/api/company/invoices/${invoiceId}/pdf`, { headers: { Cookie: `gfa_session=${auth.cookies.gfa_session}` } });
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect(pdf.headers()["content-disposition"]).toContain("GFA-");
  });
});
