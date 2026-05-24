import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: quotes, error } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, status, created_at, paid_at, deployed_at, line_items")
    .eq("company_id", session.companyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: quotes ?? [] });
}
