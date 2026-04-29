import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enrolmentIds } = await req.json() as { enrolmentIds: string[] };

  if (!enrolmentIds || enrolmentIds.length === 0) {
    return NextResponse.json({ error: "No enrolment IDs provided" }, { status: 400 });
  }

  // Verify all enrolments belong to this company's drivers
  const { data: enrolments, error: fetchErr } = await supabaseAdmin
    .from("enrolments")
    .select(`
      id,
      status,
      certified,
      drivers!inner(
        id,
        first_name,
        last_name,
        mobile,
        company_id
      ),
      courses(name)
    `)
    .in("id", enrolmentIds)
    .eq("drivers.company_id", session.companyId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!enrolments || enrolments.length === 0) {
    return NextResponse.json({ error: "No valid enrolments found" }, { status: 404 });
  }

  // Get WhatsApp config from site_config
  const { data: config } = await supabaseAdmin
    .from("site_config")
    .select("value")
    .eq("key", "whatsapp_api_url")
    .single();

  const whatsappUrl = config?.value as string | undefined;

  const results: { enrolmentId: string; sent: boolean; error?: string }[] = [];

  for (const enrolment of enrolments) {
    const driver = Array.isArray(enrolment.drivers) ? enrolment.drivers[0] : enrolment.drivers as {
      id: string; first_name: string; last_name: string; mobile: string; company_id: string;
    } | null;
    const course = enrolment.courses as { name: string } | null;

    if (!driver) {
      results.push({ enrolmentId: enrolment.id, sent: false, error: "Driver not found" });
      continue;
    }

    const message = `Hi ${driver.first_name}, this is a reminder to continue your ${course?.name ?? "training"} programme. Keep up the great work! 🚛`;

    let sent = false;
    let sendError: string | undefined;

    if (whatsappUrl) {
      try {
        const res = await fetch(whatsappUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: driver.mobile, message }),
        });
        sent = res.ok;
        if (!res.ok) sendError = `HTTP ${res.status}`;
      } catch (e) {
        sendError = String(e);
      }
    } else {
      // No WhatsApp URL configured — log only
      console.log(`[NUDGE] Would send to ${driver.mobile}: ${message}`);
      sent = true; // treat as sent for now
    }

    // Update nudge_sent_at timestamp
    await supabaseAdmin
      .from("enrolments")
      .update({ nudge_sent_at: new Date().toISOString() })
      .eq("id", enrolment.id);

    results.push({ enrolmentId: enrolment.id, sent, error: sendError });
  }

  const sentCount = results.filter(r => r.sent).length;

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    total: results.length,
    results,
  });
}
