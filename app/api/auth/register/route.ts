import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signSession, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { companyName, contactName, email, phone, password, fleetSize } = await req.json();

  if (!companyName || !contactName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if email already exists
  const { data: existing } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("contact_email", email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: companyName,
      contact_name: contactName,
      contact_email: email.toLowerCase(),
      contact_phone: phone ?? "",
      fleet_size: fleetSize ? parseInt(fleetSize) : null,
      password_hash: passwordHash,
      subscription_status: "trial",
    })
    .select()
    .single();

  if (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }

  const session = { companyId: company.id, companyName: company.name, email: company.contact_email, role: "client" as const };
  const token = await signSession(session);
  const res = NextResponse.json({ ok: true, company: { name: company.name, email: company.contact_email } });
  res.headers.set("Set-Cookie", setSessionCookie(token));
  return res;
}
