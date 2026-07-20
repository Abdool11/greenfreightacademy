import { NextRequest, NextResponse } from "next/server";
import { getSession, getCompanyFromRequest } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

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

  // If no paystackReference in the URL, look it up from the payments table
  let referenceToVerify = paystackReference;
  if (!referenceToVerify) {
    const { data: paymentRecord } = await supabaseAdmin
      .from("payments")
      .select("paystack_reference")
      .eq("quote_id", quoteId)
      .eq("payment_method", "paystack")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (paymentRecord?.paystack_reference) {
      referenceToVerify = paymentRecord.paystack_reference;
    }
  }

  // Verify with Paystack API
  if (referenceToVerify) {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${referenceToVerify}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });
    const verifyData = await verifyRes.json();

    if (verifyData.status && verifyData.data?.status === "success") {
      const metadata = verifyData.data.metadata ?? {};
      const metaQuoteId = metadata.quote_id;

      // Security: ensure the quote in metadata matches the requested quoteId
      if (metaQuoteId && metaQuoteId !== quoteId) {
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

      // ── Add credits to company balance ─────────────────────────────────────
      const { data: paidQuote } = await supabaseAdmin
        .from("quotes")
        .select("line_items")
        .eq("id", quoteId)
        .single();

      const lineItems = Array.isArray(paidQuote?.line_items) ? paidQuote.line_items : [];
      const creditCount = lineItems.length;

      if (creditCount > 0) {
        const { data: companyForCredit } = await supabaseAdmin
          .from("companies")
          .select("credit_balance")
          .eq("id", session.companyId)
          .single();

        const newBalance = Number(companyForCredit?.credit_balance ?? 0) + creditCount;
        await supabaseAdmin
          .from("companies")
          .update({ credit_balance: newBalance })
          .eq("id", session.companyId);
      }

      // Update payment record
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("paystack_reference", referenceToVerify);

      // ── Send confirmation emails (client + admin) ───────────────────────
      if (process.env.BREVO_SMTP_PASSWORD) {
        try {
          const { data: quoteRow } = await supabaseAdmin
            .from("quotes")
            .select("reference, total, company_id")
            .eq("id", quoteId)
            .single();

          const { data: company } = await supabaseAdmin
            .from("companies")
            .select("name, email, contact_email")
            .eq("id", session.companyId)
            .single();

          const config = await getConfigs(["email_booking_to", "company_email"]);
          const adminEmail = config["email_booking_to"] || config["company_email"];
          const clientEmail = company?.contact_email || company?.email;
          const companyName = company?.name ?? "Unknown";
          const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.NEXT_PUBLIC_GFA_URL ||
            "https://greenfreightacademy.co.za";
          const dashboardUrl = `${siteUrl}/dashboard`;
          const quoteRef = quoteRow?.reference ?? quoteId;
          const quoteTotal = Number(quoteRow?.total ?? 0);

          if (clientEmail) {
            try {
              await sendEmail({
                from: "abdool@transportactiongroup.co.za",
                fromName: "GreenFreightAcademy",
                to: clientEmail,
                subject: `Payment Confirmed — Quote ${quoteRef}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
                      <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
                    </div>
                    <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
                      <h2 style="color: white; margin: 0 0 16px;">Payment Confirmed</h2>
                      <p style="color: #94a3b8; line-height: 1.6;">
                        Your card payment for quote <strong style="color: white;">${quoteRef}</strong>
                        has been confirmed.
                      </p>
                      <p style="color: #94a3b8; line-height: 1.6;">
                        You can now deploy training to your drivers. Log in to your dashboard and click
                        <strong style="color: #2ecc71;">Deploy Training</strong> to send WhatsApp welcome
                        messages to your drivers.
                      </p>
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${dashboardUrl}"
                           style="background: #2ecc71; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                          Go to Your Dashboard →
                        </a>
                      </div>
                      <p style="color: #64748b; font-size: 12px; text-align: center;">
                        If you have any questions, please contact the GreenFreightAcademy team.
                      </p>
                    </div>
                  </div>
                `,
                text: `Payment Confirmed\n\nYour card payment for quote ${quoteRef} has been confirmed.\n\nLog in to your dashboard at ${dashboardUrl} and click "Deploy Training" to send WhatsApp welcome messages to your drivers.`,
              });
            } catch (err) {
              console.error("Paystack verify: client email error:", err);
            }
          }

          if (adminEmail) {
            try {
              await sendEmail({
                from: "abdool@transportactiongroup.co.za",
                fromName: "GFA Platform",
                to: adminEmail,
                subject: `Paystack Payment Received — ${companyName} — ${quoteRef}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #22c55e;">Paystack Payment Received</h2>
                    <p>A client has successfully paid via Paystack (card payment).</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                      <tr><td style="padding: 0.5rem; color: #6b7280; width: 40%;">Company</td><td style="padding: 0.5rem; font-weight: 600;">${companyName}</td></tr>
                      <tr><td style="padding: 0.5rem; color: #6b7280;">Quote Reference</td><td style="padding: 0.5rem; font-weight: 600;">${quoteRef}</td></tr>
                      <tr><td style="padding: 0.5rem; color: #6b7280;">Amount</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteTotal.toFixed(2)}</td></tr>
                      <tr><td style="padding: 0.5rem; color: #6b7280;">Payment Method</td><td style="padding: 0.5rem; font-weight: 600;">Paystack (Card)</td></tr>
                      <tr><td style="padding: 0.5rem; color: #6b7280;">Paystack Reference</td><td style="padding: 0.5rem; font-weight: 600;">${referenceToVerify}</td></tr>
                      <tr><td style="padding: 0.5rem; color: #6b7280;">Confirmed At</td><td style="padding: 0.5rem; font-weight: 600;">${new Date().toLocaleString("en-ZA")}</td></tr>
                    </table>
                    <p>The quote has been auto-approved. The client can now deploy training from their dashboard.</p>
                  </div>
                `,
                text: `Paystack Payment Received\n\nCompany: ${companyName}\nQuote Ref: ${quoteRef}\nAmount: R ${quoteTotal.toFixed(2)}\nPayment Method: Paystack (Card)\nPaystack Ref: ${referenceToVerify}\nConfirmed At: ${new Date().toLocaleString("en-ZA")}`,
              });
            } catch (err) {
              console.error("Paystack verify: admin email error:", err);
            }
          }
        } catch (emailErr) {
          console.error("Paystack verify: email notification error:", emailErr);
        }
      }

      return NextResponse.json({ ok: true });
    }
    console.error("[paystack/verify] Paystack verification did not succeed:", verifyData);
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
