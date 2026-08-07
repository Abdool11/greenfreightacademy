import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/company/reports — training progress + certification data for the client
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: drivers }, { data: certs }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from("drivers")
      .select(`
        id, first_name, last_name, mobile, activation_status,
        enrolments (
          id, status, progress_percent, enrolled_at, completed_at, certified_at,
          courses ( name, slug )
        )
      `)
      .eq("company_id", session.companyId)
      .order("last_name"),

    supabaseAdmin
      .from("certifications")
      .select("id, certificate_number, issued_at, expires_at, status, driver_id, courses(name)")
      .eq("company_id", session.companyId)
      .order("issued_at", { ascending: false }),

    supabaseAdmin
      .from("companies")
      .select("name, contact_name")
      .eq("id", session.companyId)
      .single(),
  ]);

  // Compute summary stats
  const totalDrivers    = (drivers ?? []).length;
  const enrolled        = (drivers ?? []).filter(d => (d.enrolments ?? []).length > 0).length;
  const inProgress      = (drivers ?? []).filter(d =>
    (d.enrolments ?? []).some((e: { status: string }) => e.status === "in_progress" || e.status === "active")
  ).length;
  const certified       = (drivers ?? []).filter(d =>
    (d.enrolments ?? []).some((e: { status: string }) => e.status === "certified" || e.status === "completed")
  ).length;
  const notStarted      = (drivers ?? []).filter(d =>
    (d.enrolments ?? []).length > 0 &&
    (d.enrolments ?? []).every((e: { status: string; progress_percent: number }) => e.progress_percent === 0)
  ).length;

  const avgProgress = enrolled > 0
    ? Math.round(
        (drivers ?? []).flatMap(d => d.enrolments ?? [])
          .reduce((s: number, e: { progress_percent: number }) => s + (e.progress_percent ?? 0), 0) /
        Math.max((drivers ?? []).flatMap(d => d.enrolments ?? []).length, 1)
      )
    : 0;

  return NextResponse.json({
    company:      company ?? {},
    drivers:      drivers ?? [],
    certifications: certs ?? [],
    summary: {
      totalDrivers,
      enrolled,
      inProgress,
      certified,
      notStarted,
      avgProgress,
    },
  });
}
