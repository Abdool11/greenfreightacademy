import { expect, test } from "@playwright/test";
import { clientLogin, sessionCookieHeader } from "./helpers";

const baseURL = process.env.GFA_TEST_BASE_URL;

function isNonProductionBaseURL(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

const canRunPublicChecks = isNonProductionBaseURL(baseURL);
const canRunClientChecks = canRunPublicChecks && Boolean(
  process.env.GFA_TEST_CLIENT_EMAIL && process.env.GFA_TEST_CLIENT_PASSWORD
);

test.describe("Release 17 launch catalogue regression", () => {
  test.skip(!canRunPublicChecks, "Requires an explicitly supplied non-production GFA_TEST_BASE_URL.");

  test("public programme page presents the Professional Truck Driver Program at the approved once-off price", async ({ page }) => {
    await page.goto("/programmes");
    await expect(page.getByRole("heading", { name: "Professional Truck Driver Program", exact: true })).toBeVisible();
    await expect(page.getByText("R299 once-off per driver", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("There are no monthly programme fees", { exact: false })).toBeVisible();
    await expect(page.getByText("Eco-Driver Training", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Green Road Freight Management", { exact: true })).toHaveCount(0);
  });

  test("public price page communicates EFT-first launch terms", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Professional Truck Driver Program launch pricing" })).toBeVisible();
    await expect(page.getByText("R299", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("There are no monthly programme fees at launch.", { exact: false })).toBeVisible();
    await expect(page.getByText("EFT", { exact: false }).first()).toBeVisible();
  });

  test("authenticated catalogue endpoint exposes only the active once-off PTDP record", async ({ request }) => {
    test.skip(!canRunClientChecks, "Requires temporary Preview-only client credentials.");
    const auth = await clientLogin(request);
    const response = await request.get("/api/company/programmes", {
      headers: { Cookie: sessionCookieHeader(auth.cookies) },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const programmes = body.programmes ?? [];
    expect(programmes).toHaveLength(1);
    expect(programmes[0].slug).toMatch(/^(ptdp|professional-truck-driver)$/);
    expect(Number(programmes[0].price_corporate)).toBe(299);
    expect(programmes[0].price_model).toBe("once_off");
  });

  test("client dashboard exposes EFT rather than the deferred card checkout", async ({ page, request }) => {
    test.skip(!canRunClientChecks, "Requires temporary Preview-only client credentials.");
    const auth = await clientLogin(request);
    await page.context().addCookies(Object.entries(auth.cookies).map(([name, value]) => ({
      name,
      value,
      domain: new URL(baseURL!).hostname,
      path: "/",
    })));

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByText("R299 once-off per driver", { exact: false })).toBeVisible();
    await expect(page.getByText("Pay by card", { exact: false })).toHaveCount(0);
  });
});
