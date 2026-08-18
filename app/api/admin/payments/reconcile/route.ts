import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { adminNotify, writeLedgerEntry } from "@/lib/adminNotify";

export const dynamic = "force-dynamic";

type Decision = "confirm" | "request_clarification" | "reject";
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const money = (value: number) => `R ${value.toFixed(2)}`;

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  if (process.env.ENABLE_EFT_RECONCILIATION_V2 !== "true") return NextResponse.json({ error: "Enhanced EFT reconciliation is disabled for this release." }, { status: 503 });

  const body = await req.json();
  const paymentId = clean(body.paymentId);
  const decision = clean(body.decision) as Decision;
  const reconciliationNotes = clean(body.reconciliationNotes);
  const bankTransactionReference = clean(body.bankTransactionReference);
  const bankTransactionDate = clean(body.bankTransactionDate);

  if (!paymentId || !["confirm", "request_clarification", "reject"].includes(decision)) {
    return NextResponse.json({ error: "A payment and valid reconciliation decision are required." }, { status: 400 });
  }
  if (["request_clarification", "reject"].includes(decision) && !reconciliationNotes) {
    return NextResponse.json({ error: "A clear reconciliation note is required for this decision." }, { status: 400 });
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .select("*, quotes(id, reference, total, subtotal, vat, status, company_id, line_items), companies(name, contact_email, email)")
    .eq("id", paymentId)
    .single();
  if (paymentError || !payment) return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  if (!["pending_verification", "clarification_requested"].includes(payment.status)) {
    return NextResponse.json({ error: `This payment is already ${payment.status} and cannot be reconciled again.` }, { status: 409 });
  }

  const quote = Array.isArray(payment.quotes) ? payment.quotes[0] : payment.quotes;
  const company = Array.isArray(payment.companies) ? payment.companies[0] : payment.companies;
  if (!quote) return NextResponse.json({ error: "The linked quote could not be found." }, { status: 404 });

  const expectedAmount = Number(payment.expected_amount_snapshot ?? quote.total ?? 0);
  const submittedAmount = Number(payment.amount ?? 0);
  const varianceAmount = Math.round((submittedAmount - expectedAmount) * 100) / 100;
  const now = new Date().toISOString();
  const adminIdentity = session.email || session.name || String(session.adminId);

  // Exact-value controls: a short/over payment cannot be treated as confirmed
  // until a governed discount or another adjustment release resolves the variance.
  if (decision === "confirm" && varianceAmount !== 0) {
    return NextResponse.json({
      error: `The submitted amount differs from the quote by ${money(varianceAmount)}. Resolve the variance before confirming payment.`,
      code: "variance_requires_resolution",
      expectedAmount,
      submittedAmount,
      varianceAmount,
    }, { status: 409 });
  }

  if (decision === "confirm" && !bankTransactionReference) {
    return NextResponse.json({ error: "Bank transaction reference is required to confirm an EFT." }, { status: 400 });
  }

  if (decision === "confirm") {
    const { error: paymentUpdateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_at: now,
        confirmed_by: session.adminId,
        reconciliation_status: "confirmed",
        reconciliation_notes: reconciliationNotes || null,
        bank_transaction_reference: bankTransactionReference,
        bank_transaction_date: bankTransactionDate || null,
        reconciled_at: now,
        reconciled_by: adminIdentity,
      })
      .eq("id", payment.id)
      .in("status", ["pending_verification", "clarification_requested"]);
    if (paymentUpdateError) return NextResponse.json({ error: "Could not confirm the payment." }, { status: 500 });

    const { error: quoteUpdateError } = await supabaseAdmin
      .from("quotes")
      .update({ status: "approved", paid_at: now, payment_method: "eft", approved_at: now, approved_by: adminIdentity })
      .eq("id", quote.id)
      .eq("status", "eft_submitted");
    if (quoteUpdateError) return NextResponse.json({ error: "Payment was reconciled but the quote could not be marked ready to deploy." }, { status: 500 });

    const { data: companyBalance } = await supabaseAdmin
      .from("companies")
      .select("credit_balance")
      .eq("id", quote.company_id)
      .single();
    const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];
    const creditCount = lineItems.length;
    const newCreditBalance = Number(companyBalance?.credit_balance ?? 0) + creditCount;
    if (creditCount > 0) {
      await supabaseAdmin.from("companies").update({ credit_balance: newCreditBalance }).eq("id", quote.company_id);
    }

    await supabaseAdmin.from("payment_reconciliation_events").insert({
      payment_id: payment.id,
      quote_id: quote.id,
      company_id: quote.company_id,
      event_type: "confirmed",
      expected_amount: expectedAmount,
      submitted_amount: submittedAmount,
      variance_amount: varianceAmount,
      eft_reference: payment.eft_reference || payment.reference,
      notes: reconciliationNotes || null,
      performed_by: adminIdentity,
      created_at: now,
    });

    await writeLedgerEntry({
      company_id: quote.company_id,
      entry_type: "eft_confirmed",
      amount: submittedAmount,
      description: `EFT reconciled and confirmed — ${quote.reference}`,
      reference: bankTransactionReference,
      quote_id: quote.id,
      payment_id: payment.id,
      status: "confirmed",
      created_by: adminIdentity,
    });
    if (creditCount > 0) {
      await writeLedgerEntry({
        company_id: quote.company_id,
        entry_type: "credits_allocated",
        amount: creditCount,
        description: `${creditCount} training credit(s) allocated after EFT confirmation — ${quote.reference}`,
        reference: quote.reference,
        quote_id: quote.id,
        payment_id: payment.id,
        driver_count: creditCount,
        status: "confirmed",
        created_by: adminIdentity,
        balance_after: newCreditBalance,
      });
    }

    const clientEmail = company?.contact_email || company?.email;
    if (clientEmail && process.env.BREVO_SMTP_PASSWORD) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
        await sendEmail({
          from: "abdool@transportactiongroup.co.za",
          fromName: "Green Freight Academy",
          to: clientEmail,
          subject: `EFT payment confirmed — ${quote.reference}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#16a34a">Payment confirmed</h2><p>Your EFT payment of <strong>${money(submittedAmount)}</strong> for quote <strong>${quote.reference}</strong> has been reconciled and confirmed.</p><p>Your training is now ready to deploy.</p><p><a href="${siteUrl}/dashboard" style="display:inline-block;background:#16a34a;color:#07130a;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Deploy training</a></p></div>`,
        });
      } catch (error) { console.error("EFT client confirmation email error:", error); }
    }

    await adminNotify("payment_received_eft", {
      message: `${company?.name || "Client"} EFT confirmed for ${quote.reference}.`,
      actionUrl: "/admin/finance?tab=transactions",
      details: { Company: company?.name || "—", "Quote Ref": quote.reference, Confirmed: money(submittedAmount), "Bank Ref": bankTransactionReference },
    });

    return NextResponse.json({ ok: true, status: "confirmed", creditCount });
  }

  const isRejected = decision === "reject";
  const paymentUpdate = isRejected
    ? { status: "rejected", reconciliation_status: "rejected", reconciliation_notes: reconciliationNotes, rejected_at: now, rejected_by: adminIdentity, rejection_reason: reconciliationNotes }
    : { status: "clarification_requested", reconciliation_status: "clarification_requested", reconciliation_notes: reconciliationNotes };
  const { error: updateError } = await supabaseAdmin.from("payments").update(paymentUpdate).eq("id", payment.id);
  if (updateError) return NextResponse.json({ error: "Could not record the reconciliation decision." }, { status: 500 });

  // A rejected notice returns the quote to payable state; clarification retains
  // EFT-submitted status so finance staff can identify the active exception.
  if (isRejected) {
    await supabaseAdmin.from("quotes").update({ status: "pending" }).eq("id", quote.id).eq("status", "eft_submitted");
  }
  await supabaseAdmin.from("payment_reconciliation_events").insert({
    payment_id: payment.id,
    quote_id: quote.id,
    company_id: quote.company_id,
    event_type: isRejected ? "rejected" : "clarification_requested",
    expected_amount: expectedAmount,
    submitted_amount: submittedAmount,
    variance_amount: varianceAmount,
    eft_reference: payment.eft_reference || payment.reference,
    notes: reconciliationNotes,
    performed_by: adminIdentity,
    created_at: now,
  });

  const clientEmail = company?.contact_email || company?.email;
  if (clientEmail && process.env.BREVO_SMTP_PASSWORD) {
    try {
      const heading = isRejected ? "EFT payment notice not approved" : "More information needed to verify your EFT";
      const action = isRejected ? "Please submit a new EFT notice after resolving the issue." : "Please reply via your dashboard with corrected payment information or proof.";
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "Green Freight Academy",
        to: clientEmail,
        subject: `${heading} — ${quote.reference}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#d97706">${heading}</h2><p>We could not complete verification for quote <strong>${quote.reference}</strong>.</p><p><strong>Finance note:</strong> ${reconciliationNotes}</p><p>${action}</p></div>`,
      });
    } catch (error) { console.error("EFT reconciliation client email error:", error); }
  }

  return NextResponse.json({ ok: true, status: isRejected ? "rejected" : "clarification_requested" });
}
