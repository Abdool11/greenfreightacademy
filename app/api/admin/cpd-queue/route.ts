import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/cpd-queue
// Returns all cpd_library_items with status pending_review, with bulletin details
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "pending_review";

  const { data, error } = await supabaseAdmin
    .from("cpd_library_items")
    .select(`
      id,
      bulletin_id,
      company_id,
      title,
      category,
      description,
      why_relevant,
      source_company_name,
      shared_anonymously,
      image_urls,
      status,
      is_urgent_contribution,
      admin_notes,
      reviewed_by,
      reviewed_at,
      created_at,
      bulletins (
        id,
        urgency,
        mitigation_message,
        driver_action,
        date_observed,
        supporting_file_url
      )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[cpd-queue GET]", error);
    return NextResponse.json({ error: "Failed to fetch CPD queue" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

// POST /api/admin/cpd-queue
// Body: { item_id: string, action: "approve" | "reject", admin_notes?: string }
// approve → status = "approved", item becomes available for quarterly CPD bulletin
// reject  → status = "rejected", company is notified
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { item_id, action, admin_notes } = await req.json();

  if (!item_id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "item_id and action (approve|reject) required" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data: item, error: fetchErr } = await supabaseAdmin
    .from("cpd_library_items")
    .select("id, status, title, company_id")
    .eq("id", item_id)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.status !== "pending_review") {
    return NextResponse.json({ error: "Item is not pending review" }, { status: 409 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("cpd_library_items")
    .update({
      status: newStatus,
      admin_notes: admin_notes || null,
      reviewed_by: session.adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", item_id);

  if (updateErr) {
    console.error("[cpd-queue POST]", updateErr);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }

  // Audit log
  supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: `cpd_library_${action}`,
    target_type: "cpd_library_items",
    target_id: item_id,
    details: JSON.stringify({ title: item.title, admin_notes }),
    created_at: new Date().toISOString(),
  }).then(() => {});

  return NextResponse.json({ ok: true, status: newStatus });
}
