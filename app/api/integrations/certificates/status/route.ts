import { NextRequest, NextResponse } from "next/server";
import {
  certificateContractV2Enabled,
  lookupCertificateStatus,
  signCertificateStatusAssertion,
  verifyCertificateStatusLookup,
} from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }

  try {
    const lookup = await verifyCertificateStatusLookup(request);
    const certificate = await lookupCertificateStatus(lookup.driverRef, lookup.certificateRef);
    const statusAssertion = await signCertificateStatusAssertion(certificate);
    return NextResponse.json({ ok: true, statusAssertion }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate status is unavailable.";
    const unauthorized = /signed|signing key|expiry|claims|assertion/i.test(message);
    const unavailable = /not configured/i.test(message);
    return NextResponse.json(
      { error: unauthorized ? "Invalid certificate status lookup signature." : unavailable ? "Certificate contract is not configured." : "Certificate status is unavailable." },
      { status: unauthorized ? 401 : unavailable ? 503 : 409, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
    );
  }
}
