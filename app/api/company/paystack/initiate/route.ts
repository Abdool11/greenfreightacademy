import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { initializeTransaction, getPaystackPublicKey } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  const publicKey = getPaystackPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Paystack is not configured" }, { status: 500 });
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

  // Generate a unique Paystack reference (Paystack refs must be unique per transaction)
  const paystackRef = `GFA-${quote.reference}-${Date.now()}`;

  // Amount in cents
  const amountInCents = Math.round(quote.total * 100);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.greenfreightacademy.co.za";

  try {
    const result = await initializeTransaction({
      email: session.email,
      amount: amountInCents,
      currency: "ZAR",
      reference: paystackRef,
      callbackUrl: `${siteUrl}/dashboard/payment-return?reference=${paystackRef}`,
      metadata: {
        quote_id: quoteId,
        quote_reference: quote.reference,
        company_id: session.companyId,
        company_name: session.companyName,
      },
    });

    // Store the Paystack reference on the quote
    await supabaseAdmin
      .from("quotes")
      .update({ paystack_reference: paystackRef })
      .eq("id", quoteId);

    return NextResponse.json({
      ok: true,
      reference: result.reference,
      access_code: result.access_code,
      authorization_url: result.authorization_url,
      publicKey,
      amount: amountInCents,
      email: session.email,
    });
  } catch (err: any) {
    console.error("Paystack initiate error:", err);
    return NextResponse.json({ error: err.message || "Payment initiation failed" }, { status: 500 });
  }
}
