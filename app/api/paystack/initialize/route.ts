import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/paystack/initialize — initialize a Paystack payment for a quote
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  // Verify quote belongs to this company
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, status, company_id")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status === "paid" || quote.status === "deployed") {
    return NextResponse.json({ error: "This quote has already been paid" }, { status: 409 });
  }

  // Fetch company email
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("email, name")
    .eq("id", session.companyId)
    .single();

  const amountKobo = Math.round(quote.total * 100); // Paystack uses kobo (cents)

  const callbackUrl = `${process.env.NEXT_PUBLIC_GFA_URL ?? ""}/dashboard/payment?quoteId=${quoteId}&ref=${quote.reference}`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: company?.email ?? session.email,
      amount: amountKobo,
      currency: "ZAR",
      reference: `GFA-${quote.reference}-${Date.now()}`,
      callback_url: callbackUrl,
      metadata: {
        quote_id: quoteId,
        quote_reference: quote.reference,
        company_id: session.companyId,
        company_name: company?.name ?? "",
      },
    }),
  });

  const paystackData = await paystackRes.json();

  if (!paystackData.status) {
    console.error("Paystack init error:", paystackData);
    return NextResponse.json({ error: "Paystack initialization failed" }, { status: 500 });
  }

  // Record pending payment
  await supabaseAdmin.from("payments").insert({
    company_id: session.companyId,
    quote_id: quoteId,
    payment_method: "paystack",
    amount: quote.total,
    paystack_reference: paystackData.data.reference,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    authorization_url: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
  });
}
