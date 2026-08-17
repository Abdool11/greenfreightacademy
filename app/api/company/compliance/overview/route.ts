import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = session.companyId;

  const [{ data: drivers }, { data: enrolments }, { data: certs }, { data: reviews }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("drivers").select("id, first_name, last_name, mobile").eq("company_id", companyId),
    supabaseAdmin.from("enrolments").select("id, driver_id, status, progress_percent, enrolled_at, completed_at, certified_at, programme_slug").eq("company_id", companyId),
    supabaseAdmin.from("certifications").select("id, driver_id, certificate_number, issued_at, status, programme").eq("company_id", companyId),
    supabaseAdmin.from("driver_competency_reviews").select("driver_id, next_review_due_at, status, last_qualifying_at").eq("company_id", companyId),
    supabaseAdmin.from("company_compliance_profiles").select("*").eq("company_id", companyId).maybeSingle(),
  ]);

  const now = new Date();
  const dueSoon = (reviews ?? []).filter(r => r.next_review_due_at && new Date(r.next_review_due_at).getTime() - now.getTime() <= 30 * 86400000 && new Date(r.next_review_due_at) >= now);
  const overdue = (reviews ?? []).filter(r => r.next_review_due_at && new Date(r.next_review_due_at) < now);
  const active = (enrolments ?? []).filter(e => e.status === "in_progress" || e.status === "active");
  const completed = (enrolments ?? []).filter(e => e.status === "completed" || e.status === "certified");
  const notStarted = (enrolments ?? []).filter(e => !e.progress_percent || e.progress_percent === 0);

  return NextResponse.json({
    profile: profile ?? { rtms_status: "not_applicable", annual_review_enabled: false },
    summary: {
      totalDrivers: (drivers ?? []).length,
      enrolments: (enrolments ?? []).length,
      active: active.length,
      completed: completed.length,
      notStarted: notStarted.length,
      certifications: (certs ?? []).filter(c => c.status === "active").length,
      annualReviewDueSoon: dueSoon.length,
      annualReviewOverdue: overdue.length,
    },
    exceptions: {
      notStarted: notStarted.slice(0, 20),
      annualReviewDueSoon: dueSoon.slice(0, 20),
      annualReviewOverdue: overdue.slice(0, 20),
    },
  });
}
