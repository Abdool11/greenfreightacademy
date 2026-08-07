import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { adminNotify } from "@/lib/adminNotify";

/**
 * GET /api/admin/cron/stale-check
 * ─────────────────────────────────────────────────────────────────────────────
 * Called by Vercel Cron every 2 hours.
 * Checks for:
 *   1. Quotes in 'pending' status for >24 hours (unpaid)
 *   2. Quotes in 'eft_submitted' status for >48 hours (unconfirmed EFT)
 *
 * Fires adminNotify for each stale item found, but only ONCE per item
 * (tracked in stale_alert_log to prevent duplicate alerts).
 *
 * Protected by CRON_SECRET header to prevent unauthorised triggering.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now          = new Date();
  const h24ago       = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const h48ago       = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  let alertsSent = 0;

  // ── 1. Quotes pending >24h ──────────────────────────────────────────────────
  const { data: staleQuotes } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, created_at, companies(name, contact_email)")
    .eq("status", "pending")
    .lt("created_at", h24ago);

  for (const q of staleQuotes ?? []) {
    // Check if we've already alerted for this quote
    const { data: existing } = await supabaseAdmin
      .from("stale_alert_log")
      .select("id")
      .eq("entity_id", q.id)
      .eq("alert_type", "quote_pending_24h")
      .single();

    if (existing) continue; // Already alerted

    const companyName = (q.companies as { name?: string } | null)?.name ?? "Unknown";
    const hoursOld    = Math.floor((now.getTime() - new Date(q.created_at).getTime()) / 3600000);

    await adminNotify("quote_pending_24h", {
      message: `Quote has been unpaid for ${hoursOld} hours — follow up with the client.`,
      actionUrl: "/admin/dashboard",
      details: {
        Company:   companyName,
        "Quote Ref": q.reference,
        Amount:    `R ${Number(q.total).toFixed(2)}`,
        Age:       `${hoursOld}h`,
      },
    });

    // Record that we've alerted
    await supabaseAdmin.from("stale_alert_log").insert({
      entity_type: "quote",
      entity_id:   q.id,
      alert_type:  "quote_pending_24h",
    }).on("conflict", "do-nothing" as never);

    alertsSent++;
  }

  // ── 2. EFT submissions pending >48h ────────────────────────────────────────
  const { data: staleEfts } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, eft_submitted_at, eft_reference, companies(name, contact_email)")
    .eq("status", "eft_submitted")
    .lt("eft_submitted_at", h48ago);

  for (const q of staleEfts ?? []) {
    const { data: existing } = await supabaseAdmin
      .from("stale_alert_log")
      .select("id")
      .eq("entity_id", q.id)
      .eq("alert_type", "eft_pending_48h")
      .single();

    if (existing) continue;

    const companyName = (q.companies as { name?: string } | null)?.name ?? "Unknown";
    const hoursOld    = Math.floor((now.getTime() - new Date(q.eft_submitted_at).getTime()) / 3600000);

    await adminNotify("eft_pending_48h", {
      message: `EFT payment has not been confirmed for ${hoursOld} hours — verify in your bank and approve.`,
      actionUrl: "/admin/finance?tab=pending",
      details: {
        Company:       companyName,
        "Quote Ref":   q.reference,
        Amount:        `R ${Number(q.total).toFixed(2)}`,
        "EFT Ref":     q.eft_reference ?? "—",
        "Waiting":     `${hoursOld}h`,
      },
    });

    await supabaseAdmin.from("stale_alert_log").insert({
      entity_type: "eft",
      entity_id:   q.id,
      alert_type:  "eft_pending_48h",
    }).on("conflict", "do-nothing" as never);

    alertsSent++;
  }

  return NextResponse.json({
    ok: true,
    alertsSent,
    staleQuotes: (staleQuotes ?? []).length,
    staleEfts:   (staleEfts ?? []).length,
    checkedAt:   now.toISOString(),
  });
}
