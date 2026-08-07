import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/settings/notifications — fetch prefs + recipients
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const [{ data: prefs }, { data: config }] = await Promise.all([
    supabaseAdmin
      .from("admin_notification_prefs")
      .select("*")
      .order("group_name")
      .order("event_key"),
    supabaseAdmin
      .from("site_config")
      .select("key, value")
      .in("key", ["admin_whatsapp_1", "admin_whatsapp_2", "email_booking_to", "admin_email_2"]),
  ]);

  const recipients: Record<string, string> = {};
  (config ?? []).forEach((r: { key: string; value: string }) => {
    recipients[r.key] = r.value ?? "";
  });

  return NextResponse.json({ prefs: prefs ?? [], recipients });
}

// POST /api/admin/settings/notifications — save prefs + recipients
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { prefs, recipients } = await req.json();

  // Save notification preferences
  if (Array.isArray(prefs)) {
    for (const pref of prefs) {
      await supabaseAdmin
        .from("admin_notification_prefs")
        .update({
          whatsapp_1: Boolean(pref.whatsapp_1),
          whatsapp_2: Boolean(pref.whatsapp_2),
          email_1:    Boolean(pref.email_1),
          email_2:    Boolean(pref.email_2),
          updated_at: new Date().toISOString(),
        })
        .eq("event_key", pref.event_key);
    }
  }

  // Save recipient addresses
  if (recipients && typeof recipients === "object") {
    const recipientKeys = ["admin_whatsapp_1", "admin_whatsapp_2", "admin_email_2"];
    for (const key of recipientKeys) {
      if (key in recipients) {
        await supabaseAdmin
          .from("site_config")
          .upsert({ key, value: recipients[key] ?? "", description: `Admin notification recipient: ${key}` }, { onConflict: "key" });
      }
    }
    // email_booking_to is the primary email — update it too if provided
    if ("email_booking_to" in recipients) {
      await supabaseAdmin
        .from("site_config")
        .upsert({ key: "email_booking_to", value: recipients.email_booking_to ?? "" }, { onConflict: "key" });
    }
  }

  return NextResponse.json({ ok: true });
}

// POST /api/admin/settings/notifications/test — send a test notification
export async function PUT(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { event_key } = await req.json();
  if (!event_key) return NextResponse.json({ error: "event_key required" }, { status: 400 });

  const { adminNotify } = await import("@/lib/adminNotify");
  await adminNotify(event_key as Parameters<typeof adminNotify>[0], {
    message: `This is a test notification for the "${event_key}" event.`,
    details: {
      "Triggered by": session.name ?? session.email,
      "Test mode":    "Yes",
      "Timestamp":    new Date().toLocaleString("en-ZA"),
    },
  });

  return NextResponse.json({ ok: true });
}
