import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("credit_balance, account_type")
    .eq("id", session.companyId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count pending quotes (credits being purchased but not yet approved)
  const { count: pendingCredits } = await supabaseAdmin
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("company_id", session.companyId)
    .in("status", ["pending", "eft_submitted"]);

  return NextResponse.json({
    creditBalance: Number(company?.credit_balance ?? 0),
    pendingQuotes: pendingCredits ?? 0,
    accountType: company?.account_type ?? "full",
  });
}
