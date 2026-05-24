import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  // Verify quote belongs to this company
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });

  // Mark as paid
  await supabaseAdmin
    .from("quotes")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", quoteId);

  return NextResponse.json({ ok: true });
}
