import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/company/programmes — list active programmes for company users
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const programmes = (data ?? [])
    .filter((row: any) => row.status === "active" || row.is_active === true)
    .map((row: any) => ({
      id: row.id,
      name: row.name || row.title || "",
      slug: row.slug,
      module_count: row.module_count ?? 12,
      status: row.status || (row.is_active ? "active" : "archived"),
    }));

  return NextResponse.json({ programmes });
}
