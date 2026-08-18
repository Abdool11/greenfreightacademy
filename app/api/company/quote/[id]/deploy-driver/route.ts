import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";

function normaliseSAMobile(raw: string): string {
  let m = raw.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (m.startsWith("27")) return m;
  if (m.startsWith("0")) return "27" + m.slice(1);
  return "27" + m;
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

// POST /api/company/quote/[id]/deploy-driver — deploy a single driver from a paid quote
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: quoteId } = await params;
  const { driverId } = await req.json();
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  // Verify quote
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "paid" && quote.status !== "approved" && quote.status !== "deployed") {
    return NextResponse.json({ error: "Quote must be paid before deploying" }, { status: 400 });
  }

  const items: Array<{ driverId: string; driverName: string; courseIds: string[]; deployedAt?: string }> =
    quote.items_json ?? [];

  const itemIndex = items.findIndex((i) => i.driverId === driverId);
  if (itemIndex === -1) return NextResponse.json({ error: "Driver not found in this quote" }, { status: 404 });

  // Already deployed?
  if (items[itemIndex].deployedAt) {
    return NextResponse.json({ ok: true, alreadyDeployed: true });
  }

  // Check credit balance (1 credit per course in this item)
  const enrolmentCount = items[itemIndex].courseIds?.length ?? 1;
  const { data: companyRow } = await supabaseAdmin
    .from("companies")
    .select("credit_balance")
    .eq("id", session.companyId)
    .single();

  const currentBalance = Number(companyRow?.credit_balance ?? 0);
  if (currentBalance < enrolmentCount) {
    return NextResponse.json({
      error: "Insufficient credits",
      required: enrolmentCount,
      available: currentBalance,
    }, { status: 402 });
  }

  // Load config
  const config = await getConfigs([
    "whatsapp_phone_id",
    "whatsapp_access_token",
    "whatsapp_magic_link_template",
    "bd_base_url",
    "email_booking_to",
    "company_name",
  ]);

  const bdBaseUrl = (config.bd_base_url || "https://betterdriver.co.za").replace(/\/$/, "");
  const phoneId = config.whatsapp_phone_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const accessToken = config.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || "";

  // Create or reuse deployment record
  let deploymentId: string;
  const { data: existingDeployment } = await supabaseAdmin
    .from("deployments")
    .select("id")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existingDeployment) {
    deploymentId = existingDeployment.id;
  } else {
    const { data: newDeployment, error: depErr } = await supabaseAdmin
      .from("deployments")
      .insert({
        quote_id: quoteId,
        company_id: session.companyId,
        deployed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (depErr || !newDeployment) {
      return NextResponse.json({ error: "Failed to create deployment record" }, { status: 500 });
    }
    deploymentId = newDeployment.id;
  }

  // Get driver details
  const { data: driver } = await supabaseAdmin
    .from("drivers")
    .select("id, first_name, last_name, mobile, email")
    .eq("id", driverId)
    .single();

  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  // Create company_employees record if needed
  let employeeId: string | null = null;
  const { data: existingEmp } = await supabaseAdmin
    .from("company_employees")
    .select("id")
    .eq("company_id", session.companyId)
    .or(`mobile.eq.${driver.mobile},email.eq.${driver.email}`)
    .maybeSingle();

  if (existingEmp) {
    employeeId = existingEmp.id;
  } else {
    const { data: newEmp } = await supabaseAdmin
      .from("company_employees")
      .insert({
        company_id: session.companyId,
        name: `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim(),
        email: driver.email ?? `driver_${driver.id}@placeholder.local`,
        mobile: driver.mobile,
      })
      .select("id")
      .single();
    if (newEmp) employeeId = newEmp.id;
  }

  // Resolve course details
  const courseIds = items[itemIndex].courseIds ?? [];
  const { data: courseRows } = await supabaseAdmin
    .from("courses")
    .select("id, name, slug")
    .in("id", courseIds);
  const courseMap = Object.fromEntries((courseRows ?? []).map(c => [c.id, c]));

  const firstCourse = courseMap[courseIds[0]];
  const programmeName = firstCourse?.name ?? "The Professional Truck Driver";
  const programmeSlug = firstCourse?.slug ?? "professional-truck-driver";

  // Create enrolments
  for (const courseId of courseIds) {
    const c = courseMap[courseId];
    const slug = c?.slug ?? programmeSlug;
    await supabaseAdmin.from("enrolments").insert({
      employee_id: employeeId,
      driver_id: driver.id,
      company_id: session.companyId,
      programme_id: slug,
      programme_slug: slug,
      campaign_id: null,
      status: "enrolled",
      started_at: new Date().toISOString(),
      progress_percent: 0,
      modules_completed: 0,
    });
  }

  // Generate invitation token
  const token = generateOpaqueToken();
  const { error: inviteErr } = await supabaseAdmin.from("driver_invitations").insert({
    driver_id: driver.id,
    company_id: session.companyId,
    deployment_id: deploymentId,
    token,
    program_assignment: "p1",
    programme_slug: programmeSlug,
    driver_name: `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim(),
    driver_mobile: driver.mobile,
    driver_email: driver.email,
    status: "pending",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });

  if (inviteErr) {
    console.error("[deploy-driver] invitation error:", inviteErr);
  }

  // Send WhatsApp magic link
  let whatsappSent = false;
  if (phoneId && accessToken && driver.mobile) {
    const magicLink = `${bdBaseUrl}/join/${token}`;
    try {
      let body: Record<string, unknown>;
      if (config.whatsapp_magic_link_template) {
        body = {
          messaging_product: "whatsapp",
          to: normaliseSAMobile(driver.mobile),
          type: "template",
          template: {
            name: config.whatsapp_magic_link_template,
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: driver.first_name },
                { type: "text", text: session.companyName ?? "Your company" },
                { type: "text", text: programmeName },
                { type: "text", text: token },
              ],
            }],
          },
        };
      } else {
        const text = `Hi ${driver.first_name}, welcome to BetterDriver. ${session.companyName ?? "Your company"} has enrolled you in ${programmeName}.\n\nThis is your personal space to complete your training, receive safety briefings and build your professional record.\n\nTap your secure link to get started — no password is needed:\n${magicLink}\n\nPlease keep this message so you can return to BetterDriver easily.`;
        body = {
          messaging_product: "whatsapp",
          to: normaliseSAMobile(driver.mobile),
          type: "text",
          text: { body: text },
        };
      }

      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      whatsappSent = res.ok;
      if (!res.ok) console.error("[deploy-driver] WhatsApp failed");
    } catch (e) {
      console.error("[deploy-driver] WhatsApp exception:", e);
    }
  }

  // Mark this driver as deployed in items_json
  const now = new Date().toISOString();
  const updatedItems = [...items];
  updatedItems[itemIndex] = { ...updatedItems[itemIndex], deployedAt: now };

  // Check if all drivers are now deployed
  const allDeployed = updatedItems.every((i) => i.deployedAt);

  await supabaseAdmin
    .from("quotes")
    .update({
      items_json: updatedItems,
      ...(allDeployed ? { status: "deployed", deployed_at: now } : {}),
    })
    .eq("id", quoteId)
    .eq("company_id", session.companyId);

  // Deduct credits
  const { data: companyForDeduction } = await supabaseAdmin
    .from("companies")
    .select("credit_balance")
    .eq("id", session.companyId)
    .single();

  const balanceAfter = Number(companyForDeduction?.credit_balance ?? 0) - enrolmentCount;
  await supabaseAdmin
    .from("companies")
    .update({ credit_balance: Math.max(0, balanceAfter) })
    .eq("id", session.companyId);

  // ── Alert GFA admin if WhatsApp failed ──────────────────────────────────────
  if (!whatsappSent && process.env.BREVO_SMTP_PASSWORD) {
    const adminEmail = config.email_booking_to || "durbanroadtransport@gmail.com";
    const driverName = `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim();
    const magicLink = `${bdBaseUrl}/join/${token}`;
    try {
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GFA Platform Alerts",
        to: adminEmail,
        subject: `⚠️ WhatsApp delivery failed — ${driverName} — Ref: ${quote.reference}`,
        html: `
          <p><strong>WARNING:</strong> WhatsApp magic link was NOT delivered to a driver during deployment.</p>
          <p>Company: <strong>${session.companyName ?? "Unknown"}</strong></p>
          <p>Quote reference: <strong>${quote.reference}</strong></p>
          <p>Driver: <strong>${driverName}</strong></p>
          <p>Mobile: <strong>${driver.mobile ?? "N/A"}</strong></p>
          <p>Magic link: <a href="${magicLink}">${magicLink}</a></p>
          <p>Likely cause: WhatsApp credentials not configured or Meta API error.</p>
          <hr/>
          <p style="font-size:12px;color:#666;">
            Check that <code>whatsapp_phone_id</code> and <code>whatsapp_access_token</code> are set in site_config or .env.local.
          </p>
        `,
      });
    } catch (alertErr) {
      console.error("WhatsApp failure alert email error:", alertErr);
    }
  }

  return NextResponse.json({
    ok: true,
    driverId,
    driverName: `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim(),
    whatsappSent,
    allDeployed,
  });
}
