import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * WhatsApp Webhook Handler
 *
 * GET  — Meta verification challenge (required when you subscribe the webhook)
 * POST — Receives delivery status updates and inbound messages
 *
 * This endpoint handles:
 *   • Meta webhook verification (GET with hub.mode=subscribe)
 *   • Message delivery status (sent, delivered, read)
 *   • Inbound "STOP" opt-out requests from drivers
 *   • Inbound replies (logged for support review)
 */

// ─── GET: Meta Verification Challenge ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WA_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[WhatsApp Webhook] META_WA_VERIFY_TOKEN not set in .env.local");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Meta verification successful");
    // Meta expects the raw challenge string back, not JSON
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("[WhatsApp Webhook] Meta verification failed", { mode, token });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: Receive WhatsApp Events ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log every event (useful for debugging)
    console.log("[WhatsApp Webhook] Event received:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return NextResponse.json({ ok: true });
    }

    // ── 1. Message Status Updates (sent, delivered, read, failed) ───────────
    const statuses = value.statuses ?? [];
    for (const status of statuses) {
      const {
        id: messageId,
        status: deliveryStatus,
        timestamp,
        recipient_id: recipientPhone,
        errors,
      } = status;

      console.log(`[WhatsApp Webhook] Status: ${deliveryStatus} | Msg: ${messageId} | To: ${recipientPhone}`);

      if (errors) {
        console.error("[WhatsApp Webhook] Delivery error:", JSON.stringify(errors));
      }

      // Optionally store delivery status in Supabase for analytics
      // await supabaseAdmin.from("whatsapp_delivery_log").insert({...});
    }

    // ── 2. Inbound Messages from Drivers ────────────────────────────────────
    const messages = value.messages ?? [];
    for (const msg of messages) {
      const {
        id: messageId,
        from: senderPhone,
        timestamp,
        type,
        text,
        button,
        interactive,
      } = msg;

      const bodyText = text?.body?.toLowerCase().trim() ?? "";

      console.log(`[WhatsApp Webhook] Inbound: ${type} from ${senderPhone} | "${bodyText}"`);

      // Handle STOP opt-out
      if (bodyText === "stop" || bodyText === "unsubscribe") {
        await handleOptOut(senderPhone);
        // Send opt-out confirmation (plain text — no template needed for replies)
        await sendOptOutConfirmation(senderPhone);
        continue;
      }

      // Log inbound message for support review
      // await supabaseAdmin.from("whatsapp_inbound_messages").insert({...});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error processing event:", err);
    // Always return 200 to Meta so they don't retry forever
    return NextResponse.json({ ok: true });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function handleOptOut(phone: string) {
  // Normalise to E.164 (Meta sends with +, our DB stores without)
  const normalised = phone.replace(/^\+/, "");

  // Mark driver as opted out
  const { error } = await supabaseAdmin
    .from("drivers")
    .update({ whatsapp_opted_out: true, whatsapp_opted_out_at: new Date().toISOString() })
    .eq("mobile", normalised);

  if (error) {
    console.error("[WhatsApp Webhook] Failed to record opt-out:", error);
  } else {
    console.log(`[WhatsApp Webhook] Driver ${normalised} opted out of WhatsApp messages`);
  }
}

async function sendOptOutConfirmation(phone: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) return;

  try {
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: "You have been unsubscribed from BetterDriver WhatsApp messages. Reply START to resubscribe.",
        },
      }),
    });
  } catch (e) {
    console.error("[WhatsApp Webhook] Failed to send opt-out confirmation:", e);
  }
}
