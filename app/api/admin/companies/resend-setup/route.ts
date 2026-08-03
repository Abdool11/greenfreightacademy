import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { companyId } = await req.json();

  if (!companyId) {
    return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
  }

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_name, contact_email, account_type, credit_balance, setup_token, setup_token_used, setup_expires_at")
    .eq("id", companyId)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (company.account_type !== "trial") {
    return NextResponse.json({ error: "Only trial accounts can resend setup emails" }, { status: 400 });
  }

  if (company.setup_token_used) {
    return NextResponse.json({ error: "This account has already been set up. The user can log in directly." }, { status: 400 });
  }

  // Check if the setup link is still valid
  const isExpired = company.setup_expires_at && new Date(company.setup_expires_at) < new Date();
  let setupToken = company.setup_token;

  if (isExpired || !setupToken) {
    // Generate a new token and extend expiry
    setupToken = crypto.randomUUID();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        setup_token: setupToken,
        setup_expires_at: newExpiry,
        setup_token_used: false,
      })
      .eq("id", company.id);

    if (updateError) {
      console.error("Resend setup token refresh error:", updateError);
      return NextResponse.json({ error: "Failed to refresh setup link" }, { status: 500 });
    }
  }

  // Build and send the email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
  const setupUrl = `${siteUrl}/setup?token=${setupToken}`;
  const trialCredits = Number(company.credit_balance) || 0;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
      </div>
      <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: white; margin: 0 0 16px;">Welcome, ${company.contact_name}!</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Your trial account for <strong style="color: white;">${company.name}</strong> has been created.
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

  const text = `Welcome to GreenFreightAcademy!\n\nYour trial account for ${company.name} has been created with ${trialCredits} training credits.\n\nSet up your password at: ${setupUrl}\n\nGetting Started:\n  1. Add drivers — Go to the Drivers section and add your drivers' names and WhatsApp numbers.\n  2. Select courses — Browse the training library and choose the courses you want to deploy.\n  3. Deploy training — Use your credits to enrol drivers and deploy training via WhatsApp.\n\nAlready set up your password? Log in anytime at: ${siteUrl}/login\n\nThis setup link expires in 7 days.`;

  try {
    await sendEmail({
      from: "abdool@transportactiongroup.co.za",
      fromName: "GreenFreightAcademy",
      to: company.contact_email,
      subject: `Welcome to GreenFreightAcademy — Set up your ${company.name} trial account`,
      html,
      text,
    });
  } catch (err) {
    console.error("Resend setup email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "resend_setup_email",
    target_type: "companies",
    target_id: company.id,
    details: JSON.stringify({ name: company.name, email: company.contact_email, refreshed: isExpired }),
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    setupLink: setupUrl,
    refreshed: !!isExpired,
    message: isExpired ? "Setup link refreshed and email sent" : "Setup email resent",
  });
}
