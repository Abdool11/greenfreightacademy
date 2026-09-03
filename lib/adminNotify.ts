/**
 * adminNotify — GFA Admin Notification Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends WhatsApp and/or email notifications to configured admin recipients
 * based on the per-event preferences stored in admin_notification_prefs.
 *
 * SAFETY: This is a NEW file. It does not import from or modify any existing
 * route. Existing routes call it with a single await line — if this function
 * throws, the error is caught internally and never propagates to the caller.
 *
 * Usage:
 *   import { adminNotify } from "@/lib/adminNotify";
 *   await adminNotify("eft_submitted", "EFT from Horizon Freight — R2850", "/admin/dashboard");
 */

import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export type AdminEventKey =
  | "company_registered"
  | "quote_generated"
  | "eft_submitted"
  | "payment_received_paystack"
  | "payment_received_eft"
  | "training_deployed"
  | "trial_activated"
  | "driver_certified"
  | "bulletin_payment_received"
  | "quote_pending_24h"
  | "eft_pending_48h"
  | "discount_requested"
  | "discount_approved";

interface NotifyOptions {
  /** Short summary for WhatsApp (plain text, max ~300 chars) */
  message: string;
  /** Optional deep-link for the admin to take action */
  actionUrl?: string;
  /** Optional structured detail lines shown in the WhatsApp message */
  details?: Record<string, string>;
}

