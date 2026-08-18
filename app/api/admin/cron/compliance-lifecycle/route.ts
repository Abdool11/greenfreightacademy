import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

const stages = [30, 14, 7, 1] as const;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.ENABLE_R7_LIFECYCLE_CRON !== "true") return NextResponse.json({ error: "Compliance lifecycle is disabled for this release." }, { status: 503 });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let remindersSent = 0;

  const { data: profiles } = await supabaseAdmin.from("company_compliance_profiles")
    .select("company_id, safety_manager_name, safety_manager_email, annual_review_enabled")
    .eq("annual_review_enabled", true).not("safety_manager_email", "is", null);

  for (const profile of profiles ?? []) {
    for (const days of stages) {
      const due = new Date(today); due.setDate(due.getDate() + days);
      const date = due.toISOString().slice(0, 10);
      const { data: reviews } = await supabaseAdmin.from("driver_competency_reviews")
        .select("id, driver_id, next_review_due_at, drivers(first_name,last_name)")
        .eq("company_id", profile.company_id).eq("next_review_due_at", date);
      for (const review of reviews ?? []) {
        const { data: logged } = await supabaseAdmin.from("reporting_alert_log").select("id")
          .eq("company_id", profile.company_id).eq("driver_id", review.driver_id)
          .eq("alert_type", "annual_competency_review").eq("alert_stage", String(days)).eq("due_date", date).maybeSingle();
        if (logged) continue;
        const driver = review.drivers as unknown as { first_name?: string; last_name?: string } | null;
        const driverName = `${driver?.first_name ?? "Driver"} ${driver?.last_name ?? ""}`.trim();
        await sendEmail({
          from: process.env.BREVO_FROM_EMAIL || "noreply@greenfreightacademy.co.za", fromName: "Green Freight Academy",
          to: profile.safety_manager_email!, subject: `Annual driver competency review due in ${days} day${days === 1 ? "" : "s"}`,
          text: `${driverName} is due for an annual RTMS competency review on ${date}. This is not a certificate expiry. Please assign qualifying CPD or refresher training.`,
          html: `<p>Hello ${profile.safety_manager_name || "Safety Manager"},</p><p><strong>${driverName}</strong> is due for an annual RTMS competency review on <strong>${date}</strong>.</p><p>This is not a certificate expiry. Please assign qualifying CPD or refresher training and retain the evidence in your Compliance &amp; Safety Reporting Centre.</p>`,
        });
        await supabaseAdmin.from("reporting_alert_log").insert({ company_id: profile.company_id, driver_id: review.driver_id, alert_type: "annual_competency_review", alert_stage: String(days), due_date: date });
        remindersSent++;
      }
    }
  }

  const expiredBefore = new Date(today); expiredBefore.setDate(expiredBefore.getDate() - 30);
  const { data: staleQuotes } = await supabaseAdmin.from("quotes").select("id")
    .in("status", ["draft", "sent", "pending"]).is("archived_at", null).lt("created_at", expiredBefore.toISOString());
  const ids = (staleQuotes ?? []).map(q => q.id);
  if (ids.length) await supabaseAdmin.from("quotes").update({ status: "expired", expired_at: new Date().toISOString(), archived_at: new Date().toISOString() }).in("id", ids);
  return NextResponse.json({ ok: true, remindersSent, expiredQuotes: ids.length });
}
