import { NextRequest, NextResponse } from "next/server";
import {
  certificateDocumentsEnabled,
  createBetterDriverDocumentGrant,
  signBetterDriverCertificateResponse,
  verifyBetterDriverCertificateEvent,
} from "@/lib/certificateRegistry";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!certificateDocumentsEnabled()) {
    return NextResponse.json({ error: "GFA certificate document delivery is disabled for this release." }, { status: 503 });
  }

  try {
    const event = await verifyBetterDriverCertificateEvent(request);
    if (event.action !== "request_document_grant") {
      return NextResponse.json({ error: "The signed action is not permitted at this endpoint." }, { status: 409 });
    }
    const grant = await createBetterDriverDocumentGrant(event);
    const deliveryAssertion = await signBetterDriverCertificateResponse({
      action: "document_grant",
      request_id: event.eventId,
      authorization_code: grant.authorizationCode,
      expires_at: grant.expiresAt,
    });
    return NextResponse.json({ ok: true, deliveryAssertion }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate document grant failed.";
    const unauthorized = /signed|signing key|expiry|claims/i.test(message);
    const unavailable = /not configured/i.test(message);
    return NextResponse.json(
      { error: unauthorized ? "Invalid certificate event signature." : unavailable ? "Certificate delivery is not configured." : "Certificate document grant could not be completed." },
      { status: unauthorized ? 401 : unavailable ? 503 : 409, headers: { "Cache-Control": "no-store" } }
    );
  }
}
