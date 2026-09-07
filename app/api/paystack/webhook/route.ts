import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { adminNotify, writeLedgerEntry } from "@/lib/adminNotify";
import { allocateConfirmedPaymentToInvoice } from "@/lib/invoicePayments";
import { allocateQuoteCreditsOnce } from "@/lib/creditAllocations";
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
      await supabaseAdmin
        .from("bulletin_payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paystack_data: JSON.stringify(data),
        })
        .eq("paystack_reference", paystackReference);

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

    // Update payment record
    const { data: paymentRecord } = await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paystack_data: JSON.stringify(data),
      })
      .eq("paystack_reference", paystackReference)
      .select("id, amount")
      .maybeSingle();

    // Update quote status to "paid"
    await supabaseAdmin
      .from("quotes")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "paystack",
      })
      .eq("id", quoteId)
      .eq("company_id", companyId);

    // Allocate purchased seats once. Paystack can deliver webhooks more than once
    // and the browser return path can verify the same payment separately.
    if (!paymentRecord?.id) {
      console.error(`Paystack webhook: payment record not found for ${paystackReference}`);
      return NextResponse.json({ error: "Payment record not found" }, { status: 500 });
    }

    let creditAllocation: Awaited<ReturnType<typeof allocateQuoteCreditsOnce>>;
    try {
      creditAllocation = await allocateQuoteCreditsOnce({
        paymentId: paymentRecord.id,
        quoteId,
        companyId,
      });
    } catch (err) {
      console.error("Paystack webhook: credit allocation failed", err);
      return NextResponse.json({ error: "Credit allocation failed" }, { status: 500 });
    }

    const creditCount = creditAllocation.creditCount;

    // Auto-approve: for Paystack payments, immediately mark as approved
    // (EFT requires manual admin verification; Paystack is instant)
    await supabaseAdmin
      .from("quotes")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: "paystack_auto",
      })
      .eq("id", quoteId)
      .eq("company_id", companyId);

    console.log(`Paystack payment confirmed for quote ${quoteId}, company ${companyId}`);

    // ── Send confirmation emails (client + admin) ───────────────────────────
    if (process.env.BREVO_SMTP_PASSWORD && creditAllocation.allocated) {
      try {
        // Fetch quote + company details for email
        const { data: quoteRow } = await supabaseAdmin
          .from("quotes")
          .select("reference, total, subtotal, vat, company_id")
          .eq("id", quoteId)
          .single();

        const { data: company } = await supabaseAdmin
          .from("companies")
          .select("name, email, contact_email")
          .eq("id", companyId)
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
        const quoteSubtotal = Number(quoteRow?.subtotal ?? 0);
        const quoteVat = Number(quoteRow?.vat ?? 0);

        // Fetch updated credit balance
        const { data: companyForBalance } = await supabaseAdmin
          .from("companies")
          .select("credit_balance")
          .eq("id", companyId)
          .single();
        const creditBalance = Number(companyForBalance?.credit_balance ?? 0);

        // Client confirmation email
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
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                      <tr><td style="padding: 6px 0; color: #94a3b8;">Subtotal</td><td style="padding: 6px 0; color: white; text-align: right;">R ${quoteSubtotal.toFixed(2)}</td></tr>
                      <tr><td style="padding: 6px 0; color: #94a3b8;">VAT (15%)</td><td style="padding: 6px 0; color: white; text-align: right;">R ${quoteVat.toFixed(2)}</td></tr>
                      <tr style="border-top: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0; color: white; font-weight: 700;">Total Paid</td><td style="padding: 8px 0; color: #2ecc71; font-weight: 700; text-align: right;">R ${quoteTotal.toFixed(2)}</td></tr>
                    </table>
                    <div style="background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="margin: 0; color: #2ecc71; font-weight: 700; font-size: 16px;">Credits Added: ${creditCount}</p>
                      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Your dashboard now has <strong style="color: white;">${creditBalance}</strong> training credits available.</p>
                    </div>
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
              text: `Payment Confirmed\n\nYour card payment for quote ${quoteRef} has been confirmed.\n\nSubtotal: R ${quoteSubtotal.toFixed(2)}\nVAT (15%): R ${quoteVat.toFixed(2)}\nTotal Paid: R ${quoteTotal.toFixed(2)}\n\nCredits Added: ${creditCount}\nYour dashboard now has ${creditBalance} training credits available.\n\nLog in to your dashboard at ${dashboardUrl} and click "Deploy Training" to send WhatsApp welcome messages to your drivers.`,
            });
          } catch (err) {
            console.error("Paystack webhook: client email error:", err);
          }
        }

        // Admin notification email
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
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Subtotal</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteSubtotal.toFixed(2)}</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">VAT (15%)</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteVat.toFixed(2)}</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Total Amount</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteTotal.toFixed(2)}</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Payment Method</td><td style="padding: 0.5rem; font-weight: 600;">Paystack (Card)</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Paystack Reference</td><td style="padding: 0.5rem; font-weight: 600;">${paystackReference}</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Confirmed At</td><td style="padding: 0.5rem; font-weight: 600;">${new Date().toLocaleString("en-ZA")}</td></tr>
                  </table>
                  <p>The quote has been auto-approved. The client can now deploy training from their dashboard.</p>
                </div>
              `,
              text: `Paystack Payment Received\n\nCompany: ${companyName}\nQuote Ref: ${quoteRef}\nSubtotal: R ${quoteSubtotal.toFixed(2)}\nVAT (15%): R ${quoteVat.toFixed(2)}\nTotal Amount: R ${quoteTotal.toFixed(2)}\nPayment Method: Paystack (Card)\nPaystack Ref: ${paystackReference}\nConfirmed At: ${new Date().toLocaleString("en-ZA")}`,
            });
          } catch (err) {
            console.error("Paystack webhook: admin email error:", err);
          }
        }
      } catch (emailErr) {
        console.error("Paystack webhook: email notification error:", emailErr);
      }
    }

    // ── Admin notification matrix (WhatsApp + email) ────────────────────────────
    // Runs after emails so it never blocks the Paystack acknowledgement
    try {
      const { data: notifQuote } = await supabaseAdmin
        .from("quotes")
        .select("reference, total, subtotal, company_id, companies(name)")
        .eq("id", quoteId)
        .single();
      const notifCompany = (notifQuote?.companies as { name?: string } | null)?.name ?? "Unknown";
      await adminNotify("payment_received_paystack", {
        message: `Paystack card payment confirmed — auto-approved. Client can now deploy training.`,
        details: {
          Company:           notifCompany,
          "Quote Ref":       notifQuote?.reference ?? quoteId,
          "Amount":          `R ${Number(notifQuote?.total ?? 0).toFixed(2)}`,
          "Paystack Ref":    paystackReference,
        },
      });
      // ── Write ledger entry ──────────────────────────────────────────────────
      await writeLedgerEntry({
        company_id:  companyId,
        entry_type:  "payment_received",
        amount:      Number(notifQuote?.total ?? 0),
        description: `Paystack payment — ${notifQuote?.reference ?? quoteId}`,
        reference:   paystackReference,
        quote_id:    quoteId,
        payment_id:  paymentRecord?.id,
        status:      "confirmed",
        created_by:  "paystack_webhook",
      });
      if (paymentRecord?.id) {
        try {
          await allocateConfirmedPaymentToInvoice({
            quoteId,
            paymentId: paymentRecord.id,
            amount: Number(paymentRecord.amount ?? notifQuote?.total ?? 0),
            actorLabel: "Paystack webhook",
            note: `Allocated after confirmed Paystack payment ${paystackReference}.`,
          });
        } catch (invoiceAllocationError) {
          console.error("Paystack webhook: invoice allocation error (non-blocking):", invoiceAllocationError);
        }
      }
    } catch (notifErr) {
      console.error("Paystack webhook: adminNotify error (non-blocking):", notifErr);
    }
  }

  return NextResponse.json({ ok: true });
}

