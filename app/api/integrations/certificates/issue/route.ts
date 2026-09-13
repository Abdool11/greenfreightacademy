import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Release 11 accepted a direct BetterDriver certificate-issue request. The
// authoritative GFA contract requires a signed completion-evidence intake and
// an explicit GFA PENDING_REVIEW decision before canonical issuance.
export async function POST() {
  return NextResponse.json({
    error: "Direct certificate issuance is retired. Submit bd.learning_completion_evidence.v1 to the GFA Version 2 completion-evidence endpoint.",
  }, {
    status: 410,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
