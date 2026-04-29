import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Keys stored in site_config for stats overrides
const STATS_KEYS = [
  "stats_companies_mode",       // "static" | "live"
  "stats_companies_static",     // number as string
  "stats_drivers_mode",         // "static" | "live"
  "stats_drivers_static",       // number as string
  "stats_certificates_mode",    // "static" | "live"
  "stats_certificates_static",  // number as string
  "stats_workshops_mode",       // "static" | "live"  (TAG-specific, managed here centrally)
  "stats_workshops_static",     // number as string
  "contact_email",              // editable contact email used across all three sites
];

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("site_config")
    .select("key, value")
    .in("key", STATS_KEYS);

  const result: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => {
    result[row.key] = row.value ?? "";
  });

  return NextResponse.json({ config: result });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { config } = body as { config: Record<string, string> };

  const upserts = Object.entries(config).map(([key, value]) => ({
    key,
    value,
    description: `Stats/contact config: ${key}`,
  }));

  const { error } = await supabaseAdmin
    .from("site_config")
    .upsert(upserts, { onConflict: "key" });

  if (error) {
    console.error("[Admin Stats] Save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
