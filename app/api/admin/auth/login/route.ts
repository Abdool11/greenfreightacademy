import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const session = await verifyAdminCredentials(email, password);
    if (!session) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signSession(session);
    const cookie = setSessionCookie(token);

    const res = NextResponse.json({
      ok: true,
      admin: { name: session.name, email: session.email, role: session.role },
    });
    res.headers.set("Set-Cookie", cookie);
    return res;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
