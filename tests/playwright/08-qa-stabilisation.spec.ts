import { expect, test } from "@playwright/test";
import { clientLogin } from "./helpers";

const quoteId = process.env.GFA_TEST_QA_DEPLOYED_QUOTE_ID;
const driverId = process.env.GFA_TEST_QA_DEPLOYED_DRIVER_ID;
const canRun = Boolean(
  process.env.GFA_TEST_CLIENT_EMAIL &&
  process.env.GFA_TEST_CLIENT_PASSWORD &&
  quoteId &&
  driverId
);

test.describe("QA stabilisation regression", () => {
  test.skip(!canRun, "Requires Preview-only client credentials plus a previously deployed synthetic quote and driver.");

  test("does not create a second deployment when a client repeats an already-completed single-driver action", async ({ request }) => {
    const auth = await clientLogin(request);
    const response = await request.post(`/api/company/quote/${quoteId}/deploy-driver`, {
      data: { driverId },
      headers: { Cookie: `gfa_session=${auth.cookies.gfa_session}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBeTruthy();
    expect(body.alreadyDeployed).toBeTruthy();
    expect(["sent", "prepared", "delivery_failed", "reserved"]).toContain(body.deploymentStatus);
  });
});
