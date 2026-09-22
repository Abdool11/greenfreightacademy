import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

type QuoteItem = {
  driverId: string;
  driverName?: string;
  courseIds: string[];
};

type DriverRecord = {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string | null;
  email: string | null;
};

type CourseRecord = {
  id: string;
  slug: string | null;
  name: string | null;
};

type InvitationReservation = {
  invitation_id: string;
  token: string;
  reused: boolean;
  whatsapp_sent_at: string | null;
  email_sent_at: string | null;
};

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function normaliseSAMobile(mobile: string): string {
  const digits = mobile.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return `27${digits}`;
}

async function sendWhatsApp(
  mobile: string,
  message: string,
  phoneId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normaliseSAMobile(mobile),
        type: "text",
        text: { body: message },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendDriverEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.BREVO_SMTP_PASSWORD) return false;
  try {
    await sendEmail({
      from: "notifications@greenfreightacademy.com",
      fromName: "GreenFreightAcademy",
      to,
      subject,
      html,
    });
    return true;
  } catch {
    return false;
  }
}

async function getCohortDriverRows(deployment: {
  id: string;
  company_id: string;
  quote_id: string | null;
}): Promise<Array<{ driver: DriverRecord; course: CourseRecord }>> {
  if (!deployment.quote_id) return [];

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("items_json")
    .eq("id", deployment.quote_id)
    .eq("company_id", deployment.company_id)
    .maybeSingle();

  if (quoteError) throw new Error("Could not load the cohort quotation.");
  const items = (quote?.items_json ?? []) as QuoteItem[];
  const driverIds = [...new Set(items.map((item) => item.driverId).filter(Boolean))];
  const courseIds = [...new Set(items.flatMap((item) => item.courseIds ?? []).filter(Boolean))];
  if (driverIds.length === 0 || courseIds.length === 0) return [];

  const [{ data: drivers, error: driversError }, { data: courses, error: coursesError }] = await Promise.all([
    supabaseAdmin
      .from("drivers")
      .select("id, first_name, last_name, mobile, email")
      .eq("company_id", deployment.company_id)
      .in("id", driverIds),
    supabaseAdmin
      .from("courses")
      .select("id, slug, name")
      .in("id", courseIds),
  ]);

  if (driversError || coursesError) throw new Error("Could not load the approved drivers and programme details.");
  const driverMap = new Map((drivers ?? []).map((driver) => [driver.id, driver as DriverRecord]));
  const courseMap = new Map((courses ?? []).map((course) => [course.id, course as CourseRecord]));
  const rows: Array<{ driver: DriverRecord; course: CourseRecord }> = [];

  for (const item of items) {
    const driver = driverMap.get(item.driverId);
    if (!driver) continue;
    for (const courseId of item.courseIds ?? []) {
      const course = courseMap.get(courseId);
      if (course) rows.push({ driver, course });
    }
  }
  return rows;
}

async function ensureCohortEnrolment(params: {
  deploymentId: string;
  companyId: string;
  driverId: string;
  course: CourseRecord;
  now: string;
}) {
  const { deploymentId, companyId, driverId, course, now } = params;
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("enrolments")
    .select("id")
    .eq("company_id", companyId)
    .eq("driver_id", driverId)
    .eq("course_id", course.id)
    .maybeSingle();

  if (existingError) throw new Error("Could not inspect cohort enrolment state.");

  if (existing) {
    const { error } = await supabaseAdmin
      .from("enrolments")
      .update({ deployment_id: deploymentId, status: "enrolled" })
      .eq("id", existing.id);
    if (error) throw new Error("Could not attach the existing enrolment to this cohort.");
    return;
  }

  const { error } = await supabaseAdmin.from("enrolments").insert({
    driver_id: driverId,
    company_id: companyId,
    course_id: course.id,
    programme_id: course.id,
    programme_slug: course.slug ?? "professional-truck-driver",
    deployment_id: deploymentId,
    status: "enrolled",
    progress_percent: 0,
    modules_completed: 0,
    enrolled_at: now,
  });
  if (error) throw new Error("Could not create the cohort enrolment.");
}

