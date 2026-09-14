import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import {
  certificateContractV2Enabled,
  isGfaUuid,
  markCertificateNotEligible,
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

  try {
    const decision = await markCertificateNotEligible(id, admin, reason);
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
    const message = error instanceof Error ? error.message : "Certificate decision could not be completed.";
    const conflict = /lifecycle|completed|reason/i.test(message);
    return NextResponse.json(
      { error: conflict ? "Certificate cannot be marked not eligible from its current lifecycle state." : "Certificate decision could not be completed." },
      { status: conflict ? 409 : 500 }
    );
  }
}
