import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";

// GET /api/admin/leads — list all leads
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const search = url.searchParams.get("search");

  let query = supabaseAdmin
    .from("prospect_leads")
    .select(`
      id, company_name, contact_name, email, phone, notes,
      stage, source, created_at, last_activity_at,
      voucher_id, company_id,
      trial_vouchers(code, seats, status, activated_at),
      companies(id, name, account_type)
    `)
    .order("created_at", { ascending: false });

  if (stage) query = query.eq("stage", stage);
  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }

  return NextResponse.json({ leads: leads ?? [] });
}

// POST /api/admin/leads — import leads from Excel or add single lead
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const contentType = req.headers.get("content-type") ?? "";

  // Excel import
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in spreadsheet" }, { status: 400 });
    }

    const leads = rows.map((row) => ({
      company_name: (row["Company Name"] ?? row["company_name"] ?? "").toString().trim(),
      contact_name: (row["Contact Name"] ?? row["contact_name"] ?? "").toString().trim(),
      email: (row["Email"] ?? row["email"] ?? "").toString().trim().toLowerCase(),
      phone: (row["Phone"] ?? row["phone"] ?? "").toString().trim(),
      notes: (row["Notes"] ?? row["notes"] ?? "").toString().trim(),
      stage: "imported",
      source: "excel_import",
      created_by: session.adminId,
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })).filter((l) => l.company_name || l.email);

    if (leads.length === 0) {
      return NextResponse.json({ error: "No valid leads found. Check that your spreadsheet has Company Name, Contact Name, Email, Phone, Notes columns." }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("prospect_leads")
      .insert(leads)
      .select("id");

    if (insertError) {
      console.error("Lead import error:", insertError);
      return NextResponse.json({ error: "Import failed: " + insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imported: inserted?.length ?? 0 });
  }

  // Single lead
  const { companyName, contactName, email, phone, notes } = await req.json();

  if (!companyName && !email) {
    return NextResponse.json({ error: "Company name or email required" }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("prospect_leads")
    .insert({
      company_name: companyName?.trim() ?? "",
      contact_name: contactName?.trim() ?? "",
      email: email?.trim().toLowerCase() ?? "",
      phone: phone?.trim() ?? null,
      notes: notes?.trim() ?? null,
      stage: "imported",
      source: "manual",
      created_by: session.adminId,
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (leadError) {
    return NextResponse.json({ error: "Failed to add lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead });
}

// PATCH /api/admin/leads — update lead stage or add note
export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { leadId, stage, notes, assignedTo } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const updates: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
  if (stage) updates.stage = stage;
  if (notes !== undefined) updates.notes = notes;
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;

  const { error } = await supabaseAdmin
    .from("prospect_leads")
    .update(updates)
    .eq("id", leadId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GET /api/admin/leads?template=1 — download Excel template
export async function HEAD() {
  // Returns headers only — used to check if template endpoint exists
  return new NextResponse(null, { status: 200 });
}
