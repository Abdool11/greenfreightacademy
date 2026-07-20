import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
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
    await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paystack_data: JSON.stringify(data),
      })
      .eq("paystack_reference", paystackReference);

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

    // ── Add credits to company balance ────────────────────────────────────────
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
        .eq("id", companyId)
        .single();

      const newBalance = Number(companyForCredit?.credit_balance ?? 0) + creditCount;
      await supabaseAdmin
        .from("companies")
        .update({ credit_balance: newBalance })
        .eq("id", companyId);
    }

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
    if (process.env.BREVO_SMTP_PASSWORD) {
      try {
        // Fetch quote + company details for email
        const { data: quoteRow } = await supabaseAdmin
          .from("quotes")
          .select("reference, total, company_id")
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
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Amount</td><td style="padding: 0.5rem; font-weight: 600;">R ${quoteTotal.toFixed(2)}</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Payment Method</td><td style="padding: 0.5rem; font-weight: 600;">Paystack (Card)</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Paystack Reference</td><td style="padding: 0.5rem; font-weight: 600;">${paystackReference}</td></tr>
                    <tr><td style="padding: 0.5rem; color: #6b7280;">Confirmed At</td><td style="padding: 0.5rem; font-weight: 600;">${new Date().toLocaleString("en-ZA")}</td></tr>
                  </table>
                  <p>The quote has been auto-approved. The client can now deploy training from their dashboard.</p>
                </div>
              `,
              text: `Paystack Payment Received\n\nCompany: ${companyName}\nQuote Ref: ${quoteRef}\nAmount: R ${quoteTotal.toFixed(2)}\nPayment Method: Paystack (Card)\nPaystack Ref: ${paystackReference}\nConfirmed At: ${new Date().toLocaleString("en-ZA")}`,
            });
          } catch (err) {
            console.error("Paystack webhook: admin email error:", err);
          }
        }
      } catch (emailErr) {
        console.error("Paystack webhook: email notification error:", emailErr);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
