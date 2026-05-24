import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST: save HR self-evaluation feedback for a completed enrolment ─────────
// This endpoint is called from BetterDriver (or GFA dashboard) after a driver
// completes a course. It accepts a driver token or enrolment ID for auth.
export async function POST(req: NextRequest) {
  const {
    enrolment_id,
    driver_token,
    understanding,
    enjoyment,
    more_learning,
  } = await req.json() as {
    enrolment_id?: string;
    driver_token?: string;
    understanding: number;
    enjoyment: number;
    more_learning: number;
  };

  // Validate scores
  const scores = [understanding, enjoyment, more_learning];
  if (scores.some((s) => typeof s !== "number" || s < 1 || s > 5)) {
    return NextResponse.json({ error: "Each score must be an integer between 1 and 5" }, { status: 400 });
  }

  let resolvedEnrolmentId = enrolment_id;

  // If a driver_token is provided instead of enrolment_id, resolve via driver_invitations
  if (!resolvedEnrolmentId && driver_token) {
    const { data: invitation } = await supabaseAdmin
      .from("driver_invitations")
      .select("driver_id, company_id")
      .eq("token", driver_token)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Find the most recently completed enrolment for this driver
    const { data: enrolment } = await supabaseAdmin
      .from("enrolments")
      .select("id")
      .eq("driver_id", invitation.driver_id)
      .eq("company_id", invitation.company_id)
      .in("status", ["completed", "certified"])
      .is("hr_feedback_submitted_at", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!enrolment) {
      return NextResponse.json({ error: "No completed enrolment found awaiting feedback" }, { status: 404 });
    }

    resolvedEnrolmentId = enrolment.id;
  }

  if (!resolvedEnrolmentId) {
    return NextResponse.json({ error: "enrolment_id or driver_token required" }, { status: 400 });
  }

  // Save feedback
  const { error } = await supabaseAdmin
    .from("enrolments")
    .update({
      hr_feedback_understanding: understanding,
      hr_feedback_enjoyment: enjoyment,
      hr_feedback_more_learning: more_learning,
      hr_feedback_submitted_at: new Date().toISOString(),
    })
    .eq("id", resolvedEnrolmentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
