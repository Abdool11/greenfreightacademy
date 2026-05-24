import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/programmes — list all programmes
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programmes: data });
}

// POST /api/admin/programmes — create a new programme
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const {
    name, slug, description, price_corporate, price_model,
    duration_weeks, module_count, cpd_frequency, audience,
    moodle_course_id, status,
  } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert({
      name,
      slug,
      description: description || null,
      price_corporate: price_corporate ? Number(price_corporate) : null,
      price_model: price_model || "per_driver_per_month",
      duration_weeks: duration_weeks ? Number(duration_weeks) : null,
      module_count: module_count ? Number(module_count) : 12,
      cpd_frequency: cpd_frequency || "quarterly",
      audience: audience || "drivers",
      moodle_course_id: moodle_course_id || null,
      status: status || "active",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A programme with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the action
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "programme_created",
    details: { programme_id: data.id, name: data.name },
  }).catch(() => {});

  return NextResponse.json({ programme: data }, { status: 201 });
}

// PATCH /api/admin/programmes — update a programme
export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Sanitise numeric fields
  if (updates.price_corporate !== undefined) updates.price_corporate = updates.price_corporate ? Number(updates.price_corporate) : null;
  if (updates.duration_weeks !== undefined) updates.duration_weeks = updates.duration_weeks ? Number(updates.duration_weeks) : null;
  if (updates.module_count !== undefined) updates.module_count = updates.module_count ? Number(updates.module_count) : null;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "programme_updated",
    details: { programme_id: id, changes: Object.keys(updates) },
  }).catch(() => {});

  return NextResponse.json({ programme: data });
}

// DELETE /api/admin/programmes — archive (soft-delete) a programme
export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Check if programme has active enrolments
  const { count } = await supabaseAdmin
    .from("enrolments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id)
    .in("status", ["pending", "active"]);

  if (count && count > 0) {
    // Soft-delete: archive instead of delete
    const { error } = await supabaseAdmin
      .from("courses")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Programme archived (has active enrolments)" });
  }

  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "programme_deleted",
    details: { programme_id: id },
  }).catch(() => {});

  return NextResponse.json({ message: "Programme deleted" });
}
