import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function sendWelcomeEmail(to: string, contactName: string, companyName: string, tempPassword?: string) {
  if (!process.env.BREVO_SMTP_PASSWORD) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
  const loginUrl = `${siteUrl}/login`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
      </div>
      <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: white; margin: 0 0 16px;">Welcome, ${contactName}!</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Your company account for <strong style="color: white;">${companyName}</strong> has been created by the GreenFreightAcademy team.
          You can now manage driver training, track progress, and deploy learning at scale.
        </p>
        ${tempPassword ? `
        <div style="background: #0a1628; border: 1px solid rgba(46,204,113,0.3); border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0;">
          <p style="color: #94a3b8; margin: 0 0 0.5rem; font-size: 0.875rem;">A temporary password has been set for your account:</p>
          <p style="color: #2ecc71; margin: 0; font-family: monospace; font-size: 1rem; font-weight: 700;">${tempPassword}</p>
          <p style="color: #64748b; margin: 0.5rem 0 0; font-size: 0.75rem;">Please log in and change it as soon as possible.</p>
        </div>
        ` : ""}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}"
             style="background: #2ecc71; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            Log in to Your Dashboard →
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          If you have any questions, please contact the GreenFreightAcademy team.
        </p>
      </div>
    </div>
  `;
  const text = `Welcome to GreenFreightAcademy!\n\nYour company account for ${companyName} has been created.\n${tempPassword ? `\nYour temporary password is: ${tempPassword}\nPlease log in and change it as soon as possible.\n` : ""}\nLog in at: ${loginUrl}\n\nIf you have any questions, please contact the GreenFreightAcademy team.`;
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
    console.error("Admin create company welcome email error:", err);
  }
}

// POST /api/admin/companies — admin creates a new company/client
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const {
    companyName,
    contactName,
    email,
    phone,
    password,
    accountType,
    fleetSize,
    sendWelcome,
  } = await req.json();

  if (!companyName || !contactName || !email) {
    return NextResponse.json({ error: "Company name, contact name, and email are required" }, { status: 400 });
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

  // Generate a temporary password if none provided
  const useTempPassword = !password;
  const finalPassword = password || crypto.randomBytes(6).toString("base64url").slice(0, 12);
  const passwordHash = await bcrypt.hash(finalPassword, 12);

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: companyName.trim(),
      contact_name: contactName.trim(),
      contact_email: email.toLowerCase().trim(),
      contact_phone: phone?.trim() ?? "",
      fleet_size: fleetSize ?? null,
      password_hash: passwordHash,
      account_type: accountType === "trial" ? "trial" : "full",
      subscription_status: accountType === "trial" ? "trial" : "active",
    })
    .select("id, name, contact_email, account_type, created_at")
    .single();

  if (error || !company) {
    console.error("Admin create company error:", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "create_company",
    target_type: "companies",
    target_id: company.id,
    details: JSON.stringify({ name: companyName, email, account_type: accountType }),
    created_at: new Date().toISOString(),
  });

  // Send welcome email with temp password if requested
  if (sendWelcome !== false) {
    await sendWelcomeEmail(email, contactName, companyName, useTempPassword ? finalPassword : undefined);
  }

  return NextResponse.json({
    ok: true,
    company,
    tempPassword: useTempPassword ? finalPassword : undefined,
  });
}
