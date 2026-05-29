/**
 * PATCH  /api/admin/surveys/[id]  — update a survey question
 * DELETE /api/admin/surveys/[id]  — delete a survey question
 *
 * AUTH: Admin session required.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/auth";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dummy",
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Whitelist updatable fields
  const allowed = ["question_en", "question_zu", "question_type", "options_json", "order_index", "is_active"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("surveys")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json({ survey: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { error } = await supabase.from("surveys").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
