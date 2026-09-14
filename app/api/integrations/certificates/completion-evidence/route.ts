import { NextRequest, NextResponse } from "next/server";
import {
  CertificateContractAuthenticationError,
  certificateContractV2Enabled,
  receiveCompletionEvidence,
  signCertificateStatusAssertion,
  signPendingCertificateStatus,
  lookupCertificateStatus,
  verifyCompletionEvidence,
} from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

function safeFailure(error: unknown) {
  const unauthorized = error instanceof CertificateContractAuthenticationError;
  const message = error instanceof Error ? error.message : "Certificate completion evidence could not be processed.";
  const unavailable = /not configured/i.test(message);
  return {
    status: unauthorized ? 401 : unavailable ? 503 : 409,
    error: unauthorized
      ? "Invalid certificate completion evidence signature."
      : unavailable
        ? "Certificate contract is not configured."
        : "Certificate completion evidence could not be accepted.",
  };
}

export async function POST(request: NextRequest) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }

  try {
    const evidence = await verifyCompletionEvidence(request);
    const outcome = await receiveCompletionEvidence(evidence);
    const statusAssertion = outcome.lifecycleStatus === "PENDING_REVIEW"
      ? await signPendingCertificateStatus(outcome.certificateRef ?? "", evidence.programmeCode, evidence.programmeVersion)
      : await signCertificateStatusAssertion(await lookupCertificateStatus(evidence.driverRef, outcome.certificateRef ?? undefined));

    return NextResponse.json({ ok: true, statusAssertion }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const failure = safeFailure(error);
    return NextResponse.json({ error: failure.error }, {
      status: failure.status,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
