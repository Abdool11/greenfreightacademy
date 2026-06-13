import { NextRequest, NextResponse } from "next/server";
import { verifyCompanyCredentials, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const session = await verifyCompanyCredentials(email, password);
  if (!session) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSession(session);
  const res = NextResponse.json({ ok: true, company: { name: session.companyName, email: session.email } });
  res.headers.set("Set-Cookie", setSessionCookie(token));
  return res;
}
