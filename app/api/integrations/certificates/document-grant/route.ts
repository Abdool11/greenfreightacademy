import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The authoritative contract replaces the generic Release 11 document grant
// with a five-minute, one-certificate, one-action BetterDriver browser handoff.
export async function POST() {
  return NextResponse.json({
    error: "Direct certificate document grants are retired. Use the GFA Version 2 scoped handoff endpoint.",
  }, {
    status: 410,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
