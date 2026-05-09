import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { Resend } from "resend";
import { randomBytes } from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a South African mobile number to E.164 format (27XXXXXXXXX) */
function normaliseSAMobile(raw: string): string {
  let m = raw.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (m.startsWith("27")) return m;
  if (m.startsWith("0")) return "27" + m.slice(1);
  return "27" + m;
}

/** Generate a cryptographically random opaque token (64 hex chars) */
function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create (or reuse) a driver_invitation record in Supabase.
 * Idempotent: if an active invitation already exists for this driver + deployment, reuse it.
 */
async function getOrCreateInvitation(params: {
  driverId: string;
  deploymentId: string;
  programAssignment: "p1" | "p2" | "p1_p2";
  expiresAt: string | null;
  inviteVideoUrl: string | null;
}): Promise<{ token: string }> {
  const { driverId, deploymentId, programAssignment, expiresAt, inviteVideoUrl } = params;

  // Check for an existing active (non-revoked, non-expired) invitation
  const { data: existing } = await supabaseAdmin
    .from("driver_invitations")
    .select("id, token, revoked_at, expires_at")
    .eq("driver_id", driverId)
    .eq("deployment_id", deploymentId)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) {
    const isExpired = existing.expires_at && new Date(existing.expires_at) < new Date();
    if (!isExpired) return { token: existing.token };
  }

  // Create a fresh invitation
  const token = generateOpaqueToken();
  await supabaseAdmin.from("driver_invitations").insert({
    driver_id: driverId,
    deployment_id: deploymentId,
    token,
    program_assignment: programAssignment,
    expires_at: expiresAt,
    invite_video_url: inviteVideoUrl,
    created_at: new Date().toISOString(),
  });

  return { token };
}

/**
 * Send the magic link WhatsApp message via Meta Graph API.
 *
 * Production path: uses the Meta-approved template "gfa_driver_magic_link"
 *   {{1}} = driver first name
 *   {{2}} = company name
 *   {{3}} = programme name
 *   {{4}} = magic link TOKEN only (e.g. "a1b2c3d4...")
 *
 * The base URL (https://betterdriver.co.za/join/) is hardcoded in the Meta
 * template body. Only the unique token is passed as a variable — this is
 * required for Meta Utility category approval.
 *
 * Fallback (pre-approval / staging): sends a plain-text message.
 */
