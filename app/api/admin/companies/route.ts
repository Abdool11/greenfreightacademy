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
      from: "abdool@transportactiongroup.co.za",
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

async function sendTrialWelcomeEmail(to: string, contactName: string, companyName: string, trialCredits: number, setupToken: string) {
  if (!process.env.BREVO_SMTP_PASSWORD) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
  const setupUrl = `${siteUrl}/setup?token=${setupToken}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
      </div>
      <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: white; margin: 0 0 16px;">Welcome, ${contactName}!</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Your trial account for <strong style="color: white;">${companyName}</strong> has been created.
          You have been granted <strong style="color: #2ecc71;">${trialCredits} training credits</strong> to get started.
        </p>
        <p style="color: #94a3b8; line-height: 1.6;">
          Click the button below to set up your password and access your dashboard:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${setupUrl}"
             style="background: #2ecc71; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            Set Up Your Account →
          </a>
        </div>
        <div style="background: #0a1628; border: 1px solid rgba(46,204,113,0.3); border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0;">
          <p style="color: #94a3b8; margin: 0 0 0.5rem; font-size: 0.875rem;">Your trial includes:</p>
          <ul style="color: #94a3b8; margin: 0; padding-left: 1.25rem; font-size: 0.875rem; line-height: 1.6;">
            <li><strong style="color: #2ecc71;">${trialCredits} credits</strong> for driver training enrolments</li>
            <li>Access to the driver training dashboard</li>
            <li>WhatsApp-based training delivery to your drivers</li>
          </ul>
        </div>
        <div style="background: #0a1628; border: 1px solid rgba(46,204,113,0.3); border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0;">
          <p style="color: #2ecc71; margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 700;">Getting Started</p>
          <ol style="color: #94a3b8; margin: 0; padding-left: 1.25rem; font-size: 0.875rem; line-height: 1.8;">
            <li><strong style="color: white;">Add drivers</strong> — Go to the Drivers section and add your drivers' names and WhatsApp numbers.</li>
            <li><strong style="color: white;">Select courses</strong> — Browse the training library and choose the courses you want to deploy.</li>
            <li><strong style="color: white;">Deploy training</strong> — Use your credits to enrol drivers and deploy training via WhatsApp.</li>
          </ol>
        </div>
        <p style="color: #94a3b8; line-height: 1.6; font-size: 0.875rem; margin: 1.5rem 0 0;">
          Already set up your password? You can log in anytime at
          <a href="${siteUrl}/login" style="color: #2ecc71; text-decoration: none;">${siteUrl}/login</a>
        </p>
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          This setup link expires in 7 days. If you have any questions, please contact the GreenFreightAcademy team.
        </p>
      </div>
    </div>
  `;
  const text = `Welcome to GreenFreightAcademy!\n\nYour trial account for ${companyName} has been created with ${trialCredits} training credits.\n\nSet up your password at: ${setupUrl}\n\nGetting Started:\n  1. Add drivers — Go to the Drivers section and add your drivers' names and WhatsApp numbers.\n  2. Select courses — Browse the training library and choose the courses you want to deploy.\n  3. Deploy training — Use your credits to enrol drivers and deploy training via WhatsApp.\n\nAlready set up your password? Log in anytime at: ${siteUrl}/login\n\nThis setup link expires in 7 days.`;
  try {
    await sendEmail({
      from: "abdool@transportactiongroup.co.za",
      fromName: "GreenFreightAcademy",
      to,
      subject: `Welcome to GreenFreightAcademy — Set up your ${companyName} trial account`,
      html,
      text,
    });
  } catch (err) {
    console.error("Trial welcome email error:", err);
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
    trialCredits,
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

  // For trial accounts: use setup token, no password needed
  // For full accounts: generate temp password if none provided
  const isTrial = accountType === "trial";
  const useTempPassword = !isTrial && !password;
  const finalPassword = isTrial ? "" : (password || crypto.randomBytes(6).toString("base64url").slice(0, 12));
  const passwordHash = isTrial ? "" : await bcrypt.hash(finalPassword, 12);
  const setupToken = isTrial ? crypto.randomUUID() : null;

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: companyName.trim(),
      contact_name: contactName.trim(),
      contact_email: email.toLowerCase().trim(),
      contact_phone: phone?.trim() ?? "",
      fleet_size: fleetSize ?? null,
      password_hash: passwordHash || null,
      account_type: isTrial ? "trial" : "full",
      subscription_status: isTrial ? "trial" : "active",
      credit_balance: isTrial ? (trialCredits || 0) : 0,
      setup_token: setupToken,
      setup_expires_at: isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      setup_token_used: false,
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

  // Send welcome email
  if (sendWelcome !== false) {
    if (isTrial && setupToken) {
      await sendTrialWelcomeEmail(email, contactName, companyName, trialCredits || 0, setupToken);
    } else {
      await sendWelcomeEmail(email, contactName, companyName, useTempPassword ? finalPassword : undefined);
    }
  }

  return NextResponse.json({
    ok: true,
    company,
    tempPassword: useTempPassword ? finalPassword : undefined,
    setupLink: isTrial && setupToken ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za"}/setup?token=${setupToken}` : undefined,
  });
}
