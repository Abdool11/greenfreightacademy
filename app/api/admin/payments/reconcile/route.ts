import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { adminNotify, writeLedgerEntry } from "@/lib/adminNotify";
import { allocateConfirmedPaymentToInvoice } from "@/lib/invoicePayments";
import { allocateQuoteCreditsOnce } from "@/lib/creditAllocations";

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

  const { data: reconciliationRows, error: reconciliationError } = await supabaseAdmin.rpc(
    "gfa_apply_eft_reconciliation_decision",
    {
      p_payment_id: payment.id,
      p_decision: decision,
      p_admin_id: session.adminId,
      p_admin_label: adminIdentity,
      p_reconciliation_notes: reconciliationNotes || null,
      p_bank_transaction_reference: bankTransactionReference || null,
      p_bank_transaction_date: bankTransactionDate || null,
    }
  );
  const reconciliation = Array.isArray(reconciliationRows) ? reconciliationRows[0] : reconciliationRows;
  if (reconciliationError || !reconciliation?.payment_id) {
    const message = reconciliationError?.message || "Could not record the reconciliation decision.";
    const conflict = /status|variance|reference|note/i.test(message);
    return NextResponse.json(
      { error: conflict ? message : "Could not record the reconciliation decision." },
      { status: conflict ? 409 : 500 }
    );
  }

  if (decision === "confirm") {
    let creditAllocation: Awaited<ReturnType<typeof allocateQuoteCreditsOnce>>;
    try {
      creditAllocation = await allocateQuoteCreditsOnce({
        paymentId: payment.id,
        quoteId: quote.id,
        companyId: quote.company_id,
      });
    } catch (creditError) {
      console.error("EFT credit allocation failed:", creditError);
      return NextResponse.json({ error: "Payment was confirmed but credit allocation failed. Escalate before deployment." }, { status: 500 });
    }
    const creditCount = creditAllocation.creditCount;

    try {
      await allocateConfirmedPaymentToInvoice({
        quoteId: quote.id,
        paymentId: payment.id,
        amount: submittedAmount,
        actorId: session.adminId,
        actorLabel: adminIdentity,
        note: `Allocated after confirmed EFT reconciliation ${bankTransactionReference}.`,
      });
    } catch (invoiceAllocationError) {
      console.error("Invoice allocation after EFT confirmation failed:", invoiceAllocationError);
    }

    if (creditCount > 0 && creditAllocation.allocated) {
      const { data: companyBalance } = await supabaseAdmin
        .from("companies")
        .select("credit_balance")
        .eq("id", quote.company_id)
        .single();
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
        balance_after: Number(companyBalance?.credit_balance ?? 0),
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

    return NextResponse.json({
      ok: true,
      status: "confirmed",
      creditCount,
      reconciliationEventId: reconciliation.reconciliation_event_id,
      ledgerEntryId: reconciliation.ledger_entry_id,
      auditId: reconciliation.audit_id,
    });
  }

  const isRejected = decision === "reject";

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

  return NextResponse.json({
    ok: true,
    status: isRejected ? "rejected" : "clarification_requested",
    reconciliationEventId: reconciliation.reconciliation_event_id,
    ledgerEntryId: reconciliation.ledger_entry_id,
    auditId: reconciliation.audit_id,
  });
}
