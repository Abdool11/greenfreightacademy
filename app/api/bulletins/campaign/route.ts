import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCompanyFromRequest } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
);

// GET /api/bulletins/campaign?bulletin_id=xxx
export async function GET(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bulletin_id = searchParams.get("bulletin_id");

    // Fetch all campaigns for this company (or specific bulletin)
    let query = supabase
      .from("bulletin_campaigns")
      .select(`
        *,
        bulletins (
          id, title, category, urgency, distribution, status,
          disseminated_at, sla_deadline, created_at
        )
      `)
      .eq("company_id", company.id)
      .order("disseminated_at", { ascending: false });

    if (bulletin_id) {
      query = query.eq("bulletin_id", bulletin_id);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    // For each campaign, compute live stats from interactions
    const enriched = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { data: interactions } = await supabase
          .from("driver_bulletin_interactions")
          .select("status, feedback_comment, understanding_score")
          .eq("campaign_id", campaign.id);

        const all = interactions || [];
        const opened = all.filter((i) => ["opened", "acknowledged", "check_completed", "completed"].includes(i.status)).length;
        const acknowledged = all.filter((i) => ["acknowledged", "check_completed", "completed"].includes(i.status)).length;
        const check_completed = all.filter((i) => ["check_completed", "completed"].includes(i.status)).length;
        const feedback_count = all.filter((i) => i.feedback_comment).length;
        const avg_score = check_completed > 0
          ? Math.round(all.filter((i) => i.understanding_score != null).reduce((sum, i) => sum + (i.understanding_score || 0), 0) / check_completed)
          : null;

        return {
          ...campaign,
          live_stats: {
            total_targeted: campaign.total_targeted,
            total_delivered: campaign.total_delivered,
            total_opened: opened,
            total_acknowledged: acknowledged,
            total_check_completed: check_completed,
            total_feedback: feedback_count,
            acknowledgement_rate: campaign.total_delivered > 0
              ? Math.round((acknowledged / campaign.total_delivered) * 100)
              : 0,
            understanding_completion_rate: campaign.total_delivered > 0
              ? Math.round((check_completed / campaign.total_delivered) * 100)
              : 0,
            avg_understanding_score: avg_score,
          },
        };
      })
    );

    return NextResponse.json({ campaigns: enriched });
  } catch (err: any) {
    console.error("[bulletin/campaign GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
