import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
);

// GET — fetch bulletins for a driver (called from BetterDriver)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driver_id = searchParams.get("driver_id");
    if (!driver_id) {
      return NextResponse.json({ error: "driver_id required" }, { status: 400 });
    }

    const { data: interactions, error } = await supabase
      .from("driver_bulletin_interactions")
      .select(`
        *,
        bulletins (
          id, title, category, urgency, description,
          why_it_matters, mitigation_message, driver_action,
          disseminated_at, sla_deadline
        )
      `)
      .eq("driver_id", driver_id)
      .order("delivered_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ interactions: interactions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update driver interaction status (called from BetterDriver)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      interaction_id,
      driver_id,
      action, // 'open' | 'acknowledge' | 'submit_check' | 'submit_feedback'
      understanding_responses,
      feedback_comment,
      feedback_type,
    } = body;

    if (!interaction_id || !driver_id || !action) {
      return NextResponse.json({ error: "interaction_id, driver_id, and action required" }, { status: 400 });
    }

    // Fetch current interaction
    const { data: interaction, error: fetchErr } = await supabase
      .from("driver_bulletin_interactions")
      .select("*, bulletins(driver_action)")
      .eq("id", interaction_id)
      .eq("driver_id", driver_id)
      .single();

    if (fetchErr || !interaction) {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: now };

    if (action === "open" && interaction.status === "new") {
      updates.status = "opened";
      updates.opened_at = now;
    } else if (action === "acknowledge" && ["opened", "new"].includes(interaction.status)) {
      updates.status = "acknowledged";
      updates.acknowledged_at = now;
    } else if (action === "submit_check" && understanding_responses) {
      // Score the understanding check
      let driverAction: any = {};
      try {
        driverAction = JSON.parse(interaction.bulletins?.driver_action || "{}");
      } catch {}
      const questions = driverAction.understanding_questions || [];

      let correct = 0;
      const scoredResponses = (understanding_responses as any[]).map((r: any, idx: number) => {
        const q = questions[idx];
        const isCorrect = q ? r.selected_answer === q.correct_answer : null;
        if (isCorrect) correct++;
        return { ...r, is_correct: isCorrect };
      });

      const score = questions.length > 0
        ? Math.round((correct / questions.length) * 100)
        : 100;

      updates.status = "check_completed";
      updates.check_completed_at = now;
      updates.understanding_questions = questions;
      updates.understanding_responses = scoredResponses;
      updates.understanding_score = score;

      // If no feedback step, mark as completed
      if (!feedback_comment) {
        updates.status = "completed";
        updates.completed_at = now;
      }
    } else if (action === "submit_feedback") {
      updates.feedback_comment = feedback_comment;
      updates.feedback_type = feedback_type;
      updates.status = "completed";
      updates.completed_at = now;
    }

    const { error: updateErr } = await supabase
      .from("driver_bulletin_interactions")
      .update(updates)
      .eq("id", interaction_id);

    if (updateErr) throw updateErr;

    // Update campaign aggregate counts
    if (interaction.campaign_id) {
      const { data: allInteractions } = await supabase
        .from("driver_bulletin_interactions")
        .select("status, feedback_comment")
        .eq("campaign_id", interaction.campaign_id);

      const all = allInteractions || [];
      await supabase
        .from("bulletin_campaigns")
        .update({
          total_opened: all.filter((i) => ["opened", "acknowledged", "check_completed", "completed"].includes(i.status)).length,
          total_acknowledged: all.filter((i) => ["acknowledged", "check_completed", "completed"].includes(i.status)).length,
          total_check_completed: all.filter((i) => ["check_completed", "completed"].includes(i.status)).length,
          total_feedback_submitted: all.filter((i) => i.feedback_comment).length,
          updated_at: now,
        })
        .eq("id", interaction.campaign_id);
    }

    return NextResponse.json({ success: true, new_status: updates.status });
  } catch (err: any) {
    console.error("[bulletin/interactions PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
