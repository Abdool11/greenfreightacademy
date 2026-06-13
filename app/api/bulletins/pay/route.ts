import { NextRequest, NextResponse } from "next/server";
import { getCompanyFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/bulletins/pay
// Body: { bulletin_id: string, method: "paystack" | "invoice" }
// - paystack: initialize Paystack transaction, return authorization_url
// - invoice: mark bulletin as invoiced, update status to submitted
export async function POST(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { bulletin_id, method } = await req.json();
    if (!bulletin_id || !method) {
      return NextResponse.json({ error: "bulletin_id and method required" }, { status: 400 });
    }
    if (!["paystack", "invoice"].includes(method)) {
      return NextResponse.json({ error: "method must be paystack or invoice" }, { status: 400 });
    }

    // Fetch the bulletin — must belong to this company and be pending payment
    const { data: bulletin, error: bErr } = await supabaseAdmin
      .from("bulletins")
      .select("id, title, urgency, status, distribution, company_id")
      .eq("id", bulletin_id)
      .eq("company_id", company.id)
      .single();

    if (bErr || !bulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 });
    }
    if (bulletin.status !== "pending_payment") {
      return NextResponse.json({ error: "Bulletin is not awaiting payment" }, { status: 409 });
    }

    // Fetch the current urgent bulletin fee
    const { data: feeConfig } = await supabaseAdmin
      .from("site_config")
      .select("value")
      .eq("key", "urgent_bulletin_fee")
      .single();
    const fee = feeConfig?.value ? Number(feeConfig.value) : 1000;

    if (method === "invoice") {
      // Record as invoiced — no immediate charge
      await supabaseAdmin.from("bulletin_payments").insert({
        bulletin_id,
        company_id: company.id,
        amount: fee,
        method: "invoice",
        status: "invoiced",
        created_at: new Date().toISOString(),
      });

      // Update bulletin status to submitted so it can be disseminated
      await supabaseAdmin
        .from("bulletins")
        .update({ status: "submitted" })
        .eq("id", bulletin_id);

      return NextResponse.json({ ok: true, method: "invoice", fee });
    }

    // Paystack payment
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
    }

    const reference = `GFA-BULL-${bulletin_id}-${Date.now()}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_GFA_URL ?? ""}/dashboard/bulletins/payment-complete?bulletin_id=${bulletin_id}&ref=${reference}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: company.email,
        amount: Math.round(fee * 100), // Paystack uses kobo/cents
        currency: "ZAR",
        reference,
        callback_url: callbackUrl,
        metadata: {
          bulletin_id,
          company_id: company.id,
          company_name: company.name,
          bulletin_title: bulletin.title,
          payment_type: "urgent_bulletin",
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      console.error("[bulletin/pay] Paystack error:", paystackData);
      return NextResponse.json({ error: "Paystack initialization failed" }, { status: 500 });
    }

    // Record pending payment
    await supabaseAdmin.from("bulletin_payments").insert({
      bulletin_id,
      company_id: company.id,
      amount: fee,
      method: "paystack",
      paystack_reference: paystackData.data.reference,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      method: "paystack",
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      fee,
    });
  } catch (err: any) {
    console.error("[bulletin/pay]", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
