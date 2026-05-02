import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";

// ─── POST: send escalation nudge to outstanding candidates in a campaign ──────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaign_id, enrolment_ids } = await req.json() as {
    campaign_id: string;
    enrolment_ids: string[];
  };

  if (!campaign_id || !enrolment_ids || enrolment_ids.length === 0) {
    return NextResponse.json({ error: "campaign_id and enrolment_ids are required" }, { status: 400 });
  }

  // Verify campaign belongs to this company
  const { data: campaign } = await supabaseAdmin
    .from("training_campaigns")
    .select("id, name, end_date")
    .eq("id", campaign_id)
    .eq("company_id", session.companyId)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Fetch enrolments with driver details (only those in this campaign and company)
  const { data: enrolments, error: fetchErr } = await supabaseAdmin
    .from("enrolments")
    .select(`
      id, status, progress_percent, link_activated,
      drivers!inner(id, first_name, last_name, mobile, company_id),
      courses(name)
    `)
    .in("id", enrolment_ids)
    .eq("campaign_id", campaign_id)
    .eq("drivers.company_id", session.companyId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!enrolments || enrolments.length === 0) {
    return NextResponse.json({ error: "No valid enrolments found" }, { status: 404 });
  }

  const config = await getConfigs(["whatsapp_phone_id", "whatsapp_access_token"]);
  const phoneId = config.whatsapp_phone_id;
  const accessToken = config.whatsapp_access_token;

  // Calculate days remaining in campaign
  const daysRemaining = campaign.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const deadlineText = daysRemaining !== null
    ? `You have ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining.`
    : "";

  const results: { enrolmentId: string; sent: boolean; error?: string }[] = [];

  for (const enrolment of enrolments) {
    const driver = Array.isArray(enrolment.drivers)
      ? enrolment.drivers[0]
      : (enrolment.drivers as { id: string; first_name: string; last_name: string; mobile: string } | null);
    const course = enrolment.courses as { name: string } | null;

    if (!driver) {
      results.push({ enrolmentId: enrolment.id, sent: false, error: "Driver not found" });
      continue;
    }

    const isNotStarted = !enrolment.link_activated;
    const nudgeType = isNotStarted ? "not started" : "in progress";
    const message = isNotStarted
      ? `Hi ${driver.first_name}, your ${course?.name ?? "training"} programme as part of the "${campaign.name}" campaign hasn't started yet. Please log in to BetterDriver to begin. ${deadlineText} 🚛`
      : `Hi ${driver.first_name}, you're making progress on your ${course?.name ?? "training"} but haven't completed it yet. Keep going — you're part of the "${campaign.name}" campaign. ${deadlineText} 💪`;

    let sent = false;
    let sendError: string | undefined;

    if (phoneId && accessToken && driver.mobile) {
      let mobile = driver.mobile.replace(/\s+/g, "").replace(/^0/, "27");
      if (!mobile.startsWith("27")) mobile = `27${mobile}`;
      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: mobile,
            type: "text",
            text: { body: message },
          }),
        });
        sent = res.ok;
        if (!res.ok) sendError = `HTTP ${res.status}`;
      } catch (e) {
        sendError = String(e);
      }
    } else {
      // No WhatsApp config — log only
      console.log(`[ESCALATION NUDGE] ${nudgeType} — Would send to ${driver.mobile}: ${message}`);
      sent = true;
    }

    // Update nudge timestamp
    await supabaseAdmin
      .from("enrolments")
      .update({ nudge_sent_at: new Date().toISOString() })
      .eq("id", enrolment.id);

    results.push({ enrolmentId: enrolment.id, sent, error: sendError });
  }

  const sentCount = results.filter((r) => r.sent).length;
  return NextResponse.json({ ok: true, sent: sentCount, total: results.length, results });
}
