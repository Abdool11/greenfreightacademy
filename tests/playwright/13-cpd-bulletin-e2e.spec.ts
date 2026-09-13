import { expect, test } from "@playwright/test";
import { adminLogin, clientLogin, sessionCookieHeader } from "./helpers";

const baseUrl = process.env.GFA_TEST_BASE_URL;
const safePreview = Boolean(baseUrl) && !/greenfreightacademy\.co\.za/i.test(baseUrl || "");

function bulletinIdFromQueueItem(item: Record<string, unknown>): string | null {
  const bulletin = item.bulletins;
  if (Array.isArray(bulletin)) return typeof bulletin[0]?.id === "string" ? bulletin[0].id : null;
  return bulletin && typeof bulletin === "object" && typeof (bulletin as { id?: unknown }).id === "string"
    ? (bulletin as { id: string }).id
    : null;
}

test.describe("GFA bulletin and CPD queue", () => {
  test.skip(!safePreview, "Requires an explicitly supplied non-production Preview URL; production is blocked by this suite.");

  test("creates a synthetic company bulletin and records an auditable CPD approval without outbound delivery", async ({ request }) => {
    test.skip(
      !process.env.GFA_TEST_CLIENT_EMAIL || !process.env.GFA_TEST_CLIENT_PASSWORD || !process.env.GFA_TEST_ADMIN_EMAIL || !process.env.GFA_TEST_ADMIN_PASSWORD,
      "Requires temporary Preview-only client and administrator credentials."
    );

    const client = await clientLogin(request);
    const marker = `E2E CPD ${Date.now()}`;
    const submit = await request.post("/api/bulletins/submit", {
      headers: { Cookie: sessionCookieHeader(client.cookies) },
      data: {
        title: marker,
        category: "training",
        description: "Synthetic Preview-only CPD workflow test. No external delivery is requested.",
        why_it_matters: "Validates the GFA CPD queue journey.",
        mitigation_message: "No driver action is required for this synthetic test.",
        driver_action: "Review only",
        urgency: "standard",
        audience_type: "all",
        confidential: true,
        waive_fee: false,
      },
    });
    expect(submit.status()).toBe(200);
    const created = await submit.json();
    expect(created).toMatchObject({ success: true, status: "submitted", distribution: "cpd_library" });
    expect(created.bulletin_id).toMatch(/^[0-9a-f-]{36}$/i);

    const admin = await adminLogin(request);
    const queue = await request.get("/api/admin/cpd-queue?status=pending_review", {
      headers: { Cookie: sessionCookieHeader(admin.cookies) },
    });
    expect(queue.status()).toBe(200);
    const queueBody = await queue.json();
    const item = (queueBody.items as Array<Record<string, unknown>>).find(
      (candidate) => bulletinIdFromQueueItem(candidate) === created.bulletin_id
    );
    expect(item).toBeTruthy();
    expect(item?.title).toBe(marker);
    expect(item?.company_id).toMatch(/^[0-9a-f-]{36}$/i);

    const approve = await request.post("/api/admin/cpd-queue", {
      headers: { Cookie: sessionCookieHeader(admin.cookies) },
      data: {
        item_id: item?.id,
        action: "approve",
        admin_notes: "Synthetic Preview-only approval test.",
      },
    });
    expect(approve.status()).toBe(200);
    const approved = await approve.json();
    expect(approved).toMatchObject({ ok: true, status: "approved" });
    expect(approved.auditId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
