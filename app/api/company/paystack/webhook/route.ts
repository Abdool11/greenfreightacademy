import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTransaction, verifyWebhookSignature } from "@/lib/paystack";

/**
 * Paystack webhook handler.
 * Paystack sends a POST with JSON body and an x-paystack-signature header.
 * We must respond with 200 quickly.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // Verify the webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Paystack webhook: signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Only process successful charge events
    if (event.event !== "charge.success") {
      return NextResponse.json({ ok: true });
    }

    const data = event.data;
    const reference = data.reference;

    // Find the quote by paystack_reference
    const { data: quote } = await supabaseAdmin
      .from("quotes")
      .select("id, status, total, company_id, reference")
      .eq("paystack_reference", reference)
      .single();

    if (!quote) {
      console.error(`Paystack webhook: quote not found for reference ${reference}`);
      return NextResponse.json({ ok: true });
    }

    // Only update if not already paid/deployed
    if (quote.status !== "paid" && quote.status !== "deployed") {
      // Verify the amount matches
      const expectedAmount = Math.round(quote.total * 100);
      if (data.amount !== expectedAmount) {
        console.error(`Paystack webhook: amount mismatch. Expected ${expectedAmount}, got ${data.amount}`);
        return NextResponse.json({ ok: true });
      }

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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
