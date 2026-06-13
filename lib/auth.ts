import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "./supabase";

const SECRET = new TextEncoder().encode(
  process.env.GFA_JWT_SECRET || process.env.JWT_SECRET || "gfa-dev-secret-change-in-production"
);
const COOKIE_NAME = "gfa_session";

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

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isAdminSession(s: CompanySession | AdminSession): s is AdminSession {
  return "adminId" in s;
}

export function isCompanySession(s: CompanySession | AdminSession): s is CompanySession {
  return "companyId" in s;
}

// ─── Sign a session token ────────────────────────────────────────────────────

export async function signSession(payload: CompanySession | AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

// ─── Get current session from cookie ────────────────────────────────────────

export async function getSession(): Promise<CompanySession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    const s = payload as unknown as CompanySession | AdminSession;
    if (isCompanySession(s)) return s;
    return null;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    const s = payload as unknown as CompanySession | AdminSession;
    if (isAdminSession(s)) return s;
    return null;
  } catch {
    return null;
  }
}

export async function getAnySession(): Promise<CompanySession | AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as CompanySession | AdminSession;
  } catch {
    return null;
  }
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

// ─── Set / clear session cookie ──────────────────────────────────────────────

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
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
