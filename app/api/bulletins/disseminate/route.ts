import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCompanyFromRequest } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
);

async function sendWhatsAppBulletin(
  phoneNumber: string,
  driverName: string,
  bulletinTitle: string,
  portalLink: string,
  accessToken: string,
  phoneNumberId: string
) {
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
          text: {
            body: `Hello ${driverName}, you have an important driver bulletin: "${bulletinTitle}". Please open BetterDriver to read and acknowledge it: ${portalLink}`,
          },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { bulletin_id } = await req.json();
    if (!bulletin_id) {
      return NextResponse.json({ error: "bulletin_id required" }, { status: 400 });
    }

    // Fetch bulletin
    const { data: bulletin, error: bErr } = await supabase
      .from("bulletins")
      .select("*")
      .eq("id", bulletin_id)
      .eq("company_id", company.id)
      .single();

    if (bErr || !bulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 });
    }

    // Determine target drivers
    let driversQuery = supabase
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

    const targetDrivers = drivers || [];

    // Create campaign record
    const { data: campaign, error: cErr } = await supabase
      .from("bulletin_campaigns")
      .insert({
        bulletin_id,
        company_id: company.id,
        total_targeted: targetDrivers.length,
        disseminated_at: new Date().toISOString(),
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
      await supabase.from("driver_bulletin_interactions").insert(interactionInserts);
    }

    // Update campaign delivered count
    await supabase
      .from("bulletin_campaigns")
      .update({ total_delivered: targetDrivers.length })
      .eq("id", campaign.id);

    // Fetch WhatsApp config
    const { data: configs } = await supabase
      .from("site_config")
      .select("key, value")
      .in("key", ["whatsapp_access_token", "whatsapp_phone_number_id"]);

    const configMap: Record<string, string> = {};
    configs?.forEach((c) => { configMap[c.key] = c.value; });

    const portalBase = process.env.BETTERDRIVER_URL || "https://betterdriver.co.za";
    let whatsappSent = 0;

    // Send WhatsApp notifications
    for (const driver of targetDrivers) {
      const sent = await sendWhatsAppBulletin(
        driver.mobile,
        `${driver.first_name} ${driver.last_name}`,
        bulletin.title,
        `${portalBase}/portal/bulletins/${bulletin_id}`,
        configMap["whatsapp_access_token"],
        configMap["whatsapp_phone_number_id"]
      );
      if (sent) whatsappSent++;
    }

    // Update bulletin status
    await supabase
      .from("bulletins")
      .update({ status: "disseminated", disseminated_at: new Date().toISOString() })
      .eq("id", bulletin_id);

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      drivers_targeted: targetDrivers.length,
      whatsapp_sent: whatsappSent,
    });
  } catch (err: any) {
    console.error("[bulletin/disseminate]", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
