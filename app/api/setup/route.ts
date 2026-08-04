import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signSession, setSessionCookie, type CompanySession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/setup — validate setup token and set password
export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Find company by setup token
  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_email, account_type, setup_token_used, setup_expires_at")
    .eq("setup_token", token)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Invalid setup link" }, { status: 404 });
  }

  if (company.setup_token_used) {
    return NextResponse.json({ error: "This setup link has already been used" }, { status: 410 });
  }

  const expiresAt = new Date(company.setup_expires_at);
  if (expiresAt < new Date()) {
    return NextResponse.json({ error: "This setup link has expired" }, { status: 410 });
  }

  // Hash the new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Update company with password and mark token as used
  const { error: updateError } = await supabaseAdmin
    .from("companies")
    .update({
      password_hash: passwordHash,
      setup_token_used: true,
      subscription_status: "active",
    })
    .eq("id", company.id);

  if (updateError) {
    console.error("Setup password update error:", updateError);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }

  // Create session
  const session: CompanySession = {
    companyId: company.id,
    companyName: company.name,
    email: company.contact_email,
    role: "client",
    accountType: company.account_type === "trial" ? "trial" : "full",
  };

  const jwt = await signSession(session);
  const headers = new Headers();
  headers.append("Set-Cookie", setSessionCookie(jwt));

  return NextResponse.json({ ok: true, companyName: company.name }, { headers });
}
