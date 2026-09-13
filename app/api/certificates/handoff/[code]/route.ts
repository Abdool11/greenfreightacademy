import { NextRequest, NextResponse } from "next/server";
import {
  certificateContractV2Enabled,
  redeemOpaqueBrowserHandoff,
} from "@/lib/certificateContractV2";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!certificateContractV2Enabled()) {
    return new NextResponse("Certificate handoff is disabled for this release.", {
      status: 503,
      headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" },
    });
  }

  const { code } = await params;
  const handoff = await redeemOpaqueBrowserHandoff(code);
  if (!handoff) {
    return new NextResponse("This certificate access link is unavailable, has expired, or has already been used.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, private",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return NextResponse.redirect(handoff.signedUrl, {
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
