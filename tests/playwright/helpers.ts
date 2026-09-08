import { Page, APIRequestContext } from "@playwright/test";

export const ADMIN_SESSION_COOKIE_NAME = "gfa_admin_session";
export const CLIENT_SESSION_COOKIE_NAME = "gfa_client_session";
export const LEGACY_SESSION_COOKIE_NAME = "gfa_session";

export interface SessionLoginResult {
  /** The role-specific cookie issued by the server. */
  cookies: Record<string, string>;
}

function extractCookie(setCookie: string, cookieName: string): string {
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  if (!match) {
    throw new Error(`Login response did not contain ${cookieName} cookie`);
  }
  return match[1];
}

/**
 * Logs in via the API and returns the administrator-only cookie. The test
 * credentials must be temporary credentials for an approved non-production
 * environment.
 */
export async function adminLogin(
  request: APIRequestContext
): Promise<SessionLoginResult> {
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

  const setCookie = res.headers()["set-cookie"];
  if (!setCookie) {
    throw new Error("Admin login did not return a session cookie");
  }

  return {
    cookies: (() => {
      const token = extractCookie(setCookie, ADMIN_SESSION_COOKIE_NAME);
      return {
        [ADMIN_SESSION_COOKIE_NAME]: token,
        // Existing transition tests explicitly exercise the guarded legacy read path.
        [LEGACY_SESSION_COOKIE_NAME]: token,
      };
    })(),
  };
}

/**
 * Logs in via the API and returns the client-only cookie. The test credentials
 * must be temporary credentials for an approved non-production environment.
 */
export async function clientLogin(
  request: APIRequestContext
): Promise<SessionLoginResult> {
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

  const setCookie = res.headers()["set-cookie"];
  if (!setCookie) {
    throw new Error("Client login did not return a session cookie");
  }

  return {
    cookies: (() => {
      const token = extractCookie(setCookie, CLIENT_SESSION_COOKIE_NAME);
      return {
        [CLIENT_SESSION_COOKIE_NAME]: token,
        // Existing transition tests explicitly exercise the guarded legacy read path.
        [LEGACY_SESSION_COOKIE_NAME]: token,
      };
    })(),
  };
}

/** Build a Cookie header from role-specific cookies. */
export function sessionCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

/** Set one or more session cookies on a browser page context. */
export async function setSessionOnPage(
  page: Page,
  baseURL: string,
  sessionCookies: Record<string, string> | string
): Promise<void> {
  const domain = new URL(baseURL).hostname;
  const entries = typeof sessionCookies === "string"
    ? [[LEGACY_SESSION_COOKIE_NAME, sessionCookies] as const]
    : Object.entries(sessionCookies);

  await page.context().addCookies(
    entries.map(([name, value]) => ({
      name,
      value,
      domain,
      path: "/",
    }))
  );
}
