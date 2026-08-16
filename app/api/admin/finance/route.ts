import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/admin/finance?tab=overview|transactions|pending|client&company_id=...
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const tab = req.nextUrl.searchParams.get("tab") ?? "overview";
  const companyId = req.nextUrl.searchParams.get("company_id");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const pendingEftQuery = () => supabaseAdmin
    .from("payments")
    .select("id, amount, eft_reference, eft_date, proof_url, proof_file_name, expected_amount_snapshot, variance_amount, reconciliation_status, reconciliation_notes, created_at, quotes(id, reference, total, companies(id, name, contact_email))")
    .in("status", ["pending_verification", "clarification_requested"])
    .eq("payment_method", "eft")
    .order("created_at", { ascending: true });

  if (tab === "overview") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const [{ data: paidQuotes }, { data: eftPending }, { data: quotePending }, { data: monthRevenue }, { count: totalCompanies }] = await Promise.all([
      supabaseAdmin.from("quotes").select("total, paid_at, payment_method").in("status", ["paid", "approved", "deployed"]),
      pendingEftQuery(),
      supabaseAdmin.from("quotes").select("id, reference, total, created_at, companies(id, name, contact_email)").eq("status", "pending").order("created_at"),
      supabaseAdmin.from("quotes").select("total").in("status", ["paid", "approved", "deployed"]).gte("paid_at", monthStart).lte("paid_at", monthEnd),
      supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const totalRevenue = (paidQuotes ?? []).reduce((sum, quote) => sum + Number(quote.total ?? 0), 0);
    const monthlyRevenue = (monthRevenue ?? []).reduce((sum, quote) => sum + Number(quote.total ?? 0), 0);
    const paystackRevenue = (paidQuotes ?? []).filter((quote) => quote.payment_method === "paystack").reduce((sum, quote) => sum + Number(quote.total ?? 0), 0);
    const eftRevenue = (paidQuotes ?? []).filter((quote) => quote.payment_method === "eft").reduce((sum, quote) => sum + Number(quote.total ?? 0), 0);

    return NextResponse.json({
      totalRevenue,
      monthlyRevenue,
      paystackRevenue,
      eftRevenue,
      eftPendingCount: (eftPending ?? []).length,
      quotePendingCount: (quotePending ?? []).length,
      totalCompanies: totalCompanies ?? 0,
      eftPending: eftPending ?? [],
      quotePending: quotePending ?? [],
    });
  }

  if (tab === "transactions") {
    let query = supabaseAdmin.from("ledger_entries").select("*, companies(name)").order("created_at", { ascending: false }).limit(200);
    if (companyId) query = query.eq("company_id", companyId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", `${to}T23:59:59Z`);
    const { data: entries } = await query;
    return NextResponse.json({ entries: entries ?? [] });
  }

  if (tab === "pending") {
    const [{ data: eftPayments }, { data: staleQuotes }] = await Promise.all([
      pendingEftQuery(),
      supabaseAdmin.from("quotes").select("id, reference, total, created_at, companies(id, name, contact_email)").eq("status", "pending").order("created_at"),
    ]);
    return NextResponse.json({ eftPayments: eftPayments ?? [], staleQuotes: staleQuotes ?? [] });
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
