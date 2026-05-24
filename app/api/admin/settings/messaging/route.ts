import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const TEMPLATE_KEYS = [
  "whatsapp_welcome_template",
  "whatsapp_reminder_template",
  "whatsapp_bulletin_template",
  "whatsapp_cpd_template",
  "whatsapp_certificate_template",
  "whatsapp_trial_template",
  "messaging_default_channel",
];

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("site_config")
    .select("key, value")
    .in("key", TEMPLATE_KEYS);

  const result: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => {
    result[row.key] = row.value;
  });

  return NextResponse.json({
    templates: result,
    channel: result["messaging_default_channel"] ?? "both",
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templates, channel } = await req.json();

  const upserts = [
    ...Object.entries(templates as Record<string, string>).map(([key, value]) => ({
      key,
      value,
      description: `Messaging template: ${key}`,
    })),
    {
      key: "messaging_default_channel",
      value: channel,
      description: "Default messaging channel: both | whatsapp | email",
    },
  ];

  for (const item of upserts) {
    await supabaseAdmin
      .from("site_config")
      .upsert(item, { onConflict: "key" });
  }

  return NextResponse.json({ ok: true });
}
