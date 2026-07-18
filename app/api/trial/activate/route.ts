import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

async function sendWelcomeEmail(to: string, contactName: string, companyName: string, trialSeats: number, trialExpiresAt: string) {
  if (!process.env.BREVO_SMTP_PASSWORD) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
  const dashboardUrl = `${siteUrl}/dashboard`;
  const expiryDate = new Date(trialExpiresAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
      </div>
      <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: white; margin: 0 0 16px;">Welcome, ${contactName}!</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Your trial account for <strong style="color: white;">${companyName}</strong> has been activated successfully.
          You have <strong style="color: #2ecc71;">${trialSeats} driver seat${trialSeats === 1 ? "" : "s"}</strong> available until <strong style="color: white;">${expiryDate}</strong>.
        </p>
        <h3 style="color: white; margin: 24px 0 12px; font-size: 18px;">Getting Started</h3>
        <ol style="color: #94a3b8; line-height: 1.8; padding-left: 20px;">
          <li>Go to your dashboard using the button below.</li>
          <li>Add your drivers to the platform (up to ${trialSeats} driver${trialSeats === 1 ? "" : "s"}).</li>
          <li>Browse the training catalogue and enrol drivers in courses.</li>
          <li>Track driver progress and completion from your dashboard.</li>
        </ol>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}"
             style="background: #2ecc71; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            Go to Your Dashboard →
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          If you did not create this account, please ignore this email.
        </p>
      </div>
    </div>
  `;
  const text = `Welcome to GreenFreightAcademy!\n\nYour trial account for ${companyName} has been activated.\nYou have ${trialSeats} driver seat(s) available until ${expiryDate}.\n\nGetting started:\n1. Go to your dashboard at ${dashboardUrl}\n2. Add your drivers (up to ${trialSeats})\n3. Browse the training catalogue and enrol drivers\n4. Track progress from your dashboard\n\nIf you did not create this account, please ignore this email.`;
  try {
    await sendEmail({
      from: "abdool@transportactiongroup.co.za",
      fromName: "GreenFreightAcademy",
      to,
      subject: `Welcome to GreenFreightAcademy — your ${companyName} trial is active`,
      html,
      text,
    });
  } catch (err) {
    console.error("Welcome email error:", err);
  }
}

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

  // Send welcome email (non-blocking — don't fail activation if email fails)
  await sendWelcomeEmail(email, contactName, companyName, voucher.seats, voucher.expires_at);

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
