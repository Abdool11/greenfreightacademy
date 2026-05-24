import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { Resend } from "resend";

// POST /api/company/eft-payment — client submits EFT payment notification
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId, eftReference, eftAmount, eftDate, notes } = await req.json();

  if (!quoteId || !eftReference || !eftAmount || !eftDate) {
    return NextResponse.json({ error: "quoteId, eftReference, eftAmount, and eftDate are required" }, { status: 400 });
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

  // Record EFT payment notification
  const { error: paymentError } = await supabaseAdmin.from("payments").insert({
    company_id: session.companyId,
    quote_id: quoteId,
    payment_method: "eft",
    amount: Number(eftAmount),
    eft_reference: eftReference,
    eft_date: eftDate,
    notes: notes ?? null,
    status: "pending_verification",
    created_at: new Date().toISOString(),
  });

  if (paymentError) {
    console.error("Payment insert error:", paymentError);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }

  // Update quote status to "eft_submitted" (waiting for admin verification)
  await supabaseAdmin
    .from("quotes")
    .update({ status: "eft_submitted", eft_reference: eftReference, eft_submitted_at: new Date().toISOString() })
    .eq("id", quoteId);

  // Notify GFA admin by email
  const config = await getConfigs(["email_booking_to", "company_name"]);
  const adminEmail = config["email_booking_to"];

  if (adminEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "GFA Platform <noreply@greenfreightacademy.co.za>",
        to: adminEmail,
        subject: `EFT Payment Notification — ${quote.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">EFT Payment Notification</h2>
            <p>A client has submitted an EFT payment notification and is awaiting verification.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
              <tr><td style="padding: 0.5rem; color: #6b7280; width: 40%;">Quote Reference</td><td style="padding: 0.5rem; font-weight: 600;">${quote.reference}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Quote Total</td><td style="padding: 0.5rem; font-weight: 600;">R ${quote.total?.toFixed(2)}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">EFT Reference</td><td style="padding: 0.5rem; font-weight: 600;">${eftReference}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Amount Paid</td><td style="padding: 0.5rem; font-weight: 600;">R ${Number(eftAmount).toFixed(2)}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Payment Date</td><td style="padding: 0.5rem; font-weight: 600;">${new Date(eftDate).toLocaleDateString("en-ZA")}</td></tr>
              ${notes ? `<tr><td style="padding: 0.5rem; color: #6b7280;">Notes</td><td style="padding: 0.5rem;">${notes}</td></tr>` : ""}
            </table>
            <p>Please verify the EFT payment in your bank account and approve the cohort in the <a href="${process.env.NEXT_PUBLIC_GFA_URL ?? ""}/admin/cohorts">GFA Admin Panel</a>.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Email notification error:", emailErr);
      // Non-blocking — payment is still recorded
    }
  }

  return NextResponse.json({
    ok: true,
    message: "EFT payment notification submitted. Your cohort will be activated once payment is verified by our team (usually within 1 business day).",
  });
}
