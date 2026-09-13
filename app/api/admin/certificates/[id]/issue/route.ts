import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { certificateContractV2Enabled, issuePendingCertificate, signCertificateStatusAssertion } from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }
  await requireAdminSession();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  try {
    const certificate = await issuePendingCertificate(id);
    const statusAssertion = await signCertificateStatusAssertion(certificate);
    return NextResponse.json({
      ok: true,
      certificate: {
        id: certificate.id,
        certificateRef: certificate.certificate_ref,
        lifecycleStatus: certificate.lifecycle_status,
        issuedAt: certificate.issued_at,
      },
      statusAssertion,
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate issuance could not be completed.";
    return NextResponse.json({ error: message.includes("eligible") ? "Certificate cannot be issued from its current lifecycle state." : "Certificate issuance could not be completed." }, { status: 409 });
  }
}
