import { NextRequest, NextResponse } from "next/server";
import { getSession, getCompanyFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/paystack/verify?reference=...&bulletin_id=...
// Used by bulletin payment-complete page to verify a bulletin payment
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  const bulletinId = searchParams.get("bulletin_id");

  if (!reference || !bulletinId) {
    return NextResponse.json({ error: "reference and bulletin_id required" }, { status: 400 });
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  // Verify with Paystack API
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecretKey}` },
  });
  const verifyData = await verifyRes.json();

  if (verifyData.status && verifyData.data?.status === "success") {
    const metadata = verifyData.data.metadata ?? {};

    // Security: ensure the bulletin in metadata matches the requested bulletinId
    if (metadata.bulletin_id !== bulletinId) {
      return NextResponse.json({ error: "Payment reference mismatch" }, { status: 403 });
    }

    // Update bulletin payment record
    await supabaseAdmin
      .from("bulletin_payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paystack_data: JSON.stringify(verifyData.data),
      })
      .eq("paystack_reference", reference);

    // Update bulletin status to submitted
    await supabaseAdmin
      .from("bulletins")
      .update({ status: "submitted" })
      .eq("id", bulletinId);

    return NextResponse.json({ ok: true });
  }

  // Fallback: check if bulletin was already marked submitted (via webhook)
  const { data: bulletin } = await supabaseAdmin
    .from("bulletins")
    .select("status")
    .eq("id", bulletinId)
    .single();

  if (bulletin?.status === "submitted" || bulletin?.status === "disseminated") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
}

// POST /api/paystack/verify — verify a Paystack payment after redirect (quote payments)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId, paystackReference } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  console.log("[paystack/verify] POST received:", { quoteId, paystackReference });

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  // If no paystackReference in the request, look it up from the payments table
  let referenceToVerify = paystackReference;
  if (!referenceToVerify) {
    console.log("[paystack/verify] No reference in request, looking up from payments table");
    const { data: paymentRecord, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("paystack_reference")
      .eq("quote_id", quoteId)
      .eq("payment_method", "paystack")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (payErr) console.error("[paystack/verify] Payment lookup error:", payErr);
    if (paymentRecord?.paystack_reference) {
      referenceToVerify = paymentRecord.paystack_reference;
      console.log("[paystack/verify] Found reference from payments table:", referenceToVerify);
    }
  }

  // Verify with Paystack API
  if (referenceToVerify) {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${referenceToVerify}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });
    const verifyData = await verifyRes.json();
    console.log("[paystack/verify] Paystack API response:", { status: verifyData.status, dataStatus: verifyData.data?.status });

    if (verifyData.status && verifyData.data?.status === "success") {
      const metadata = verifyData.data.metadata ?? {};
      const metaQuoteId = metadata.quote_id;

      // Security: ensure the quote in metadata matches the requested quoteId
      if (metaQuoteId && String(metaQuoteId) !== String(quoteId)) {
        console.error("[paystack/verify] Quote ID mismatch:", { metaQuoteId, quoteId });
        return NextResponse.json({ error: "Payment reference mismatch" }, { status: 403 });
      }

      // Update quote to paid
      const { error: quoteUpdateError } = await supabaseAdmin
        .from("quotes")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "paystack",
        })
        .eq("id", quoteId)
        .eq("company_id", session.companyId);

      if (quoteUpdateError) {
        console.error("[paystack/verify] Quote update FAILED:", quoteUpdateError);
      } else {
        console.log("[paystack/verify] Quote updated to paid successfully");
      }

      // Update payment record (payments table uses confirmed_at, not paid_at)
      const { error: payUpdateError } = await supabaseAdmin
        .from("payments")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("paystack_reference", referenceToVerify);

      if (payUpdateError) {
        console.error("[paystack/verify] Payment record update FAILED:", payUpdateError);
      }

      return NextResponse.json({ ok: true });
    }
  }

  // Fallback: check if quote was already marked paid (via webhook)
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  console.log("[paystack/verify] Fallback quote status check:", quote?.status);

  if (quote?.status === "paid" || quote?.status === "deployed") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
}
