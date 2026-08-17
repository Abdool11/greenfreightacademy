import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ control: string }> }) {
  const { control } = await params;
  const { data: report } = await supabaseAdmin.from("evidence_reports")
    .select("id,control_number,report_type,reporting_period_start,reporting_period_end,sha256_checksum,status,generated_at,revoked_at")
    .eq("control_number", control).maybeSingle();
  if (!report) return NextResponse.json({ valid: false, message: "No controlled GFA evidence report matches this control number." }, { status: 404 });
  await supabaseAdmin.from("evidence_report_events").insert({ report_id: report.id, event_type: "validated", metadata: { public: true } });
  return NextResponse.json({ valid: report.status === "active", controlNumber: report.control_number, reportType: report.report_type, periodStart: report.reporting_period_start, periodEnd: report.reporting_period_end, generatedAt: report.generated_at, checksum: report.sha256_checksum, status: report.status, revokedAt: report.revoked_at });
}
