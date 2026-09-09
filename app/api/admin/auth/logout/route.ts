import { NextResponse } from "next/server";
import { clearAdminSessionCookies } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookiesToClear = await clearAdminSessionCookies();

  for (const cookie of cookiesToClear) {
    res.headers.append("Set-Cookie", cookie);
  }

  return res;
}
