import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTransaction } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference } = await req.json();
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  // Find the quote by paystack_reference
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("id, status, total, company_id, reference, paystack_reference")
    .eq("paystack_reference", reference)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Already paid or deployed — no need to verify again
  if (quote.status === "paid" || quote.status === "deployed") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  try {
    const result = await verifyTransaction(reference);

    if (result.status === "success") {
      // Verify the amount matches (in cents)
      const expectedAmount = Math.round(quote.total * 100);
      if (result.amount !== expectedAmount) {
        console.error(`Paystack verify: amount mismatch. Expected ${expectedAmount}, got ${result.amount}`);
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
      }

      // Mark quote as paid
      await supabaseAdmin
        .from("quotes")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "paystack",
        })
        .eq("id", quote.id);

      // Record payment in payments table
      await supabaseAdmin.from("payments").insert({
        company_id: quote.company_id,
        quote_id: quote.id,
        payment_method: "paystack",
        amount: quote.total,
        currency: "ZAR",
        reference: quote.reference,
        paystack_reference: reference,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      });

      return NextResponse.json({ ok: true, paid: true });
    } else {
      return NextResponse.json({ ok: false, paid: false, status: result.status });
    }
  } catch (err: any) {
    console.error("Paystack verify error:", err);
    return NextResponse.json({ error: err.message || "Payment verification failed" }, { status: 500 });
  }
}
