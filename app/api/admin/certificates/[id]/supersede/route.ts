import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import {
  certificateContractV2Enabled,
  isGfaUuid,
  supersedeIssuedCertificate,
} from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }
  const admin = await requireAdminSession();
  const { id } = await params;
  if (!isGfaUuid(id)) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  let replacementCertificateId = "";
  try {
    const body = await request.json();
    replacementCertificateId = typeof body?.replacementCertificateId === "string" ? body.replacementCertificateId : "";
  } catch {
    return NextResponse.json({ error: "A replacement certificate is required." }, { status: 400 });
  }
  if (!isGfaUuid(replacementCertificateId)) return NextResponse.json({ error: "A valid replacement certificate is required." }, { status: 400 });

  try {
    const decision = await supersedeIssuedCertificate(id, admin, replacementCertificateId);
    return NextResponse.json({
      ok: true,
      certificate: {
        id: decision.certificate_id,
        certificateRef: decision.certificate_ref,
        lifecycleStatus: decision.lifecycle_status,
        correlationId: decision.correlation_id,
      },
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate supersession could not be completed.";
    const conflict = /lifecycle|replacement|completed/i.test(message);
    return NextResponse.json(
      { error: conflict ? "Certificate cannot be superseded from its current lifecycle state." : "Certificate supersession could not be completed." },
      { status: conflict ? 409 : 500 }
    );
  }
}
