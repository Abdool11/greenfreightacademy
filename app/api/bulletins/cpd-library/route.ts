import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCompanyFromRequest } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
);

// GET — fetch CPD library entries for this company (and shared ones)
export async function GET(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    let query = supabase
      .from("cpd_library")
      .select("*")
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ entries: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update CPD library entry status (GFA admin action)
export async function PATCH(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id, status, gfa_notes } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (gfa_notes !== undefined) updates.gfa_notes = gfa_notes;

    const { error } = await supabase
      .from("cpd_library")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
