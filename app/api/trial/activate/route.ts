import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// POST /api/trial/activate — register company and activate trial
export async function POST(req: NextRequest) {
  const { code, companyName, contactName, email, phone, password } = await req.json();

  if (!code || !companyName || !contactName || !email || !password) {
    return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Validate voucher
  const { data: voucher } = await supabaseAdmin
    .from("trial_vouchers")
    .select("id, code, seats, expires_at, status")
    .eq("code", code.toUpperCase())
    .single();

  if (!voucher) {
    return NextResponse.json({ error: "Invalid voucher code" }, { status: 404 });
  }

  if (voucher.status !== "pending" && voucher.status !== "sent") {
    return NextResponse.json({ error: "This voucher has already been used" }, { status: 409 });
  }

  if (new Date(voucher.expires_at) < new Date()) {
    return NextResponse.json({ error: "This voucher has expired" }, { status: 410 });
  }

  // Check if email already registered
  const { data: existingCompany } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  if (existingCompany) {
    return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create trial company
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({
      name: companyName.trim(),
      contact_name: contactName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() ?? null,
      password_hash: passwordHash,
      account_type: "trial",
      trial_seats: voucher.seats,
      trial_expires_at: voucher.expires_at,
      status: "active",
      created_at: new Date().toISOString(),
    })
    .select("id, name, email, account_type, trial_seats, trial_expires_at")
    .single();

  if (companyError || !company) {
    console.error("Company create error:", companyError);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }

  // Mark voucher as activated
  await supabaseAdmin
    .from("trial_vouchers")
    .update({
      status: "activated",
      activated_at: new Date().toISOString(),
      company_id: company.id,
    })
    .eq("id", voucher.id);

  // Also update prospect_leads stage if a matching lead exists
  await supabaseAdmin
    .from("prospect_leads")
    .update({ stage: "activated", company_id: company.id })
    .eq("voucher_id", voucher.id);

  // Create session cookie
  const token = await signSession({
    companyId: company.id,
    companyName: companyName.trim(),
    email: email.toLowerCase().trim(),
    role: "client",
    accountType: "trial",
  });

  const cookieStore = await cookies();
  cookieStore.set("gfa_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ ok: true, companyId: company.id });
}
