import { NextRequest, NextResponse } from "next/server";
import {
  certificateDocumentsEnabled,
  redeemBetterDriverDocumentGrant,
} from "@/lib/certificateRegistry";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!certificateDocumentsEnabled()) {
    return new NextResponse("Certificate document delivery is disabled.", { status: 503 });
  }

  const { code } = await params;
  const signedUrl = await redeemBetterDriverDocumentGrant(code);
  if (!signedUrl) {
    return new NextResponse("This certificate document link is unavailable or has expired.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, private",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  return NextResponse.redirect(signedUrl, {
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
