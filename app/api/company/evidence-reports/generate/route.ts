import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.ENABLE_EVIDENCE_REPORTS !== "true") return NextResponse.json({ error: "Evidence reports are disabled for this release." }, { status: 503 });
  const actorId = session.supabase_user_id ?? session.id ?? session.companyId;
  const body = await req.json().catch(() => ({}));
  const reportType = String(body.reportType || "training_cohort");
  const periodStart = body.periodStart || null, periodEnd = body.periodEnd || null;
  const [{ data: company }, { data: drivers }, { data: enrolments }, { data: certifications }] = await Promise.all([
    supabaseAdmin.from("companies").select("name").eq("id", session.companyId).single(),
    supabaseAdmin.from("drivers").select("id,first_name,last_name,mobile").eq("company_id", session.companyId),
    supabaseAdmin.from("enrolments").select("driver_id,status,progress_percent,enrolled_at,completed_at,certified_at,courses(name,slug)").eq("company_id", session.companyId),
    supabaseAdmin.from("certifications").select("driver_id,certificate_number,issued_at,status,courses(name)").eq("company_id", session.companyId),
  ]);
  const snapshot = { schemaVersion: 1, company: company?.name || session.companyName, reportType, periodStart, periodEnd, generatedAt: new Date().toISOString(), drivers: drivers || [], enrolments: enrolments || [], certifications: certifications || [] };
  const canonical = JSON.stringify(snapshot);
  const sha256 = createHash("sha256").update(canonical).digest("hex");
  const controlNumber = `GFA-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const { data: report, error } = await supabaseAdmin.from("evidence_reports").insert({ company_id: session.companyId, control_number: controlNumber, report_type: reportType, reporting_period_start: periodStart, reporting_period_end: periodEnd, filters_json: body.filters || {}, snapshot_json: snapshot, sha256_checksum: sha256, generated_by: actorId }).select("id,control_number,sha256_checksum,generated_at").single();
  if (error) return NextResponse.json({ error: "Could not create controlled evidence snapshot" }, { status: 500 });
  await supabaseAdmin.from("evidence_report_events").insert({ report_id: report.id, event_type: "generated", actor_id: actorId });
  return NextResponse.json({ report, validationPath: `/verify/report/${report.control_number}` }, { status: 201 });
}
