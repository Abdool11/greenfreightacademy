import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/admin/cpd-queue
// Returns GFA CPD library items by review status, with their originating bulletin.
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "pending_review";
  if (!["pending_review", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Unsupported CPD queue status." }, { status: 400 });
  }

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
// The Release 15 procedure updates the item and writes administrator audit
// evidence in one transaction.
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { item_id: itemId, action, admin_notes: adminNotes } = await req.json();
  if (typeof itemId !== "string" || !UUID_PATTERN.test(itemId) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "A valid item_id and action (approve|reject) are required." }, { status: 400 });
  }

  const { data: decisionRows, error } = await supabaseAdmin.rpc("gfa_apply_cpd_library_decision", {
    p_item_id: itemId,
    p_action: action,
    p_admin_id: session.adminId,
    p_admin_name: session.email || session.name || session.adminId,
    p_admin_notes: typeof adminNotes === "string" ? adminNotes.trim() || null : null,
  });
  const decision = Array.isArray(decisionRows) ? decisionRows[0] : decisionRows;

  if (error || !decision?.item_id) {
    const message = error?.message || "Failed to update CPD queue item.";
    if (/not found/i.test(message)) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (/not pending|pending review/i.test(message)) return NextResponse.json({ error: "Item is not pending review" }, { status: 409 });
    console.error("[cpd-queue POST]", error);
    return NextResponse.json({ error: "Failed to update CPD queue item." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: decision.status, auditId: decision.audit_id });
}
