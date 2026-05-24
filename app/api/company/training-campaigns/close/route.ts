import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST: close a training campaign and refund credits for non-completers ────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaign_id } = await req.json() as { campaign_id: string };
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  // Verify campaign belongs to this company and is active
  const { data: campaign, error: campaignErr } = await supabaseAdmin
    .from("training_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .eq("company_id", session.companyId)
    .single();

  if (campaignErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "active") {
    return NextResponse.json({ error: "Campaign is not active" }, { status: 400 });
  }

  // Find all outstanding enrolments (not completed/certified) in this campaign
  const { data: outstanding, error: enrolErr } = await supabaseAdmin
    .from("enrolments")
    .select(`
      id, status, certified, progress_percent,
      courses(id, name, price_corporate)
    `)
    .eq("campaign_id", campaign_id)
    .eq("company_id", session.companyId)
    .not("status", "in", '("completed","certified")');

  if (enrolErr) return NextResponse.json({ error: enrolErr.message }, { status: 500 });

  const outstandingEnrolments = outstanding ?? [];

  // Calculate refund: full course price for non-starters, 50% for in-progress
  let totalRefund = 0;
  for (const enrolment of outstandingEnrolments) {
    const course = enrolment.courses as { price_corporate?: number } | null;
    const price = course?.price_corporate ?? 0;
    const progress = enrolment.progress_percent ?? 0;
    // Non-starters (0% progress) get a full refund; in-progress get 50%
    const refundAmount = progress === 0 ? price : Math.round(price * 0.5 * 100) / 100;
    totalRefund += refundAmount;
  }

  // Mark outstanding enrolments as expired
  if (outstandingEnrolments.length > 0) {
    await supabaseAdmin
      .from("enrolments")
      .update({ status: "expired" })
      .in("id", outstandingEnrolments.map((e) => e.id));
  }

  // Add credits to company balance
  if (totalRefund > 0) {
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("credit_balance")
      .eq("id", session.companyId)
      .single();

    const currentBalance = (company?.credit_balance ?? 0) as number;
    await supabaseAdmin
      .from("companies")
      .update({ credit_balance: currentBalance + totalRefund })
      .eq("id", session.companyId);
  }

  // Close the campaign
  await supabaseAdmin
    .from("training_campaigns")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      refunded_credits: totalRefund,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign_id);

  return NextResponse.json({
    ok: true,
    outstanding_count: outstandingEnrolments.length,
    refunded_credits: totalRefund,
  });
}
