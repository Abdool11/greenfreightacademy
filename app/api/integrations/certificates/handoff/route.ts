import { NextRequest, NextResponse } from "next/server";
import {
  certificateContractV2Enabled,
  createOpaqueBrowserHandoff,
  verifyDriverHandoffAssertion,
} from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

function handoffUrl(code: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${base}/api/certificates/handoff/${encodeURIComponent(code)}`;
}

export async function POST(request: NextRequest) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }

  try {
    const assertion = await verifyDriverHandoffAssertion(request);
    const handoff = await createOpaqueBrowserHandoff(assertion);
    return NextResponse.json({
      ok: true,
      handoffUrl: handoffUrl(handoff.handoffCode),
      expiresAt: handoff.expiresAt,
    }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Certificate handoff is unavailable.";
    const unauthorized = /signed|signing key|expiry|claims|assertion/i.test(message);
    const unavailable = /not configured/i.test(message);
    return NextResponse.json(
      { error: unauthorized ? "Invalid certificate handoff signature." : unavailable ? "Certificate contract is not configured." : "Certificate handoff is unavailable." },
      { status: unauthorized ? 401 : unavailable ? 503 : 409, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
    );
  }
}
