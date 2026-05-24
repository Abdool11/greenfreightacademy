import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// ─── GET: list all training campaigns for the logged-in company ───────────────
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaigns, error } = await supabaseAdmin
    .from("training_campaigns")
    .select("*")
    .eq("company_id", session.companyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each campaign, aggregate enrolment stats
  const enriched = await Promise.all(
    (campaigns ?? []).map(async (campaign) => {
      const { data: enrolments } = await supabaseAdmin
        .from("enrolments")
        .select(`
          id, status, progress_percent, link_activated, certified,
          nudge_sent_at, enrolled_at, completed_at,
          hr_feedback_understanding, hr_feedback_enjoyment, hr_feedback_more_learning,
          hr_feedback_submitted_at,
          drivers(id, first_name, last_name, mobile, email),
          courses(id, name, slug)
        `)
        .eq("campaign_id", campaign.id);

      const all = enrolments ?? [];
      const total = all.length;
      const notStarted = all.filter((e) => !e.link_activated).length;
      const inProgress = all.filter((e) => e.link_activated && !e.certified && e.status !== "completed").length;
      const completed = all.filter((e) => e.certified || e.status === "completed").length;
      const outstanding = all.filter((e) => !e.certified && e.status !== "completed");

      // Average HR feedback scores (only from those who submitted)
      const withFeedback = all.filter((e) => e.hr_feedback_submitted_at);
      const avgFeedback = withFeedback.length > 0
        ? {
            understanding: Math.round(withFeedback.reduce((s, e) => s + (e.hr_feedback_understanding ?? 0), 0) / withFeedback.length * 10) / 10,
            enjoyment: Math.round(withFeedback.reduce((s, e) => s + (e.hr_feedback_enjoyment ?? 0), 0) / withFeedback.length * 10) / 10,
            more_learning: Math.round(withFeedback.reduce((s, e) => s + (e.hr_feedback_more_learning ?? 0), 0) / withFeedback.length * 10) / 10,
            count: withFeedback.length,
          }
        : null;

      // Days remaining
      const now = new Date();
      const end = campaign.end_date ? new Date(campaign.end_date) : null;
      const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
      const daysElapsed = campaign.start_date
        ? Math.floor((now.getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const progressPct = campaign.duration_days > 0
        ? Math.min(100, Math.round((daysElapsed / campaign.duration_days) * 100))
        : 0;

      return {
        ...campaign,
        stats: { total, notStarted, inProgress, completed, outstanding, avgFeedback },
        daysRemaining,
        daysElapsed,
        progressPct,
      };
    })
  );

  return NextResponse.json({ campaigns: enriched });
}

// ─── POST: create a new training campaign ────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, duration_days, enrolment_ids } = await req.json() as {
    name: string;
    duration_days: number;
    enrolment_ids: string[];
  };

  if (!name || !duration_days || !enrolment_ids || enrolment_ids.length === 0) {
    return NextResponse.json({ error: "name, duration_days, and enrolment_ids are required" }, { status: 400 });
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000);

  // Create campaign
  const { data: campaign, error: campaignErr } = await supabaseAdmin
    .from("training_campaigns")
    .insert({
      company_id: session.companyId,
      name,
      duration_days,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (campaignErr || !campaign) {
    return NextResponse.json({ error: campaignErr?.message ?? "Failed to create campaign" }, { status: 500 });
  }

  // Link enrolments to this campaign (only those belonging to this company)
  const { error: linkErr } = await supabaseAdmin
    .from("enrolments")
    .update({ campaign_id: campaign.id })
    .in("id", enrolment_ids)
    .eq("company_id", session.companyId);

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campaign });
}
