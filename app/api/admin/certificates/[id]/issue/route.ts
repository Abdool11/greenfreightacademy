import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import {
  certificateContractV2Enabled,
  isGfaUuid,
  issuePendingCertificate,
  signCertificateStatusAssertion,
} from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }
  const admin = await requireAdminSession();
  const { id } = await params;
  if (!isGfaUuid(id)) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  try {
    const issued = await issuePendingCertificate(id, admin);
    const { certificate, correlationId } = issued;
    const statusAssertion = await signCertificateStatusAssertion(certificate);
    return NextResponse.json({
      ok: true,
      certificate: {
        id: certificate.id,
        certificateRef: certificate.certificate_ref,
        lifecycleStatus: certificate.lifecycle_status,
        issuedAt: certificate.issued_at,
        correlationId,
      },
      statusAssertion,
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate issuance could not be completed.";
    const conflict = /eligible|completed|lifecycle|document/i.test(message);
    return NextResponse.json(
      { error: conflict ? "Certificate cannot be issued from its current lifecycle state." : "Certificate issuance could not be completed." },
      { status: conflict ? 409 : 500 }
    );
  }
}
