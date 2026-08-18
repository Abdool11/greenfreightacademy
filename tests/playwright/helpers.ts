import { Page, APIRequestContext } from "@playwright/test";

/**
 * Authentication helpers for GFA Playwright tests.
 * Logs in via the API and sets the session cookie, avoiding the need to
 * navigate through the UI login form for every test.
 */

export async function adminLogin(
  request: APIRequestContext
): Promise<{ cookies: Record<string, string> }> {
  const email = process.env.GFA_TEST_ADMIN_EMAIL;
  const password = process.env.GFA_TEST_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "GFA_TEST_ADMIN_EMAIL and GFA_TEST_ADMIN_PASSWORD must be set to run admin tests"
    );
  }
  const res = await request.post("/api/admin/auth/login", {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Admin login failed: ${res.status()} ${await res.text()}`);
  }
  const cookies = res.headers()["set-cookie"];
  if (!cookies) {
    throw new Error("Admin login did not return a session cookie");
  }
  // Extract the gfa_session cookie value
  const match = cookies.match(/gfa_session=([^;]+)/);
  if (!match) {
    throw new Error("Admin login response did not contain gfa_session cookie");
  }
  return { cookies: { gfa_session: match[1] } };
}

export async function clientLogin(
  request: APIRequestContext
): Promise<{ cookies: Record<string, string> }> {
  const email = process.env.GFA_TEST_CLIENT_EMAIL;
  const password = process.env.GFA_TEST_CLIENT_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "GFA_TEST_CLIENT_EMAIL and GFA_TEST_CLIENT_PASSWORD must be set to run client tests"
    );
  }
  const res = await request.post("/api/auth/login", {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Client login failed: ${res.status()} ${await res.text()}`);
  }
  const cookies = res.headers()["set-cookie"];
  if (!cookies) {
    throw new Error("Client login did not return a session cookie");
  }
  const match = cookies.match(/gfa_session=([^;]+)/);
  if (!match) {
    throw new Error("Client login response did not contain gfa_session cookie");
  }
  return { cookies: { gfa_session: match[1] } };
}

/** Set the session cookie on a browser page context. */
export async function setSessionOnPage(
  page: Page,
  baseURL: string,
  cookieValue: string
): Promise<void> {
  await page.context().addCookies([
    {
      name: "gfa_session",
      value: cookieValue,
      domain: new URL(baseURL).hostname,
      path: "/",
    },
  ]);
}
