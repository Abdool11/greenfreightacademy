import { expect, test } from "@playwright/test";
import {
  ADMIN_SESSION_COOKIE_NAME,
  CLIENT_SESSION_COOKIE_NAME,
  adminLogin,
  clientLogin,
  setSessionOnPage,
} from "./helpers";

const baseURL = process.env.GFA_TEST_BASE_URL;
const syntheticCompanyId = process.env.GFA_TEST_ADMIN_COMPANY_ID;

function isNonProductionBaseURL(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      (hostname.endsWith(".vercel.app") && hostname !== "greenfreightacademy.vercel.app")
    );
  } catch {
    return false;
  }
}

const canRunSessionChecks = Boolean(
  isNonProductionBaseURL(baseURL) &&
  process.env.GFA_TEST_ADMIN_EMAIL &&
  process.env.GFA_TEST_ADMIN_PASSWORD &&
  process.env.GFA_TEST_CLIENT_EMAIL &&
  process.env.GFA_TEST_CLIENT_PASSWORD
);
const canRunDetailCheck = canRunSessionChecks && Boolean(syntheticCompanyId);
const canRunBreadcrumbChecks = isNonProductionBaseURL(baseURL);

function roleCookie(name: string, value: string | undefined): Record<string, string> {
  if (!value) throw new Error(`Missing ${name} in authenticated test response.`);
  return { [name]: value };
}

test.describe("Admin stability regression", () => {
  test.skip(
    !canRunSessionChecks,
    "Requires an approved non-production GFA_TEST_BASE_URL and temporary Preview-only admin/client credentials."
  );

  test("admin navigation remains available after client login and client sign-out", async ({ browser, request }) => {
    if (!baseURL) throw new Error("GFA_TEST_BASE_URL must be set.");

    const adminAuth = await adminLogin(request);
    const clientAuth = await clientLogin(request);
    const sessionCookies = {
      ...roleCookie(ADMIN_SESSION_COOKIE_NAME, adminAuth.cookies[ADMIN_SESSION_COOKIE_NAME]),
      ...roleCookie(CLIENT_SESSION_COOKIE_NAME, clientAuth.cookies[CLIENT_SESSION_COOKIE_NAME]),
    };

    const context = await browser.newContext();
    const page = await context.newPage();
    await setSessionOnPage(page, baseURL, sessionCookies);

    await page.goto("/admin/dashboard");
    await expect(page).not.toHaveURL(/\/admin\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Platform Overview" })).toBeVisible();

    await page.goto("/admin/companies");
    await expect(page).not.toHaveURL(/\/admin\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();

    const logoutResult = await page.evaluate(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      return { ok: response.ok };
    });
    expect(logoutResult.ok).toBeTruthy();

    await page.goto("/admin/dashboard");
    await expect(page).not.toHaveURL(/\/admin\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Platform Overview" })).toBeVisible();

    const cookieNames = (await context.cookies(baseURL)).map((cookie) => cookie.name);
    expect(cookieNames).toContain(ADMIN_SESSION_COOKIE_NAME);
    expect(cookieNames).not.toContain(CLIENT_SESSION_COOKIE_NAME);

    await context.close();
  });

  test("administrator sign-out does not clear a concurrent client session", async ({ browser, request }) => {
    if (!baseURL) throw new Error("GFA_TEST_BASE_URL must be set.");

    const adminAuth = await adminLogin(request);
    const clientAuth = await clientLogin(request);
    const sessionCookies = {
      ...roleCookie(ADMIN_SESSION_COOKIE_NAME, adminAuth.cookies[ADMIN_SESSION_COOKIE_NAME]),
      ...roleCookie(CLIENT_SESSION_COOKIE_NAME, clientAuth.cookies[CLIENT_SESSION_COOKIE_NAME]),
    };

    const context = await browser.newContext();
    const page = await context.newPage();
    await setSessionOnPage(page, baseURL, sessionCookies);

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);

    const logoutResult = await page.evaluate(async () => {
      const response = await fetch("/api/admin/auth/logout", { method: "POST" });
      return { ok: response.ok };
    });
    expect(logoutResult.ok).toBeTruthy();

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);

    const cookieNames = (await context.cookies(baseURL)).map((cookie) => cookie.name);
    expect(cookieNames).toContain(CLIENT_SESSION_COOKIE_NAME);
    expect(cookieNames).not.toContain(ADMIN_SESSION_COOKIE_NAME);

    await context.close();
  });

  test("client session remains denied from administrator companies routes", async ({ browser, request }) => {
    if (!baseURL) throw new Error("GFA_TEST_BASE_URL must be set.");

    const clientAuth = await clientLogin(request);
    const context = await browser.newContext();
    const page = await context.newPage();
    await setSessionOnPage(
      page,
      baseURL,
      roleCookie(CLIENT_SESSION_COOKIE_NAME, clientAuth.cookies[CLIENT_SESSION_COOKIE_NAME])
    );

    await page.goto("/admin/companies");
    await expect(page).toHaveURL(/\/admin\/login(?:\?.*)?$/);

    await context.close();
  });

  test("administrator can open Companies and an approved synthetic company detail", async ({ browser, request }) => {
    test.skip(
      !canRunDetailCheck,
      "Requires GFA_TEST_ADMIN_COMPANY_ID for an approved synthetic company in the non-production test environment."
    );
    if (!baseURL || !syntheticCompanyId) throw new Error("Preview base URL and synthetic company ID must be set.");

    const adminAuth = await adminLogin(request);
    const context = await browser.newContext();
    const page = await context.newPage();
    await setSessionOnPage(
      page,
      baseURL,
      roleCookie(ADMIN_SESSION_COOKIE_NAME, adminAuth.cookies[ADMIN_SESSION_COOKIE_NAME])
    );

    await page.goto("/admin/companies");
    await expect(page).not.toHaveURL(/\/admin\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();

    await page.goto(`/admin/companies/${syntheticCompanyId}`);
    await expect(page).not.toHaveURL(/\/admin\/login(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/\/admin\/companies$/);

    await context.close();
  });
});

test.describe("Admin breadcrumb regression", () => {
  test.skip(
    !canRunBreadcrumbChecks,
    "Requires an approved non-production GFA_TEST_BASE_URL; this visual copy check uses no credentials or data mutation."
  );

  for (const pagePath of ["/admin/programmes", "/admin/vouchers"]) {
    test(`${pagePath} presents a Dashboard breadcrumb`, async ({ browser }) => {
      if (!baseURL) throw new Error("GFA_TEST_BASE_URL must be set.");

      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(pagePath);

      const dashboardBreadcrumb = page.getByRole("link", { name: "Dashboard" });
      await expect(dashboardBreadcrumb).toBeVisible();
      await expect(dashboardBreadcrumb).toHaveAttribute("href", "/admin/dashboard");
      await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

      await context.close();
    });
  }
});
