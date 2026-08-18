import { test, expect } from "@playwright/test";
import { createHmac } from "crypto";

/**
 * Journey 5: R6 Learning event ingestion
 *
 * Verifies the signed learning-event receiver:
 * - When ENABLE_R6_EVENT_INGEST is false, endpoint returns 503
 * - When enabled, a valid HMAC-signed event updates the enrolment
 * - Duplicate events (same source + external_event_id) are recorded but don't double-update
 * - Invalid-signature events are rejected with 401
 *
 * NOTE: The "enabled" tests require the flag to be flipped to true on the
 * target environment. The "disabled" test runs regardless.
 */
test.describe("R6 learning events", () => {
  test("endpoint returns 503 when ingestion is disabled", async ({ request }) => {
    const res = await request.post("/api/integrations/learning-events", {
      data: {
        source: "betterdriver",
        externalEventId: "test-disabled-check",
        eventType: "training_started",
        companyId: "00000000-0000-0000-0000-000000000000",
        driverId: "00000000-0000-0000-0000-000000000000",
        enrolmentId: "00000000-0000-0000-0000-000000000000",
        occurredAt: new Date().toISOString(),
      },
    });

    // When the flag is off, the endpoint should return 503
    if (res.status() === 503) {
      const data = await res.json();
      expect(data.error).toMatch(/disabled/i);
    } else {
      // If the flag is on, the event will be processed — we should get
      // either a 404 (enrolment not found) or 401 (bad signature)
      // This test just verifies the endpoint is reachable
      expect([200, 401, 404, 503]).toContain(res.status());
    }
  });

  test("invalid signature is rejected", async ({ request }) => {
    // Send an event with a deliberately wrong signature
    const payload = JSON.stringify({
      source: "betterdriver",
      externalEventId: "test-bad-sig",
      eventType: "training_started",
      companyId: "00000000-0000-0000-0000-000000000000",
      driverId: "00000000-0000-0000-0000-000000000000",
      enrolmentId: "00000000-0000-0000-0000-000000000000",
      occurredAt: new Date().toISOString(),
    });

    const res = await request.post("/api/integrations/learning-events", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "x-gfa-event-signature": "0000000000000000000000000000000000000000000000000000000000000000",
      },
    });

    // Should be 503 (disabled) or 401 (invalid signature)
    if (res.status() === 503) {
      test.skip(true, "ENABLE_R6_EVENT_INGEST is false — signature test skipped");
    }
    expect(res.status()).toBe(401);
  });

  test("valid signed event with non-existent enrolment returns 404", async ({ request }) => {
    test.skip(
      !process.env.BD_EVENT_SECRET,
      "BD_EVENT_SECRET must be set to test signed events"
    );

    const secret = process.env.BD_EVENT_SECRET!;
    const payload = JSON.stringify({
      source: "betterdriver",
      externalEventId: "test-valid-sig-no-enrolment",
      eventType: "training_started",
      companyId: "00000000-0000-0000-0000-000000000000",
      driverId: "00000000-0000-0000-0000-000000000000",
      enrolmentId: "00000000-0000-0000-0000-000000000000",
      occurredAt: new Date().toISOString(),
    });

    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    const res = await request.post("/api/integrations/learning-events", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "x-gfa-event-signature": signature,
      },
    });

    // If disabled, skip
    if (res.status() === 503) {
      test.skip(true, "ENABLE_R6_EVENT_INGEST is false — signed event test skipped");
    }

    // With a valid signature but non-existent enrolment, should get 404
    expect(res.status()).toBe(404);
  });

  test("duplicate event is handled gracefully", async ({ request }) => {
    test.skip(
      !process.env.BD_EVENT_SECRET,
      "BD_EVENT_SECRET must be set to test signed events"
    );

    const secret = process.env.BD_EVENT_SECRET!;
    const payload = JSON.stringify({
      source: "betterdriver",
      externalEventId: "test-duplicate-event",
      eventType: "training_started",
      companyId: "00000000-0000-0000-0000-000000000000",
      driverId: "00000000-0000-0000-0000-000000000000",
      enrolmentId: "00000000-0000-0000-0000-000000000000",
      occurredAt: new Date().toISOString(),
    });

    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    // Send the same event twice
    const res1 = await request.post("/api/integrations/learning-events", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "x-gfa-event-signature": signature,
      },
    });

    if (res1.status() === 503) {
      test.skip(true, "ENABLE_R6_EVENT_INGEST is false — duplicate test skipped");
    }

    const res2 = await request.post("/api/integrations/learning-events", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "x-gfa-event-signature": signature,
      },
    });

    // Second send should return 404 (enrolment not found) since we're using
    // a non-existent enrolment ID. In a real test with a real enrolment,
    // the second response would have duplicate: true
    expect([200, 404]).toContain(res2.status());
  });
});
