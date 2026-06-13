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

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  // Verify with Paystack API
  if (paystackReference) {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${paystackReference}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });
    const verifyData = await verifyRes.json();

    if (verifyData.status && verifyData.data?.status === "success") {
      const metadata = verifyData.data.metadata ?? {};
      const metaQuoteId = metadata.quote_id;

      // Security: ensure the quote in metadata matches the requested quoteId
      if (metaQuoteId !== quoteId) {
        return NextResponse.json({ error: "Payment reference mismatch" }, { status: 403 });
      }

      // Update quote to paid + approved (Paystack payments auto-approve)
      await supabaseAdmin
        .from("quotes")
        .update({
          status: "approved",
          paid_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          payment_method: "paystack",
          approved_by: "paystack_auto",
        })
        .eq("id", quoteId)
        .eq("company_id", session.companyId);

      // Update payment record
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("paystack_reference", paystackReference);

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

  if (quote?.status === "paid" || quote?.status === "approved" || quote?.status === "deployed") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
}
