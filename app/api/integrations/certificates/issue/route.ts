import { NextRequest, NextResponse } from "next/server";
import {
  certificateFeatureEnabled,
  issueCanonicalCertificate,
  signBetterDriverCertificateResponse,
  verifyBetterDriverCertificateEvent,
} from "@/lib/certificateRegistry";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!certificateFeatureEnabled()) {
    return NextResponse.json({ error: "GFA certificate issuance is disabled for this release." }, { status: 503 });
  }

  try {
    const event = await verifyBetterDriverCertificateEvent(request);
    if (event.action !== "issue_certificate") {
      return NextResponse.json({ error: "The signed action is not permitted at this endpoint." }, { status: 409 });
    }
    const { certificate, created } = await issueCanonicalCertificate(event);
    const acknowledgement = await signBetterDriverCertificateResponse({
      action: "certificate_issued",
      request_id: event.eventId,
      created,
      certificate_status: certificate.status,
      issued_at: certificate.issued_at,
    });
    return NextResponse.json({ ok: true, acknowledgement }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate issue failed.";
    const unauthorized = /signed|signing key|expiry|claims/i.test(message);
    const status = unauthorized ? 401 : 409;
    return NextResponse.json({ error: unauthorized ? "Invalid certificate event signature." : "Certificate issue could not be completed." }, { status });
  }
}
