import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import crypto from "crypto";

// ─── Generate a secure magic link token ──────────────────────────────────────
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Send WhatsApp message ────────────────────────────────────────────────────
async function sendWhatsApp(
  mobile: string,
  message: string,
  phoneId: string,
  accessToken: string
): Promise<boolean> {
  let number = mobile.replace(/\s+/g, "").replace(/^0/, "27");
  if (!number.startsWith("27")) number = `27${number}`;
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: number,
        type: "text",
        text: { body: message },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Send email via Resend ────────────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GreenFreightAcademy <notifications@greenfreightacademy.com>",
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { deploymentId, action, paymentReference, paymentAmount } = body;

  if (!deploymentId || !action) {
    return NextResponse.json({ error: "deploymentId and action required" }, { status: 400 });
  }

  // ─── Action: confirm_eft ─────────────────────────────────────────────────
  if (action === "confirm_eft") {
    if (!paymentReference || !paymentAmount) {
      return NextResponse.json({ error: "paymentReference and paymentAmount required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("deployments")
      .update({
        approval_status: "payment_received",
        payment_method: "eft",
        payment_reference: paymentReference,
        payment_amount: parseFloat(paymentAmount),
        payment_confirmed_at: new Date().toISOString(),
        payment_confirmed_by: adminSession.adminId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deploymentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log payment record
    const { data: deployment } = await supabaseAdmin
      .from("deployments")
      .select("company_id")
      .eq("id", deploymentId)
      .single();

    if (deployment) {
      await supabaseAdmin.from("payments").insert({
        company_id: deployment.company_id,
        deployment_id: deploymentId,
        payment_method: "eft",
        amount: parseFloat(paymentAmount),
        currency: "ZAR",
        reference: paymentReference,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: adminSession.adminId,
      });
    }

    return NextResponse.json({ ok: true, status: "payment_received" });
  }

  // ─── Action: approve_and_go_live ─────────────────────────────────────────
  if (action === "approve_and_go_live") {
    // Fetch deployment with drivers
    const { data: deployment } = await supabaseAdmin
      .from("deployments")
      .select(`
        id, company_id, approval_status,
        companies(id, name),
        enrolments(
          id, driver_id, course_id,
          drivers(id, first_name, last_name, mobile, email),
          courses(slug, name)
        )
      `)
      .eq("id", deploymentId)
      .single();

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    if (!["payment_received", "pending_payment"].includes(deployment.approval_status)) {
      return NextResponse.json({ error: "Deployment is not in an approvable state" }, { status: 400 });
    }

    // Get messaging config
    const config = await getConfigs([
      "whatsapp_phone_id",
      "whatsapp_access_token",
      "whatsapp_welcome_template",
    ]);

    const bdBaseUrl = process.env.BD_BASE_URL || "https://betterdriver.co.za";
    const enrolments = (deployment.enrolments as Record<string, unknown>[]) ?? [];

    // Group enrolments by driver
    const driverMap = new Map<string, {
      driver: Record<string, string>;
      courses: string[];
      courseNames: string[];
    }>();

    for (const enrolment of enrolments) {
      const driver = enrolment.drivers as Record<string, string>;
      const course = enrolment.courses as Record<string, string>;
      if (!driver) continue;
      const existing = driverMap.get(driver.id);
      if (existing) {
        existing.courses.push(course?.slug ?? "");
        existing.courseNames.push(course?.name ?? "");
      } else {
        driverMap.set(driver.id, {
          driver,
          courses: [course?.slug ?? ""],
          courseNames: [course?.name ?? ""],
        });
      }
    }

    const results: { driverId: string; token: string; whatsapp: boolean; email: boolean }[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    for (const [driverId, { driver, courses, courseNames }] of driverMap) {
      const token = generateToken();
      const activationUrl = `${bdBaseUrl}/activate?token=${token}`;
      const programmeName = courseNames[0] ?? "Training Programme";

      // Create driver_invitation record
      await supabaseAdmin.from("driver_invitations").insert({
        token,
        driver_id: driverId,
        company_id: deployment.company_id,
        deployment_id: deploymentId,
        programme_slug: courses[0] ?? "",
        driver_name: `${driver.first_name} ${driver.last_name}`,
        driver_mobile: driver.mobile,
        driver_email: driver.email,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

      // Update enrolment status to active
      await supabaseAdmin
        .from("enrolments")
        .update({ status: "active", start_date: now.toISOString() })
        .eq("driver_id", driverId)
        .eq("company_id", deployment.company_id);

      // Send WhatsApp
      let whatsappSent = false;
      const phoneId = config.whatsapp_phone_id;
      const accessToken = config.whatsapp_access_token;

      if (phoneId && accessToken && driver.mobile) {
        const template = config.whatsapp_welcome_template ||
          `Hi {{driver_name}}, welcome to BetterDriver! Your {{programme_name}} training has been activated by {{company_name}}. Click here to get started: {{portal_link}}`;

        const message = template
          .replace(/{{driver_name}}/g, driver.first_name)
          .replace(/{{programme_name}}/g, programmeName)
          .replace(/{{company_name}}/g, ((deployment.companies as unknown) as Record<string, string>)?.name ?? "")
          .replace(/{{portal_link}}/g, activationUrl);

        whatsappSent = await sendWhatsApp(driver.mobile, message, phoneId, accessToken);

        if (whatsappSent) {
          await supabaseAdmin
            .from("driver_invitations")
            .update({ whatsapp_sent_at: now.toISOString(), sent_via: ["whatsapp"] })
            .eq("token", token);
        }
      }

      // Send email if available
      let emailSent = false;
      if (driver.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
              <p style="color: #94a3b8; margin: 8px 0 0;">BetterDriver Training Platform</p>
            </div>
            <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
              <h2 style="color: white; margin: 0 0 16px;">Hi ${driver.first_name},</h2>
              <p style="color: #94a3b8; line-height: 1.6;">
                Your <strong style="color: white;">${programmeName}</strong> training has been activated by 
                <strong style="color: white;">${((deployment.companies as unknown) as Record<string, string>)?.name ?? "your company"}</strong>.
              </p>
              <p style="color: #94a3b8; line-height: 1.6;">
                Click the button below to set up your account and begin your training journey.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${activationUrl}" 
                   style="background: #2ecc71; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                  Activate My Account →
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; text-align: center;">
                This link expires in 30 days. If you did not expect this email, please ignore it.
              </p>
            </div>
          </div>
        `;
        emailSent = await sendEmail(
          driver.email,
          `Your ${programmeName} training is ready — activate your BetterDriver account`,
          emailHtml
        );

        if (emailSent) {
          await supabaseAdmin
            .from("driver_invitations")
            .update({
              email_sent_at: now.toISOString(),
              sent_via: whatsappSent ? ["whatsapp", "email"] : ["email"],
            })
            .eq("token", token);
        }
      }

      results.push({ driverId, token, whatsapp: whatsappSent, email: emailSent });
    }

    // Mark deployment as live
    await supabaseAdmin
      .from("deployments")
      .update({
        approval_status: "live",
        approved_at: now.toISOString(),
        approved_by: adminSession.adminId,
        magic_links_sent_at: now.toISOString(),
        magic_links_sent_count: results.length,
        updated_at: now.toISOString(),
      })
      .eq("id", deploymentId);

    return NextResponse.json({
      ok: true,
      status: "live",
      driversNotified: results.length,
      whatsappSent: results.filter((r) => r.whatsapp).length,
      emailSent: results.filter((r) => r.email).length,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
