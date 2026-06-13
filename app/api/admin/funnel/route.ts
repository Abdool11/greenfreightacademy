import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/funnel — returns funnel data (super_admin only)
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    const [
      { data: leads },
      { data: recentCampaigns },
    ] = await Promise.all([
      supabaseAdmin
        .from("prospect_leads")
        .select(`
          id, company_name, contact_name, email, stage,
          created_at, last_activity_at, voucher_id
        `)
        .order("last_activity_at", { ascending: false }),

      supabaseAdmin
        .from("campaign_logs")
        .select("id, lead_id, channel, status, sent_at")
        .order("sent_at", { ascending: false })
        .limit(10),
    ]);

    const allLeads = leads ?? [];

    // Stage counts
    const stageCounts = {
      imported: allLeads.filter((l) => l.stage === "imported").length,
      voucher_sent: allLeads.filter((l) => l.stage === "voucher_sent").length,
      activated: allLeads.filter((l) => l.stage === "activated").length,
      converted: allLeads.filter((l) => l.stage === "converted").length,
      drivers_deployed: allLeads.filter((l) => l.stage === "drivers_deployed").length,
    };

    // Follow-up alerts: leads with no activity in 14+ days, not yet converted
    const followUpAlerts = allLeads.filter((l) => {
      if (["converted", "drivers_deployed"].includes(l.stage)) return false;
      if (!l.last_activity_at) return true;
      return new Date(l.last_activity_at) < fourteenDaysAgo;
    }).map((l) => ({
      id: l.id,
      company_name: l.company_name,
      contact_name: l.contact_name,
      last_activity_at: l.last_activity_at,
      stage: l.stage,
    }));

    return NextResponse.json({
      stageCounts,
      leads: allLeads.map((l) => ({
        id: l.id,
        company_name: l.company_name,
        contact_name: l.contact_name,
        contact_email: l.email,
        stage: l.stage,
        last_activity_at: l.last_activity_at,
        voucher_sent: l.voucher_id != null,
      })),
      recentCampaigns: recentCampaigns ?? [],
      followUpAlerts,
    });
  } catch (err) {
    console.error("Funnel API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
