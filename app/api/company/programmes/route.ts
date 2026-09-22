import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const LAUNCH_PROGRAMME_SLUGS = ["ptdp", "professional-truck-driver"];

/**
 * The authenticated catalogue deliberately exposes only the approved launch
 * programme. Future programmes remain in the database for authorised GFA
 * product configuration, but cannot be selected for a new client quotation.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, name, slug, description, price_corporate, price_individual, price_model, duration_weeks, module_count, audience")
    .in("slug", LAUNCH_PROGRAMME_SLUGS)
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("available", true)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // `programmes` is retained for existing dashboard consumers; `courses` makes
  // the catalogue meaning explicit for new callers.
  return NextResponse.json({ programmes: data ?? [], courses: data ?? [] });
}
