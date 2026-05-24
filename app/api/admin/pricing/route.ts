import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/pricing — fetch all course prices
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { data: courses, error } = await supabaseAdmin
    .from("courses")
    .select("id, name, slug, price_corporate, price_individual, available, description")
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }

  return NextResponse.json({ courses: courses ?? [] });
}

// PATCH /api/admin/pricing — update a course price
export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { courseId, price_corporate, price_individual, available } = await req.json();

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (price_corporate !== undefined) updates.price_corporate = Number(price_corporate);
  if (price_individual !== undefined) updates.price_individual = Number(price_individual);
  if (available !== undefined) updates.available = Boolean(available);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("courses")
    .update(updates)
    .eq("id", courseId)
    .select("id, name, price_corporate, price_individual, available")
    .single();

  if (error) {
    console.error("Pricing update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Log the price change for audit trail
  supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "pricing_update",
    target_type: "course",
    target_id: courseId,
    details: JSON.stringify(updates),
    created_at: new Date().toISOString(),
  }).then(() => {}); // non-blocking

  return NextResponse.json({ ok: true, course: data });
}
