import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "./supabase";

const SECRET = new TextEncoder().encode(
  process.env.GFA_JWT_SECRET || process.env.JWT_SECRET || "gfa-dev-secret-change-in-production"
);

/**
 * Admin and company sessions must be independent. The legacy shared cookie is
 * read only during the transition and only when its payload matches the role
 * that is being requested. New logins never write the legacy cookie.
 */
export const CLIENT_SESSION_COOKIE_NAME = "gfa_client_session";
export const ADMIN_SESSION_COOKIE_NAME = "gfa_admin_session";
const LEGACY_SESSION_COOKIE_NAME = "gfa_session";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 3600;

// ─── Session types ────────────────────────────────────────────────────────────

export type GFARole = "client" | "admin" | "super_admin";

/** Session for company clients */
export interface CompanySession {
  companyId: string;
  companyName: string;
  email: string;
  role: GFARole;
  accountType?: "trial" | "full";
  // Backward-compat aliases used by bulletin routes
  id?: string;
  name?: string;
  supabase_user_id?: string;
}

/** Session for GFA platform admins (stored in gfa_admins table) */
export interface AdminSession {
  adminId: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
}

type AnySession = CompanySession | AdminSession;

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isAdminSession(s: AnySession): s is AdminSession {
  return "adminId" in s;
}

export function isCompanySession(s: AnySession): s is CompanySession {
  return "companyId" in s;
}

// ─── Sign a session token ────────────────────────────────────────────────────

export async function signSession(payload: AnySession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

// ─── Read and verify session tokens ───────────────────────────────────────────

async function readVerifiedSession(token: string | undefined): Promise<AnySession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AnySession;
  } catch {
    return null;
  }
}

/**
 * Returns a company session from the new client cookie, or a valid legacy
 * cookie only when that legacy token is a company session.
 */
export async function getSession(): Promise<CompanySession | null> {
  const cookieStore = await cookies();
  const clientSession = await readVerifiedSession(
    cookieStore.get(CLIENT_SESSION_COOKIE_NAME)?.value
  );
  if (clientSession && isCompanySession(clientSession)) return clientSession;

  const legacySession = await readVerifiedSession(
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value
  );
  return legacySession && isCompanySession(legacySession) ? legacySession : null;
}

/**
 * Returns an admin session from the new admin cookie, or a valid legacy cookie
 * only when that legacy token is an admin session.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const adminSession = await readVerifiedSession(
    cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value
  );
  if (adminSession && isAdminSession(adminSession)) return adminSession;

  const legacySession = await readVerifiedSession(
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value
  );
  return legacySession && isAdminSession(legacySession) ? legacySession : null;
}

/**
 * Prefer the company session for the historic generic helper, then fall back
 * to the independent admin session. Existing company consumers remain scoped
 * by their own type guards and route requirements.
 */
export async function getAnySession(): Promise<AnySession | null> {
  return (await getSession()) ?? (await getAdminSession());
}

// ─── Require session — redirect to login if missing ─────────────────────────

export async function requireSession(): Promise<CompanySession> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session as CompanySession;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
  return session as AdminSession;
}

export async function requireSuperAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session || session.role !== "super_admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
  return session as AdminSession;
}

// ─── Set / clear role-specific session cookies ────────────────────────────────

function setCookie(name: string, token: string): string {
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Write a company-only session cookie. */
export function setClientSessionCookie(token: string): string {
  return setCookie(CLIENT_SESSION_COOKIE_NAME, token);
}

/** Write an administrator-only session cookie. */
export function setAdminSessionCookie(token: string): string {
  return setCookie(ADMIN_SESSION_COOKIE_NAME, token);
}

/**
 * Clear only the client cookie. A legacy cookie is cleared only when it
 * decodes to a client session, which prevents client sign-out from ending an
 * existing administrator session during the transition.
 */
export async function clearClientSessionCookies(): Promise<string[]> {
  const cookieStore = await cookies();
  const legacySession = await readVerifiedSession(
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value
  );
  const cookiesToClear = [clearCookie(CLIENT_SESSION_COOKIE_NAME)];

  if (legacySession && isCompanySession(legacySession)) {
    cookiesToClear.push(clearCookie(LEGACY_SESSION_COOKIE_NAME));
  }

  return cookiesToClear;
}

/**
 * Clear only the administrator cookie. A legacy cookie is cleared only when it
 * decodes to an admin session, which prevents administrator sign-out from
 * ending an existing client session during the transition.
 */
export async function clearAdminSessionCookies(): Promise<string[]> {
  const cookieStore = await cookies();
  const legacySession = await readVerifiedSession(
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value
  );
  const cookiesToClear = [clearCookie(ADMIN_SESSION_COOKIE_NAME)];

  if (legacySession && isAdminSession(legacySession)) {
    cookiesToClear.push(clearCookie(LEGACY_SESSION_COOKIE_NAME));
  }

  return cookiesToClear;
}

// ─── Verify company credentials ─────────────────────────────────────────────

export async function verifyCompanyCredentials(
  email: string,
  password: string
): Promise<CompanySession | null> {
  const bcrypt = await import("bcryptjs");
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_email, password_hash, account_type")
    .eq("contact_email", email.toLowerCase())
    .single();

  if (!company) return null;
  if (!company.password_hash) return null;

  const valid = await bcrypt.compare(password, company.password_hash);
  if (!valid) return null;

  return {
    companyId: company.id,
    companyName: company.name,
    email: company.contact_email,
    role: "client",
    accountType: (company.account_type as "trial" | "full") ?? "full",
  };
}

// ─── Verify GFA admin credentials ────────────────────────────────────────────

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AdminSession | null> {
  const bcrypt = await import("bcryptjs");
  const { data: admin } = await supabaseAdmin
    .from("gfa_admins")
    .select("id, name, email, password_hash, role")
    .eq("email", email.toLowerCase())
    .single();

  if (!admin) return null;
  if (!admin.password_hash) return null;

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return null;

  return {
    adminId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role as "admin" | "super_admin",
  };
}

// ─── Backward-compat helper used by bulletin routes ──────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCompanyFromRequest(_req: unknown): Promise<CompanySession | null> {
  return getSession();
}
