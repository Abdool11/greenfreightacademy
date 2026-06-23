import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

// POST /api/paystack/webhook — receives Paystack payment events
export async function POST(req: NextRequest) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  // Verify webhook signature
  const signature = req.headers.get("x-paystack-signature");
  const body = await req.text();
  const hash = crypto
    .createHmac("sha512", paystackSecretKey)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    console.error("Paystack webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const data = event.data;
    const paystackReference = data.reference;
    const metadata = data.metadata ?? {};

    // ── Bulletin payment ────────────────────────────────────────────────────
    if (metadata.payment_type === "urgent_bulletin") {
      const bulletinId = metadata.bulletin_id;
      const companyId = metadata.company_id;

      if (!bulletinId || !companyId) {
        console.error("Paystack bulletin webhook: missing metadata", metadata);
        return NextResponse.json({ ok: true });
      }

      // Mark bulletin payment as paid
      const { error: bullPayErr } = await supabaseAdmin
        .from("bulletin_payments")
        .update({
          status: "paid",
        })
        .eq("paystack_reference", paystackReference);
      if (bullPayErr) console.error("[paystack/webhook] Bulletin payment update FAILED:", bullPayErr);

      // Update bulletin status to submitted so it can be disseminated
      await supabaseAdmin
        .from("bulletins")
        .update({ status: "submitted" })
        .eq("id", bulletinId)
        .eq("company_id", companyId);

      console.log(`Paystack bulletin payment confirmed: bulletin ${bulletinId}, company ${companyId}`);
      return NextResponse.json({ ok: true });
    }

    // ── Quote / cohort payment ───────────────────────────────────────────────
    const quoteId = metadata.quote_id;
    const companyId = metadata.company_id;

    if (!quoteId || !companyId) {
      console.error("Paystack webhook: missing metadata", metadata);
      return NextResponse.json({ ok: true }); // Acknowledge but skip
    }

    // Update payment record (payments table uses confirmed_at, not paid_at)
    const { error: payErr } = await supabaseAdmin
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("paystack_reference", paystackReference);
    if (payErr) console.error("[paystack/webhook] Payment record update FAILED:", payErr);

    // Update quote status to "paid" (Paystack payments are instant)
    const { error: quoteErr } = await supabaseAdmin
      .from("quotes")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "paystack",
      })
      .eq("id", quoteId)
      .eq("company_id", companyId);
    if (quoteErr) console.error("[paystack/webhook] Quote update FAILED:", quoteErr);

    console.log(`Paystack payment confirmed for quote ${quoteId}, company ${companyId}`);
  }

  return NextResponse.json({ ok: true });
}
