import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signSession, setSessionCookie } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

async function sendWelcomeEmail(to: string, contactName: string, companyName: string) {
  if (!process.env.BREVO_SMTP_PASSWORD) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
  const dashboardUrl = `${siteUrl}/dashboard`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
      </div>
      <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: white; margin: 0 0 16px;">Welcome, ${contactName}!</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Your company account for <strong style="color: white;">${companyName}</strong> has been created successfully.
          You can now manage driver training, track progress, and deploy learning at scale.
        </p>
        <h3 style="color: white; margin: 24px 0 12px; font-size: 18px;">Getting Started</h3>
        <ol style="color: #94a3b8; line-height: 1.8; padding-left: 20px;">
          <li>Go to your dashboard using the button below.</li>
          <li>Add your drivers to the platform.</li>
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
  const text = `Welcome to GreenFreightAcademy!\n\nYour company account for ${companyName} has been created.\n\nGetting started:\n1. Go to your dashboard at ${dashboardUrl}\n2. Add your drivers\n3. Browse the training catalogue and enrol drivers\n4. Track progress from your dashboard\n\nIf you did not create this account, please ignore this email.`;
  try {
    await sendEmail({
      from: "noreply@greenfreightacademy.co.za",
      fromName: "GreenFreightAcademy",
      to,
      subject: `Welcome to GreenFreightAcademy — your ${companyName} account is ready`,
      html,
      text,
    });
  } catch (err) {
    console.error("Welcome email error:", err);
  }
}

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

  // Send welcome email (non-blocking — don't fail registration if email fails)
  await sendWelcomeEmail(email, contactName, companyName);

  const session = { companyId: company.id, companyName: company.name, email: company.contact_email, role: "client" as const };
  const token = await signSession(session);
  const res = NextResponse.json({ ok: true, company: { name: company.name, email: company.contact_email } });
  res.headers.set("Set-Cookie", setSessionCookie(token));
  return res;
}
