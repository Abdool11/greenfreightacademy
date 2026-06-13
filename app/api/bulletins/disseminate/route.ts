import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyFromRequest } from "@/lib/auth";

// ─── WhatsApp notification field options ─────────────────────────────────────
// These are the fields the operator can select when creating a bulletin.
// The disseminate API composes the WhatsApp message from the selected fields.
export type BulletinNotificationField =
  | "title"
  | "category"
  | "urgency"
  | "driver_action"
  | "mitigation_message"
  | "portal_link";

const URGENCY_EMOJI: Record<string, string> = {
  urgent: "🚨",
  standard: "📋",
};

function composeBulletinMessage(
  driverName: string,
  bulletin: Record<string, unknown>,
  selectedFields: BulletinNotificationField[],
  portalLink: string
): string {
  const urgency = (bulletin.urgency as string) ?? "standard";
  const emoji = URGENCY_EMOJI[urgency] ?? "📋";
  const urgencyLabel = urgency === "urgent" ? "URGENT" : "Standard";

  const lines: string[] = [];

  // Always open with personalised greeting
  lines.push(`Hi ${driverName},`);
  lines.push("");

  // Urgency header line — always shown if urgency field selected
  if (selectedFields.includes("urgency")) {
    lines.push(`${emoji} *${urgencyLabel} Driver Bulletin*`);
  } else {
    lines.push(`${emoji} *Driver Bulletin*`);
  }

  // Selected fields
  if (selectedFields.includes("title") && bulletin.title) {
    lines.push(`*Topic:* ${bulletin.title}`);
  }
  if (selectedFields.includes("category") && bulletin.category) {
    lines.push(`*Category:* ${String(bulletin.category).charAt(0).toUpperCase() + String(bulletin.category).slice(1)}`);
  }
  if (selectedFields.includes("driver_action") && bulletin.driver_action) {
    const action = typeof bulletin.driver_action === "string" ? bulletin.driver_action : null;
    if (action) lines.push(`*Action required:* ${action}`);
  }
  if (selectedFields.includes("mitigation_message") && bulletin.mitigation_message) {
    lines.push(`*What to do:* ${bulletin.mitigation_message}`);
  }

  // Portal link — always shown if selected
  if (selectedFields.includes("portal_link")) {
    lines.push("");
    lines.push(`Read the full bulletin and acknowledge receipt here:`);
    lines.push(portalLink);
  }

  lines.push("");
  lines.push("— Green Freight Academy");

  return lines.join("\n");
}

async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  accessToken: string,
  phoneNumberId: string
): Promise<boolean> {
  if (!accessToken || !phoneNumberId) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber.replace(/\D/g, ""),
          type: "text",
          text: { body: message, preview_url: false },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── POST /api/bulletins/disseminate ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json();
    const { bulletin_id, notification_fields } = body;

    if (!bulletin_id) {
      return NextResponse.json({ error: "bulletin_id required" }, { status: 400 });
    }

    // Default fields if none specified — title, urgency, and portal link always make sense
    const selectedFields: BulletinNotificationField[] = Array.isArray(notification_fields) && notification_fields.length > 0
      ? notification_fields
      : ["title", "urgency", "driver_action", "portal_link"];

    // Fetch bulletin
    const { data: bulletin, error: bErr } = await supabaseAdmin
      .from("bulletins")
      .select("*")
      .eq("id", bulletin_id)
      .eq("company_id", company.id)
      .single();

    if (bErr || !bulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 });
    }

    // Persist the selected notification fields on the bulletin record
    await supabaseAdmin
      .from("bulletins")
      .update({ whatsapp_notification_fields: selectedFields })
      .eq("id", bulletin_id);

    // Determine target drivers
    let driversQuery = supabaseAdmin
      .from("drivers")
      .select("id, first_name, last_name, mobile, email")
      .eq("company_id", company.id)
      .eq("status", "active");

    if (bulletin.audience_type === "branch" && bulletin.audience_ids?.length) {
      driversQuery = driversQuery.in("branch", bulletin.audience_ids);
    } else if (bulletin.audience_type === "custom" && bulletin.audience_ids?.length) {
      driversQuery = driversQuery.in("id", bulletin.audience_ids);
    }

    const { data: drivers, error: dErr } = await driversQuery;
    if (dErr) throw dErr;

    const targetDrivers = drivers ?? [];

    // Create campaign record
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("bulletin_campaigns")
      .insert({
        bulletin_id,
        company_id: company.id,
        total_targeted: targetDrivers.length,
        disseminated_at: new Date().toISOString(),
        notification_fields: selectedFields,
      })
      .select()
      .single();

    if (cErr) throw cErr;

    // Create driver interaction records
    const interactionInserts = targetDrivers.map((d) => ({
      bulletin_id,
      campaign_id: campaign.id,
      driver_id: d.id,
      status: "new",
      delivered_at: new Date().toISOString(),
    }));

    if (interactionInserts.length > 0) {
      await supabaseAdmin.from("driver_bulletin_interactions").insert(interactionInserts);
    }

    await supabaseAdmin
      .from("bulletin_campaigns")
      .update({ total_delivered: targetDrivers.length })
      .eq("id", campaign.id);

    // Fetch WhatsApp config
    const { data: configs } = await supabaseAdmin
      .from("site_config")
      .select("key, value")
      .in("key", ["whatsapp_access_token", "whatsapp_phone_number_id"]);

    const configMap: Record<string, string> = {};
    configs?.forEach((c: { key: string; value: string }) => { configMap[c.key] = c.value; });

    const portalBase = process.env.BETTERDRIVER_URL ?? "https://betterdriver.co.za";
    let whatsappSent = 0;

    // Send personalised WhatsApp notifications
    for (const driver of targetDrivers) {
      const message = composeBulletinMessage(
        driver.first_name,
        bulletin as Record<string, unknown>,
        selectedFields,
        `${portalBase}/portal/bulletins/${bulletin_id}`
      );

      const sent = await sendWhatsAppMessage(
        driver.mobile,
        message,
        configMap["whatsapp_access_token"],
        configMap["whatsapp_phone_number_id"]
      );
      if (sent) whatsappSent++;
    }

    // Update bulletin status
    await supabaseAdmin
      .from("bulletins")
      .update({ status: "disseminated", disseminated_at: new Date().toISOString() })
      .eq("id", bulletin_id);

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      drivers_targeted: targetDrivers.length,
      whatsapp_sent: whatsappSent,
      notification_fields: selectedFields,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[bulletin/disseminate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
