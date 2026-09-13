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

  let replacementCertificateId = "";
  try {
    const body = await request.json();
    replacementCertificateId = typeof body?.replacementCertificateId === "string" ? body.replacementCertificateId : "";
  } catch {
    return NextResponse.json({ error: "A replacement certificate is required." }, { status: 400 });
  }
  if (!isUuid(replacementCertificateId)) return NextResponse.json({ error: "A valid replacement certificate is required." }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc("gfa_mark_certificate_superseded", {
    p_certificate_id: id,
    p_replacement_certificate_id: replacementCertificateId,
  });
  if (error) return NextResponse.json({ error: "Certificate supersession could not be completed." }, { status: 409 });
  if (data !== true) return NextResponse.json({ error: "Certificate cannot be superseded from its current lifecycle state." }, { status: 409 });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
