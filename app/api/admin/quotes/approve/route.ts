import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { allocateQuoteCreditsOnce } from "@/lib/creditAllocations";

// POST /api/admin/quotes/approve — admin manually marks a quote as paid (EFT)
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { quoteId } = await req.json();

  if (!quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
  }

  // 1. Fetch the quote
  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, subtotal, vat, status, company_id")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // 2. Validate status — allow pending and eft_submitted, reject paid/deployed
  if (quote.status === "paid" || quote.status === "deployed") {
    return NextResponse.json(
      { error: `Quote is already ${quote.status}` },
      { status: 409 }
    );
  }

  if (quote.status !== "pending" && quote.status !== "eft_submitted") {
    return NextResponse.json(
      { error: `Quote status '${quote.status}' cannot be approved` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // 3. Establish a pending payment record before a quote becomes deployable.
  // The confirmed allocation is protected by the Release 9 unique ledger.
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .insert({
      company_id: quote.company_id,
      quote_id: quoteId,
      payment_method: "eft",
      amount: Number(quote.total),
      status: "pending_verification",
      created_at: now,
    })
    .select("id")
    .single();

  if (paymentError || !payment?.id) {
    console.error("Payment insert error:", paymentError);
    return NextResponse.json({ error: "Payment record could not be created. The quote remains unavailable for deployment." }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("quotes")
    .update({
      status: "approved",
      paid_at: now,
      payment_method: "eft",
      approved_at: now,
      approved_by: session.email || String(session.adminId),
    })
    .eq("id", quoteId)
    .in("status", ["pending", "eft_submitted"]);

  if (updateError) {
    console.error("Quote update error:", updateError);
    return NextResponse.json({ error: "Payment record was created but the quote could not be approved. Escalate before deployment." }, { status: 500 });
  }

  const { error: confirmError } = await supabaseAdmin
    .from("payments")
    .update({ status: "confirmed", confirmed_at: now, confirmed_by: session.adminId })
    .eq("id", payment.id)
    .eq("status", "pending_verification");

  if (confirmError) {
    return NextResponse.json({ error: "Quote was approved but payment confirmation failed. Escalate before deployment." }, { status: 500 });
  }

  try {
    await allocateQuoteCreditsOnce({
      paymentId: payment.id,
      quoteId,
      companyId: quote.company_id,
    });
  } catch (creditError) {
    console.error("Manual EFT credit allocation failed:", creditError);
    return NextResponse.json({ error: "Payment confirmation could not allocate credits. Escalate before deployment." }, { status: 500 });
  }

  // 5. Fetch company contact email
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("name, contact_email")
    .eq("id", quote.company_id)
    .single();

  if (companyError) {
    console.error("Company fetch error:", companyError);
  }

  const companyName = company?.name ?? "Unknown";
  const clientEmail = company?.contact_email;
  const quoteSubtotal = Number(quote.subtotal ?? 0);
  const quoteVat = Number(quote.vat ?? 0);
  const quoteTotal = Number(quote.total ?? 0);
  const config = await getConfigs(["company_email", "email_booking_to"]);
  const adminEmail = config["email_booking_to"] || config["company_email"];
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_GFA_URL ||
    "https://greenfreightacademy.co.za";
  const dashboardUrl = `${siteUrl}/dashboard`;

  // 6. Send confirmation email to client
  if (!clientEmail) {
    console.warn(`No contact_email found for company ${quote.company_id} — skipping client confirmation email`);
  } else if (!process.env.BREVO_SMTP_PASSWORD) {
    console.warn("BREVO_SMTP_PASSWORD not set — skipping client confirmation email");
  } else {
    try {
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GreenFreightAcademy",
        to: clientEmail,
        subject: `Payment Confirmed — Quote ${quote.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0a1628; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #2ecc71; margin: 0; font-size: 24px;">GreenFreightAcademy</h1>
              <p style="color: #94a3b8; margin: 8px 0 0;">Driver Training Platform</p>
            </div>
            <div style="background: #111f3a; padding: 32px; border-radius: 0 0 12px 12px;">
              <h2 style="color: white; margin: 0 0 16px;">Payment Confirmed</h2>
              <p style="color: #94a3b8; line-height: 1.6;">
                Your EFT payment for quote <strong style="color: white;">${quote.reference}</strong>
                has been confirmed by our team.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #94a3b8;">Subtotal</td><td style="padding: 6px 0; color: white; text-align: right;">R ${quoteSubtotal.toFixed(2)}</td></tr>
                <tr><td style="padding: 6px 0; color: #94a3b8;">VAT (15%)</td><td style="padding: 6px 0; color: white; text-align: right;">R ${quoteVat.toFixed(2)}</td></tr>
                <tr style="border-top: 1px solid rgba(255,255,255,0.1);"><td style="padding: 8px 0; color: white; font-weight: 700;">Total Paid</td><td style="padding: 8px 0; color: #2ecc71; font-weight: 700; text-align: right;">R ${quoteTotal.toFixed(2)}</td></tr>
              </table>
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
        text: `Payment Confirmed\n\nYour EFT payment for quote ${quote.reference} has been confirmed by our team.\n\nSubtotal: R ${quoteSubtotal.toFixed(2)}\nVAT (15%): R ${quoteVat.toFixed(2)}\nTotal Paid: R ${quoteTotal.toFixed(2)}\n\nLog in to your dashboard at ${dashboardUrl} and click "Deploy Training" to send WhatsApp welcome messages to your drivers.`,
      });
    } catch (err) {
      console.error("Client confirmation email error:", err);
    }
  }

  // 7. Send audit email to admin
  if (!adminEmail) {
    console.warn("No admin email configured — skipping admin audit email");
  } else if (!process.env.BREVO_SMTP_PASSWORD) {
    console.warn("BREVO_SMTP_PASSWORD not set — skipping admin audit email");
  } else {
    try {
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GFA Platform",
        to: adminEmail,
        subject: `EFT Payment Manually Confirmed — ${companyName} — ${quote.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">EFT Payment Manually Confirmed</h2>
            <p>An admin has manually confirmed an EFT payment.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
              <tr><td style="padding: 0.5rem; color: #6b7280; width: 40%;">Company</td><td style="padding: 0.5rem; font-weight: 600;">${companyName}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Quote Reference</td><td style="padding: 0.5rem; font-weight: 600;">${quote.reference}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Subtotal</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteSubtotal.toFixed(2)}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">VAT (15%)</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteVat.toFixed(2)}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Total Amount</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteTotal.toFixed(2)}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Confirmed By</td><td style="padding: 0.5rem; font-weight: 600;">${session.name} (${session.email})</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Confirmed At</td><td style="padding: 0.5rem; font-weight: 600;">${new Date(now).toLocaleString("en-ZA")}</td></tr>
            </table>
          </div>
        `,
        text: `EFT Payment Manually Confirmed\n\nCompany: ${companyName}\nQuote Ref: ${quote.reference}\nSubtotal: R ${quoteSubtotal.toFixed(2)}\nVAT (15%): R ${quoteVat.toFixed(2)}\nTotal Amount: R ${quoteTotal.toFixed(2)}\nConfirmed By: ${session.name} (${session.email})\nConfirmed At: ${new Date(now).toLocaleString("en-ZA")}`,
      });
    } catch (err) {
      console.error("Admin audit email error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