// ─── Internal: send a WhatsApp message to an admin number ────────────────────
async function sendAdminWhatsApp(
  toNumber: string,
  text: string,
  phoneId: string,
  accessToken: string
): Promise<boolean> {
  if (!toNumber || !phoneId || !accessToken) return false;
  // Normalise number — strip spaces, dashes, leading +
  const to = toNumber.replace(/[\s\-+]/g, "");
  if (to.length < 10) return false;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Internal: build a formatted WhatsApp message ────────────────────────────
function buildWhatsAppMessage(
  label: string,
  message: string,
  details?: Record<string, string>,
  actionUrl?: string
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenfreightacademy.co.za";
  let text = `🔔 *GFA Admin Alert*\n*${label}*\n\n${message}`;
  if (details && Object.keys(details).length > 0) {
    text += "\n\n" + Object.entries(details).map(([k, v]) => `• ${k}: ${v}`).join("\n");
  }
  if (actionUrl) {
    text += `\n\n👉 ${siteUrl}${actionUrl}`;
  }
  return text;
}

// ─── Internal: log a notification attempt ────────────────────────────────────
async function logNotification(
  eventKey: string,
  channel: string,
  recipient: string,
  messagePreview: string,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    await supabaseAdmin.from("admin_notification_log").insert({
      event_key: eventKey,
      channel,
      recipient,
      message_preview: messagePreview.slice(0, 200),
      status,
      error_message: errorMessage ?? null,
    });
  } catch {
    // Non-blocking — log failure silently
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function adminNotify(
  eventKey: AdminEventKey,
  options: NotifyOptions | string,
  actionUrl?: string
): Promise<void> {
  // Normalise overloaded signature
  const opts: NotifyOptions =
    typeof options === "string"
      ? { message: options, actionUrl }
      : options;

  try {
    // 1. Load notification preferences for this event
    const { data: pref } = await supabaseAdmin
      .from("admin_notification_prefs")
      .select("label, whatsapp_1, whatsapp_2, email_1, email_2")
      .eq("event_key", eventKey)
      .single();

    if (!pref) return; // Event not configured — silently skip

    // 2. Load recipient addresses
    const config = await getConfigs([
      "admin_whatsapp_1",
      "admin_whatsapp_2",
      "email_booking_to",   // email_1
      "admin_email_2",
      "whatsapp_phone_id",
      "whatsapp_access_token",
    ]);

    const recipients = {
      whatsapp_1: config.admin_whatsapp_1 ?? "",
      whatsapp_2: config.admin_whatsapp_2 ?? "",
      email_1:    config.email_booking_to ?? "",
      email_2:    config.admin_email_2 ?? "",
    };

    const phoneId     = config.whatsapp_phone_id ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
    const accessToken = config.whatsapp_access_token ?? process.env.WHATSAPP_ACCESS_TOKEN ?? "";

    const waText = buildWhatsAppMessage(pref.label, opts.message, opts.details, opts.actionUrl);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenfreightacademy.co.za";

    // 3. Send WhatsApp 1
    if (pref.whatsapp_1 && recipients.whatsapp_1) {
      const ok = await sendAdminWhatsApp(recipients.whatsapp_1, waText, phoneId, accessToken);
      await logNotification(eventKey, "whatsapp_1", recipients.whatsapp_1, waText, ok ? "sent" : "failed");
    }

    // 4. Send WhatsApp 2
    if (pref.whatsapp_2 && recipients.whatsapp_2) {
      const ok = await sendAdminWhatsApp(recipients.whatsapp_2, waText, phoneId, accessToken);
      await logNotification(eventKey, "whatsapp_2", recipients.whatsapp_2, waText, ok ? "sent" : "failed");
    }

    // 5. Send Email 1
    if (pref.email_1 && recipients.email_1 && process.env.BREVO_SMTP_PASSWORD) {
      const subject = `GFA Alert — ${pref.label}`;
      const html = buildEmailHtml(pref.label, opts.message, opts.details, opts.actionUrl, siteUrl);
      try {
        await sendEmail({
          from: "abdool@transportactiongroup.co.za",
          fromName: "GFA Platform",
          to: recipients.email_1,
          subject,
          html,
          text: waText,
        });
        await logNotification(eventKey, "email_1", recipients.email_1, opts.message, "sent");
      } catch (err) {
        await logNotification(eventKey, "email_1", recipients.email_1, opts.message, "failed", String(err));
      }
    }

    // 6. Send Email 2
    if (pref.email_2 && recipients.email_2 && process.env.BREVO_SMTP_PASSWORD) {
      const subject = `GFA Alert — ${pref.label}`;
      const html = buildEmailHtml(pref.label, opts.message, opts.details, opts.actionUrl, siteUrl);
      try {
        await sendEmail({
          from: "abdool@transportactiongroup.co.za",
          fromName: "GFA Platform",
          to: recipients.email_2,
          subject,
          html,
          text: waText,
        });
        await logNotification(eventKey, "email_2", recipients.email_2, opts.message, "sent");
      } catch (err) {
        await logNotification(eventKey, "email_2", recipients.email_2, opts.message, "failed", String(err));
      }
    }
  } catch (err) {
    // Never propagate — notification failure must never break the calling route
    console.error("[adminNotify] Error:", eventKey, err);
  }
}

// ─── Internal: build a branded HTML email ────────────────────────────────────
function buildEmailHtml(
  label: string,
  message: string,
  details?: Record<string, string>,
  actionUrl?: string,
  siteUrl?: string
): string {
  const detailRows = details
    ? Object.entries(details)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px;color:#6b7280;width:40%">${k}</td>` +
            `<td style="padding:6px 12px;font-weight:600">${v}</td></tr>`
        )
        .join("")
    : "";

  const actionBtn = actionUrl
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${siteUrl}${actionUrl}"
            style="background:#22c55e;color:#000;padding:12px 28px;border-radius:8px;
                   text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
           Take Action →
         </a>
       </div>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="color:#22c55e;margin:0;font-size:18px">🔔 GFA Admin Alert</h2>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:14px">${label}</p>
      </div>
      <div style="background:#111f3a;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 16px">${message}</p>
        ${detailRows ? `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;background:#0a1628;border-radius:8px">${detailRows}</table>` : ""}
        ${actionBtn}
        <p style="color:#475569;font-size:12px;margin:16px 0 0;text-align:center">
          GreenFreightAcademy Platform — automated alert
        </p>
      </div>
    </div>`;
}

// ─── Ledger helper — write a ledger entry ────────────────────────────────────
export async function writeLedgerEntry(entry: {
  company_id: string;
  entry_type: string;
  amount: number;
  description: string;
  reference?: string;
  quote_id?: string;
  invoice_id?: string;
  payment_id?: string;
  driver_count?: number;
  programme_slug?: string;
  status?: string;
  created_by?: string;
  balance_after?: number;
}): Promise<void> {
  try {
    await supabaseAdmin.from("ledger_entries").insert({
      company_id:     entry.company_id,
      entry_type:     entry.entry_type,
      amount:         entry.amount,
      description:    entry.description,
      reference:      entry.reference ?? null,
      quote_id:       entry.quote_id ?? null,
      invoice_id:     entry.invoice_id ?? null,
      payment_id:     entry.payment_id ?? null,
      driver_count:   entry.driver_count ?? 0,
      programme_slug: entry.programme_slug ?? null,
      status:         entry.status ?? "confirmed",
      created_by:     entry.created_by ?? "system",
      balance_after:  entry.balance_after ?? null,
    });
  } catch (err) {
    // Non-blocking — ledger write failure must never break the calling route
    console.error("[writeLedgerEntry] Error:", err);
  }
}
