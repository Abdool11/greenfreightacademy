import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/finance?tab=overview|transactions|pending|client&company_id=...
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const tab       = req.nextUrl.searchParams.get("tab") ?? "overview";
  const companyId = req.nextUrl.searchParams.get("company_id");
  const from      = req.nextUrl.searchParams.get("from");
  const to        = req.nextUrl.searchParams.get("to");

  if (tab === "overview") {
    const now   = new Date();
    const m0    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const m1    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [
      { data: paidQuotes },
      { data: eftPending },
      { data: quotePending },
      { data: monthRevenue },
      { count: totalCompanies },
    ] = await Promise.all([
      supabaseAdmin.from("quotes").select("total, paid_at, payment_method").in("status", ["paid", "approved", "deployed"]),
      supabaseAdmin.from("quotes").select("id, reference, total, eft_submitted_at, companies(name, contact_email)").eq("status", "eft_submitted").order("eft_submitted_at"),
      supabaseAdmin.from("quotes").select("id, reference, total, created_at, companies(name, contact_email)").eq("status", "pending").order("created_at"),
      supabaseAdmin.from("quotes").select("total").in("status", ["paid", "approved", "deployed"]).gte("paid_at", m0).lte("paid_at", m1),
      supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const totalRevenue    = (paidQuotes ?? []).reduce((s, q) => s + Number(q.total ?? 0), 0);
    const monthlyRevenue  = (monthRevenue ?? []).reduce((s, q) => s + Number(q.total ?? 0), 0);
    const paystackRevenue = (paidQuotes ?? []).filter(q => q.payment_method === "paystack").reduce((s, q) => s + Number(q.total ?? 0), 0);
    const eftRevenue      = (paidQuotes ?? []).filter(q => q.payment_method === "eft").reduce((s, q) => s + Number(q.total ?? 0), 0);

    return NextResponse.json({
      totalRevenue,
      monthlyRevenue,
      paystackRevenue,
      eftRevenue,
      eftPendingCount:   (eftPending ?? []).length,
      quotePendingCount: (quotePending ?? []).length,
      totalCompanies:    totalCompanies ?? 0,
      eftPending:        eftPending ?? [],
      quotePending:      quotePending ?? [],
    });
  }

  if (tab === "transactions") {
    let query = supabaseAdmin
      .from("ledger_entries")
      .select("*, companies(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (companyId) query = query.eq("company_id", companyId);
    if (from)      query = query.gte("created_at", from);
    if (to)        query = query.lte("created_at", to + "T23:59:59Z");
    const { data: entries } = await query;
    return NextResponse.json({ entries: entries ?? [] });
  }

  if (tab === "pending") {
    const [{ data: eftQuotes }, { data: staleQuotes }] = await Promise.all([
      supabaseAdmin
        .from("quotes")
        .select("id, reference, total, eft_submitted_at, eft_reference, companies(id, name, contact_email)")
        .eq("status", "eft_submitted")
        .order("eft_submitted_at"),
      supabaseAdmin
        .from("quotes")
        .select("id, reference, total, created_at, companies(id, name, contact_email)")
        .eq("status", "pending")
        .order("created_at"),
    ]);
    return NextResponse.json({ eftQuotes: eftQuotes ?? [], staleQuotes: staleQuotes ?? [] });
  }

  if (tab === "client" && companyId) {
    const [{ data: company }, { data: entries }, { data: quotes }, { data: drivers }] = await Promise.all([
      supabaseAdmin.from("companies").select("id, name, contact_email, contact_phone, credit_balance, account_type, created_at, discount_percent").eq("id", companyId).single(),
      supabaseAdmin.from("ledger_entries").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabaseAdmin.from("quotes").select("id, reference, total, status, payment_method, created_at, paid_at, deployed_at, line_items").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabaseAdmin.from("drivers").select("id, first_name, last_name, mobile, activation_status", { count: "exact" }).eq("company_id", companyId),
    ]);
    return NextResponse.json({ company, entries: entries ?? [], quotes: quotes ?? [], driverCount: (drivers ?? []).length });
  }

  return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
}
