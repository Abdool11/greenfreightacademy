import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/company/reports — training progress + certification data for the client
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: drivers, error: driversError }, { data: certs }, { data: company }, { data: courseRows }] = await Promise.all([
    supabaseAdmin
      .from("drivers")
      .select(`
        id, first_name, last_name, mobile, activation_status,
        enrolments (
          id, status, progress_percent, started_at, completed_at, programme_slug
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

    supabaseAdmin
      .from("courses")
      .select("slug, name"),
  ]);

  if (driversError) {
    return NextResponse.json({ error: "Failed to load driver report data" }, { status: 500 });
  }

  // enrolments has no FK to courses — resolve course names via programme_slug.
  const courseBySlug = new Map((courseRows ?? []).map((c: { slug: string; name: string }) => [c.slug, c]));
  const driverRows = (drivers ?? []).map((d: any) => ({
    ...d,
    enrolments: (d.enrolments ?? []).map((e: any) => ({
      ...e,
      enrolled_at: e.started_at,
      certified_at: e.completed_at,
      courses: courseBySlug.get(e.programme_slug) ?? null,
    })),
  }));

  // Compute summary stats
  const totalDrivers    = (driverRows ?? []).length;
  const enrolled        = (driverRows ?? []).filter(d => (d.enrolments ?? []).length > 0).length;
  const inProgress      = (driverRows ?? []).filter(d =>
    (d.enrolments ?? []).some((e: { status: string }) => e.status === "in_progress" || e.status === "active")
  ).length;
  const certified       = (driverRows ?? []).filter(d =>
    (d.enrolments ?? []).some((e: { status: string }) => e.status === "certified" || e.status === "completed")
  ).length;
  const notStarted      = (driverRows ?? []).filter(d =>
    (d.enrolments ?? []).length > 0 &&
    (d.enrolments ?? []).every((e: { status: string; progress_percent: number }) => e.progress_percent === 0)
  ).length;

  const avgProgress = enrolled > 0
    ? Math.round(
        (driverRows ?? []).flatMap(d => d.enrolments ?? [])
          .reduce((s: number, e: { progress_percent: number }) => s + (e.progress_percent ?? 0), 0) /
        Math.max((driverRows ?? []).flatMap(d => d.enrolments ?? []).length, 1)
      )
    : 0;

  return NextResponse.json({
    company:      company ?? {},
    drivers:      driverRows,
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
