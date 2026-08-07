import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/company/transactions — client's own ledger + quotes
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: entries }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from("ledger_entries")
      .select("id, entry_type, amount, description, reference, status, created_at, quote_id, driver_count")
      .eq("company_id", session.companyId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("companies")
      .select("credit_balance, discount_percent")
      .eq("id", session.companyId)
      .single(),
  ]);

  return NextResponse.json({
    entries:       entries ?? [],
    creditBalance: Number(company?.credit_balance ?? 0),
    discount:      Number(company?.discount_percent ?? 0),
  });
}
