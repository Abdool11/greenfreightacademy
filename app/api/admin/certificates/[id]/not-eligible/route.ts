import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { certificateContractV2Enabled } from "@/lib/certificateContractV2";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }
  await requireAdminSession();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  let reason = "";
  try {
    const body = await request.json();
    reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  } catch {
    return NextResponse.json({ error: "A GFA decision reason is required." }, { status: 400 });
  }
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ error: "Provide a GFA decision reason between 10 and 500 characters." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("certifications")
    .update({
      status: "not_eligible",
      lifecycle_status: "NOT_ELIGIBLE",
      decision_reason: reason,
      lifecycle_updated_at: now,
    })
    .eq("id", id)
    .eq("lifecycle_status", "PENDING_REVIEW")
    .select("id, certificate_ref, lifecycle_status, decision_event_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Certificate decision could not be completed." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Certificate cannot be marked not eligible from its current lifecycle state." }, { status: 409 });

  if (data.decision_event_id) {
    await supabaseAdmin
      .from("certificate_decision_events")
      .update({ decision_status: "NOT_ELIGIBLE", outcome_detail: reason, processed_at: now })
      .eq("id", data.decision_event_id);
  }

  return NextResponse.json({ ok: true, certificate: data }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
