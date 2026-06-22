import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { initiatePayment, getPaygateId, getPaygateKey } from "@/lib/paygate";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  const paygateId = getPaygateId();
  const encryptionKey = getPaygateKey();
  if (!paygateId || !encryptionKey) {
    return NextResponse.json({ error: "Paygate is not configured" }, { status: 500 });
  }

  // Verify quote belongs to this company and is pending
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status === "paid" || quote.status === "deployed") {
    return NextResponse.json({ error: "This quote has already been paid" }, { status: 409 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.greenfreightacademy.co.za";
  const returnUrl = `${siteUrl}/dashboard/payment-return`;
  const notifyUrl = `${siteUrl}/api/company/paygate/notify`;

  // Amount in cents
  const amountInCents = Math.round(quote.total * 100);
  const transactionDate = new Date().toISOString().replace("T", " ").substring(0, 19);

  try {
    const result = await initiatePayment({
      paygateId,
      reference: quote.reference,
      amount: amountInCents,
      currency: "ZAR",
      returnUrl,
      notifyUrl,
      transactionDate,
      locale: "en-za",
      country: "ZAF",
      email: session.email,
      encryptionKey,
    });

    // Store PAY_REQUEST_ID on the quote for later verification
    await supabaseAdmin
      .from("quotes")
      .update({ pay_request_id: result.PAY_REQUEST_ID })
      .eq("id", quoteId);

    return NextResponse.json({
      ok: true,
      payRequestId: result.PAY_REQUEST_ID,
      checksum: result.CHECKSUM,
      reference: quote.reference,
    });
  } catch (err: any) {
    console.error("Paygate initiate error:", err);
    return NextResponse.json({ error: err.message || "Payment initiation failed" }, { status: 500 });
  }
}
