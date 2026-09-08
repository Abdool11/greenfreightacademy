import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { certificateFeatureEnabled } from "@/lib/certificateRegistry";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!certificateFeatureEnabled()) return NextResponse.json({ error: "Certificate registry is disabled for this release." }, { status: 503 });
  const admin = await requireAdminSession();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  let reason = "";
  try {
    const body = await request.json();
    reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  } catch {
    return NextResponse.json({ error: "A revocation reason is required." }, { status: 400 });
  }
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ error: "Provide a revocation reason between 10 and 500 characters." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("certifications")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: admin.adminId, revoked_reason: reason })
    .eq("id", id)
    .in("status", ["active", "issued", "pending_document"])
    .select("id, certificate_number, status, revoked_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Certificate revocation could not be completed." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Certificate cannot be revoked from its current status." }, { status: 409 });

  return NextResponse.json({ ok: true, certificate: data }, { headers: { "Cache-Control": "no-store" } });
}
