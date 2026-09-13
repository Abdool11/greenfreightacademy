import { expect, test } from "@playwright/test";
import { adminLogin, sessionCookieHeader } from "./helpers";

const baseUrl = process.env.GFA_TEST_BASE_URL;
const completionAssertion = process.env.GFA_TEST_CERTIFICATE_COMPLETION_ASSERTION;
const statusAssertion = process.env.GFA_TEST_CERTIFICATE_STATUS_ASSERTION;
const handoffAssertion = process.env.GFA_TEST_CERTIFICATE_HANDOFF_ASSERTION;
const otherDriverHandoffAssertion = process.env.GFA_TEST_OTHER_DRIVER_HANDOFF_ASSERTION;
const pendingCertificateId = process.env.GFA_TEST_PENDING_CERTIFICATE_ID;
const notEligibleCertificateId = process.env.GFA_TEST_NOT_ELIGIBLE_CERTIFICATE_ID;
const supersedeCertificateId = process.env.GFA_TEST_SUPERSEDE_CERTIFICATE_ID;
const replacementCertificateId = process.env.GFA_TEST_REPLACEMENT_CERTIFICATE_ID;
const safePreview = Boolean(baseUrl) && !/greenfreightacademy\.co\.za/i.test(baseUrl || "");

function signedHeaders(assertion: string) {
  return { Authorization: `Bearer ${assertion}` };
}

test.describe("GFA certificate contract Version 2", () => {
  test.skip(!safePreview, "Requires an explicitly supplied non-production Preview URL; production is blocked by this suite.");

  test("retires direct certificate issue and generic document-grant routes", async ({ request }) => {
    const [issue, grant] = await Promise.all([
      request.post("/api/integrations/certificates/issue"),
      request.post("/api/integrations/certificates/document-grant"),
    ]);
    expect(issue.status()).toBe(410);
    expect(grant.status()).toBe(410);
  });

  test("fails closed for invalid Version 2 signed assertions", async ({ request }) => {
    const [completion, status, handoff] = await Promise.all([
      request.post("/api/integrations/certificates/completion-evidence", { headers: signedHeaders("intentionally-invalid") }),
      request.post("/api/integrations/certificates/status", { headers: signedHeaders("intentionally-invalid") }),
      request.post("/api/integrations/certificates/handoff", { headers: signedHeaders("intentionally-invalid") }),
    ]);
    expect(completion.status()).toBe(401);
    expect(status.status()).toBe(401);
    expect(handoff.status()).toBe(401);
  });

  test("reaches each valid administrator decision route and returns an auditable correlation identifier", async ({ request }) => {
    test.skip(
      !pendingCertificateId || !process.env.GFA_TEST_ADMIN_EMAIL || !process.env.GFA_TEST_ADMIN_PASSWORD,
      "Requires Preview-only administrator credentials and a pending synthetic certificate."
    );
    const admin = await adminLogin(request);
    const issue = await request.post(`/api/admin/certificates/${pendingCertificateId}/issue`, {
      headers: { Cookie: sessionCookieHeader(admin.cookies) },
    });
    expect(issue.status()).toBe(200);
    const issueBody = await issue.json();
    expect(issueBody.certificate.lifecycleStatus).toBe("ISSUED");
    expect(issueBody.certificate.correlationId).toMatch(/^[0-9a-f-]{36}$/i);

    if (notEligibleCertificateId) {
      const notEligible = await request.post(`/api/admin/certificates/${notEligibleCertificateId}/not-eligible`, {
        headers: { Cookie: sessionCookieHeader(admin.cookies) },
        data: { reason: "Synthetic Preview-only eligibility decision." },
      });
      expect(notEligible.status()).toBe(200);
      expect((await notEligible.json()).certificate.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
    }

    if (supersedeCertificateId && replacementCertificateId) {
      const supersede = await request.post(`/api/admin/certificates/${supersedeCertificateId}/supersede`, {
        headers: { Cookie: sessionCookieHeader(admin.cookies) },
        data: { replacementCertificateId },
      });
      expect(supersede.status()).toBe(200);
      expect((await supersede.json()).certificate.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
    }
  });

  test("accepts a configured synthetic completion evidence event idempotently and returns only a signed GFA status assertion", async ({ request }) => {
    test.skip(!completionAssertion, "Requires a pre-signed synthetic GFA_TEST_CERTIFICATE_COMPLETION_ASSERTION.");
    const first = await request.post("/api/integrations/certificates/completion-evidence", { headers: signedHeaders(completionAssertion!) });
    expect(first.status()).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.ok).toBe(true);
    expect(typeof firstBody.statusAssertion).toBe("string");
    expect(firstBody).not.toHaveProperty("certificateNumber");
    expect(firstBody).not.toHaveProperty("driverId");

    const retry = await request.post("/api/integrations/certificates/completion-evidence", { headers: signedHeaders(completionAssertion!) });
    expect(retry.status()).toBe(200);
    const retryBody = await retry.json();
    expect(retryBody.ok).toBe(true);
    expect(typeof retryBody.statusAssertion).toBe("string");
  });

  test("returns a signed minimal status projection for a configured synthetic driver", async ({ request }) => {
    test.skip(!statusAssertion, "Requires a pre-signed synthetic GFA_TEST_CERTIFICATE_STATUS_ASSERTION.");
    const response = await request.post("/api/integrations/certificates/status", { headers: signedHeaders(statusAssertion!) });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.statusAssertion).toBe("string");
    expect(body).not.toHaveProperty("driverId");
    expect(body).not.toHaveProperty("documentUrl");
  });

  test("creates an opaque one-time handoff and rejects its replay", async ({ request }) => {
    test.skip(!handoffAssertion, "Requires a pre-signed synthetic GFA_TEST_CERTIFICATE_HANDOFF_ASSERTION.");
    const create = await request.post("/api/integrations/certificates/handoff", { headers: signedHeaders(handoffAssertion!) });
    expect(create.status()).toBe(200);
    const body = await create.json();
    expect(typeof body.handoffUrl).toBe("string");
    expect(body.handoffUrl).not.toMatch(/certificate_ref|certificate_number|driver_id|document_url/i);

    const firstUse = await request.get(body.handoffUrl, { maxRedirects: 0 });
    expect(firstUse.status()).toBe(307);
    expect(firstUse.headers()["location"]).toBeTruthy();
    expect(firstUse.headers()["cache-control"]).toContain("no-store");

    const replay = await request.get(body.handoffUrl, { maxRedirects: 0 });
    expect(replay.status()).toBe(404);
  });

  test("denies an optional synthetic cross-driver handoff assertion", async ({ request }) => {
    test.skip(!otherDriverHandoffAssertion, "Requires an externally signed assertion for Driver B targeting Driver A's synthetic certificate.");
    const response = await request.post("/api/integrations/certificates/handoff", { headers: signedHeaders(otherDriverHandoffAssertion!) });
    expect(response.status()).toBe(409);
  });
});
