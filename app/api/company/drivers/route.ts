import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", session.companyId)
    .single();

  const { data: drivers, error } = await supabaseAdmin
    .from("drivers")
    .select(`
      id,
      first_name,
      last_name,
      mobile,
      alt_mobile,
      email,
      branch,
      region,
      status,
      created_at,
      enrolments(
        id,
        course_id,
        quote_id,
        campaign_id,
        status,
        progress_percent,
        progress_modules,
        link_activated,
        certified,
        nudge_sent_at,
        enrolled_at,
        completed_at,
        courses(id, name, slug, module_count, status)
      )
    `)
    .eq("company_id", session.companyId)
    .order("last_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drivers: drivers ?? [], companyName: company?.name ?? "" });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { driverId } = await req.json();
  await supabaseAdmin
    .from("drivers")
    .delete()
    .eq("id", driverId)
    .eq("company_id", session.companyId);

  return NextResponse.json({ ok: true });
}