async function sendMagicLinkWhatsApp(params: {
  mobile: string;
  driverFirstName: string;
  companyName: string;
  programmeName: string;
  magicLinkToken: string;  // token only, NOT the full URL
  magicLinkFull: string;   // full URL for plain-text fallback only
  phoneId: string;
  accessToken: string;
  templateName?: string;
}): Promise<boolean> {
  const { mobile, driverFirstName, companyName, programmeName, magicLinkToken, magicLinkFull, phoneId, accessToken, templateName } = params;
  const to = normaliseSAMobile(mobile);

  try {
    let body: Record<string, unknown>;

    if (templateName) {
      // ── Approved Meta template (production) ───────────────────────────────
      body = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: driverFirstName },
                { type: "text", text: companyName },
                { type: "text", text: programmeName },
                // Pass only the token — base URL is hardcoded in the Meta template
                { type: "text", text: magicLinkToken },
              ],
            },
          ],
        },
      };
    } else {
      // ── Plain-text fallback (staging / pre-approval) ────────────────────────────────────
      const text =
        `Hi ${driverFirstName}, ${companyName} has enrolled you in the ${programmeName} programme on BetterDriver. ` +
        `Tap the link below to start your training — no password needed:\n\n${magicLinkFull}`;
      body = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[GFA deploy] WhatsApp send failed:", JSON.stringify(err));
    }

    return res.ok;
  } catch (e) {
    console.error("[GFA deploy] WhatsApp exception:", e);
    return false;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId, campaignId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  // ── 1. Verify quote is paid ────────────────────────────────────────────────
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "paid") {
    return NextResponse.json({ error: "Payment must be confirmed before deploying" }, { status: 400 });
  }
  if (quote.deployed_at) {
    return NextResponse.json({ ok: true, alreadyDeployed: true });
  }

  // ── 2. Load config ─────────────────────────────────────────────────────────
  const config = await getConfigs([
    "whatsapp_phone_id",
    "whatsapp_access_token",
    "whatsapp_magic_link_template",  // Meta-approved template name; blank = plain-text fallback
    "bd_base_url",                   // e.g. https://betterdriver.co.za
    "email_booking_to",
    "company_name",
  ]);

  const bdBaseUrl = (config.bd_base_url || "https://betterdriver.co.za").replace(/\/$/, "");
  const phoneId = config.whatsapp_phone_id;
  const accessToken = config.whatsapp_access_token;

  // ── 3. Resolve campaign (expiry date + invite video) ──────────────────────
  let campaignExpiresAt: string | null = null;
  let campaignInviteVideoUrl: string | null = null;

  if (campaignId) {
    const { data: campaign } = await supabaseAdmin
      .from("training_campaigns")
      .select(`id, end_date, invite_video_id, gfa_videos ( playback_url )`)
      .eq("id", campaignId)
      .eq("company_id", session.companyId)
      .single();

    if (campaign) {
      campaignExpiresAt = campaign.end_date ?? null;
      const video = campaign.gfa_videos as unknown as { playback_url?: string } | null;
      campaignInviteVideoUrl = video?.playback_url ?? null;
    }
  }

  // ── 4. Create or reuse a deployment record ────────────────────────────────
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
        campaign_id: campaignId ?? null,
        deployed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (depErr || !newDeployment) {
      console.error("[GFA deploy] Failed to create deployment:", depErr);
      return NextResponse.json({ error: "Failed to create deployment record" }, { status: 500 });
    }
    deploymentId = newDeployment.id;
  }

  // ── 5. Process each driver ─────────────────────────────────────────────────
  const items: Array<{ driverId: string; driverName: string; courseIds: string[] }> =
    quote.items_json ?? [];

  const results: {
    driverId: string;
    whatsapp: boolean;
    enrolment: boolean;
    magicLink: string;
  }[] = [];

  for (const item of items) {
    const { data: driver } = await supabaseAdmin
      .from("drivers")
      .select("id, first_name, last_name, mobile")
      .eq("id", item.driverId)
      .single();

    if (!driver) continue;

    // Create enrolment records (one per course)
    for (const courseId of item.courseIds) {
      await supabaseAdmin.from("enrolments").upsert(
        {
          driver_id: driver.id,
          company_id: session.companyId,
          course_id: courseId,
          quote_id: quoteId,
          campaign_id: campaignId ?? null,
          status: "enrolled",
          enrolled_at: new Date().toISOString(),
          progress_percent: 0,
        },
        { onConflict: "driver_id,course_id", ignoreDuplicates: true }
      );
    }

    // Resolve programme name from the first course
    let programmeName = "The Professional Truck Driver";
    if (item.courseIds.length > 0) {
      const { data: course } = await supabaseAdmin
        .from("courses")
        .select("name")
        .eq("id", item.courseIds[0])
        .single();
      if (course?.name) programmeName = course.name;
    }

    // Generate / reuse BD invitation token
    const { token } = await getOrCreateInvitation({
      driverId: driver.id,
      deploymentId,
      programAssignment: "p1",
      expiresAt: campaignExpiresAt,
      inviteVideoUrl: campaignInviteVideoUrl,
    });

    const magicLink = `${bdBaseUrl}/join/${token}`;

    // Send WhatsApp magic link message
    let whatsappSent = false;
    if (phoneId && accessToken && driver.mobile) {
      whatsappSent = await sendMagicLinkWhatsApp({
        mobile: driver.mobile,
        driverFirstName: driver.first_name,
        companyName: session.companyName ?? "Your company",
        programmeName,
        magicLinkToken: token,        // token only — base URL hardcoded in Meta template
        magicLinkFull: magicLink,     // full URL for plain-text fallback
        phoneId,
        accessToken,
        templateName: config.whatsapp_magic_link_template || undefined,
      });
    }

    results.push({ driverId: driver.id, whatsapp: whatsappSent, enrolment: true, magicLink });
  }

  // ── 6. Mark quote as deployed ──────────────────────────────────────────────
  await supabaseAdmin
    .from("quotes")
    .update({ status: "deployed", deployed_at: new Date().toISOString() })
    .eq("id", quoteId);

  // ── 7. Notify GFA admin by email ───────────────────────────────────────────
  const adminEmail = config.email_booking_to || "durbanroadtransport@gmail.com";
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `GreenFreightAcademy <notifications@greenfreightacademy.co.za>`,
      to: adminEmail,
      subject: `Training deployed — ${session.companyName} — Ref: ${quote.reference}`,
      html: `
        <p><strong>${session.companyName}</strong> has confirmed payment and deployed training.</p>
        <p>Quote reference: <strong>${quote.reference}</strong></p>
        <p>Drivers enrolled: <strong>${items.length}</strong></p>
        <p>Magic links sent via WhatsApp: <strong>${results.filter((r) => r.whatsapp).length}</strong></p>
        <p>Total value: <strong>R ${quote.total?.toFixed(2)}</strong></p>
        <hr/>
        <p style="font-size:12px;color:#666;">
          Each driver received a personalised magic link to BetterDriver.
          They tap the link and land directly in their training portal — no password required.
        </p>
      `,
    });
  }

  return NextResponse.json({
    ok: true,
    deployed: results.length,
    whatsappSent: results.filter((r) => r.whatsapp).length,
  });
}