export async function POST(req: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { deploymentId, action } = body;
  if (!deploymentId || !action) {
    return NextResponse.json({ error: "deploymentId and action required" }, { status: 400 });
  }

  if (action === "confirm_eft") {
    // Payment confirmation is owned by the audited finance reconciliation
    // workflow. This route deliberately does not provide a second manual path
    // that could mark a cohort paid without the submitted EFT evidence.
    return NextResponse.json({
      error: "Manual cohort EFT confirmation is retired. Confirm the submitted EFT in Admin Finance & Ledger before activating training.",
    }, { status: 409 });
  }

  if (action !== "approve_and_go_live") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: deployment, error: deploymentError } = await supabaseAdmin
    .from("deployments")
    .select("id, company_id, quote_id, approval_status, companies(id, name)")
    .eq("id", deploymentId)
    .maybeSingle();

  if (deploymentError) {
    console.error("[GFA cohort approval] deployment lookup failed:", deploymentError);
    return NextResponse.json({ error: "Could not load this cohort. Please refresh and try again." }, { status: 500 });
  }
  if (!deployment) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });

  if (["approved", "live", "completed"].includes(deployment.approval_status)) {
    return NextResponse.json({
      ok: true,
      status: deployment.approval_status === "completed" ? "completed" : "live",
      alreadyLive: true,
      driversNotified: 0,
      whatsappSent: 0,
      emailSent: 0,
    });
  }
  if (deployment.approval_status !== "payment_received") {
    return NextResponse.json({ error: "Finance confirmation is required before this cohort can go live." }, { status: 409 });
  }

  let cohortRows: Array<{ driver: DriverRecord; course: CourseRecord }>;
  try {
    cohortRows = await getCohortDriverRows({
      id: deployment.id,
      company_id: deployment.company_id,
      quote_id: deployment.quote_id,
    });
  } catch (error) {
    console.error("[GFA cohort approval] cohort rows failed:", error);
    return NextResponse.json({ error: "Could not load the approved cohort. No invitations were sent." }, { status: 500 });
  }

  if (cohortRows.length === 0) {
    return NextResponse.json({
      error: "This cohort has no approved quote drivers to activate. Review the quotation and deployment record before retrying.",
    }, { status: 409 });
  }

  const config = await getConfigs([
    "whatsapp_phone_id",
    "whatsapp_access_token",
    "whatsapp_welcome_template",
  ]);
  const bdBaseUrl = (process.env.BD_BASE_URL || "https://betterdriver.co.za").replace(/\/$/, "");
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const companyName = ((deployment.companies as unknown) as { name?: string } | null)?.name ?? "your company";
  const driverCourses = new Map<string, { driver: DriverRecord; courses: CourseRecord[] }>();

  for (const row of cohortRows) {
    const entry = driverCourses.get(row.driver.id) ?? { driver: row.driver, courses: [] };
    if (!entry.courses.some((course) => course.id === row.course.id)) entry.courses.push(row.course);
    driverCourses.set(row.driver.id, entry);
  }

  const results: Array<{ driverId: string; reused: boolean; whatsapp: boolean; email: boolean }> = [];

  for (const [driverId, entry] of driverCourses) {
    try {
      for (const course of entry.courses) {
        await ensureCohortEnrolment({
          deploymentId: deployment.id,
          companyId: deployment.company_id,
          driverId,
          course,
          now: nowIso,
        });
      }

      const primaryCourse = entry.courses[0];
      const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc(
        "gfa_reserve_cohort_driver_invitation",
        {
          p_deployment_id: deployment.id,
          p_driver_id: driverId,
          p_company_id: deployment.company_id,
          p_programme_slug: primaryCourse.slug ?? "professional-truck-driver",
          p_driver_name: `${entry.driver.first_name} ${entry.driver.last_name}`.trim(),
          p_driver_mobile: entry.driver.mobile,
          p_driver_email: entry.driver.email,
          p_expires_at: expiresAt,
          p_token: generateToken(),
        }
      );
      if (reservationError || !reservationData?.[0]) throw new Error("Could not reserve a unique driver invitation.");
      const reservation = reservationData[0] as InvitationReservation;

      if (reservation.reused) {
        results.push({
          driverId,
          reused: true,
          whatsapp: Boolean(reservation.whatsapp_sent_at),
          email: Boolean(reservation.email_sent_at),
        });
        continue;
      }

      const programmeName = primaryCourse.name ?? "Professional Truck Driver Program";
      const activationUrl = `${bdBaseUrl}/activate?token=${reservation.token}`;
      const phoneId = config.whatsapp_phone_id;
      const accessToken = config.whatsapp_access_token;
      let whatsappSent = false;
      if (phoneId && accessToken && entry.driver.mobile) {
        const template = config.whatsapp_welcome_template ||
          "Hi {{driver_name}}, welcome to BetterDriver! Your {{programme_name}} training has been activated by {{company_name}}. Click here to get started: {{portal_link}}";
        const message = template
          .replace(/{{driver_name}}/g, entry.driver.first_name)
          .replace(/{{programme_name}}/g, programmeName)
          .replace(/{{company_name}}/g, companyName)
          .replace(/{{portal_link}}/g, activationUrl);
        whatsappSent = await sendWhatsApp(entry.driver.mobile, message, phoneId, accessToken);
        if (whatsappSent) {
          await supabaseAdmin
            .from("driver_invitations")
            .update({ whatsapp_sent_at: nowIso, sent_via: ["whatsapp"] })
            .eq("id", reservation.invitation_id);
        }
      }

      let emailSent = false;
      if (entry.driver.email) {
        emailSent = await sendDriverEmail(
          entry.driver.email,
          `Your ${programmeName} training is ready — activate your BetterDriver account`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#0a1628;padding:32px;text-align:center"><h1 style="color:#2ecc71;margin:0">GreenFreightAcademy</h1></div><div style="background:#111f3a;padding:32px"><h2 style="color:white">Hi ${entry.driver.first_name},</h2><p style="color:#cbd5e1">Your <strong>${programmeName}</strong> training has been activated by <strong>${companyName}</strong>.</p><p style="margin:32px 0"><a href="${activationUrl}" style="background:#2ecc71;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Activate My Account</a></p><p style="color:#94a3b8;font-size:12px">This link expires in 30 days.</p></div></div>`
        );
        if (emailSent) {
          await supabaseAdmin
            .from("driver_invitations")
            .update({
              email_sent_at: nowIso,
              sent_via: whatsappSent ? ["whatsapp", "email"] : ["email"],
            })
            .eq("id", reservation.invitation_id);
        }
      }

      results.push({ driverId, reused: false, whatsapp: whatsappSent, email: emailSent });
    } catch (error) {
      console.error("[GFA cohort approval] driver activation failed:", { deploymentId, driverId, error });
      return NextResponse.json({
        error: "The cohort could not be activated safely. No further driver invitations were sent; review the cohort and retry after resolving the reported data issue.",
      }, { status: 500 });
    }
  }

  const { error: liveError } = await supabaseAdmin
    .from("deployments")
    .update({
      approval_status: "live",
      approved_at: nowIso,
      approved_by: adminSession.adminId,
      magic_links_sent_at: nowIso,
      magic_links_sent_count: results.filter((result) => !result.reused).length,
      updated_at: nowIso,
    })
    .eq("id", deployment.id)
    .eq("approval_status", "payment_received");

  if (liveError) {
    console.error("[GFA cohort approval] final transition failed:", liveError);
    return NextResponse.json({ error: "Driver invitations were prepared but the cohort state could not be finalised. Do not resend; refresh and contact GFA support." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: "live",
    driversNotified: results.filter((result) => !result.reused).length,
    invitationsReused: results.filter((result) => result.reused).length,
    whatsappSent: results.filter((result) => result.whatsapp && !result.reused).length,
    emailSent: results.filter((result) => result.email && !result.reused).length,
  });
}
