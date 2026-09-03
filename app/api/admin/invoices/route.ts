import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSupplierProfile } from "@/lib/quoteProfiles";
import { deriveVatRate, formatVatLabel } from "@/lib/commercialTax";
import { writeLedgerEntry } from "@/lib/adminNotify";

export const dynamic = "force-dynamic";

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
);
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const addCalendarDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
};

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const companyId = clean(req.nextUrl.searchParams.get("companyId"));
  let query = supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, company_id, source_quote_id, status, subtotal, vat_rate, vat, total, amount_paid, amount_due, issued_at, due_at, paid_at, created_at, companies(name)")
    .order("created_at", { ascending: false })
    .limit(250);
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json() as { quoteId?: string };
  const quoteId = clean(body.quoteId);
  if (!quoteId) return NextResponse.json({ error: "quoteId is required." }, { status: 400 });

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("id, company_id, reference, status, line_items, subtotal, vat, total, billing_profile_snapshot, supplier_snapshot, purchase_order_ref, cost_centre, issued_at, created_at")
    .eq("id", quoteId)
    .single();
  if (quoteError || !quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  if (!['pending', 'eft_submitted', 'approved'].includes(String(quote.status))) {
    return NextResponse.json({ error: "Only active or approved quotes can be invoiced." }, { status: 409 });
  }

  const { data: existingInvoice, error: existingInvoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number")
    .eq("source_quote_id", quote.id)
    .maybeSingle();
  if (existingInvoiceError) return NextResponse.json({ error: existingInvoiceError.message }, { status: 500 });
  if (existingInvoice) {
    return NextResponse.json({ error: "An invoice already exists for this quote.", invoiceId: existingInvoice.id, invoiceNumber: existingInvoice.invoice_number }, { status: 409 });
  }

  const [supplier, { data: currentBilling }] = await Promise.all([
    getSupplierProfile(),
    supabaseAdmin.from("company_billing_profiles").select("*").eq("company_id", quote.company_id).maybeSingle(),
  ]);
  const quoteSupplierSnapshot = asRecord(quote.supplier_snapshot);
  const quoteBillingSnapshot = asRecord(quote.billing_profile_snapshot);
  const billingSnapshot = Object.keys(quoteBillingSnapshot).length > 0 ? quoteBillingSnapshot : (currentBilling ?? {});
  if (!Object.keys(billingSnapshot).length) {
    return NextResponse.json({ error: "A company billing profile is required before issuing an invoice." }, { status: 409 });
  }

  const subtotal = Number(quote.subtotal ?? 0);
  const vat = Number(quote.vat ?? 0);
  const total = Number(quote.total ?? 0);
  if (subtotal < 0 || vat < 0 || total < 0 || Math.round((subtotal + vat - total) * 100) !== 0) {
    return NextResponse.json({ error: "The source quote has invalid commercial totals and cannot be invoiced." }, { status: 409 });
  }

  const issuedAt = new Date();
  const vatRate = deriveVatRate(subtotal, vat, supplier.vat_rate);
  const supplierSnapshot = {
    ...supplier,
    ...quoteSupplierSnapshot,
    vat_rate: vatRate,
    invoice_due_days: supplier.invoice_due_days,
    invoice_payment_terms: supplier.invoice_payment_terms,
  };
  const { data: invoiceNumber, error: numberError } = await supabaseAdmin.rpc("next_gfa_invoice_number", { p_issued_at: issuedAt.toISOString() });
  if (numberError || !invoiceNumber) {
    return NextResponse.json({ error: numberError?.message || "Could not allocate an invoice number. Run the GFA commercial-invoice migration first." }, { status: 500 });
  }

  const dueAt = addCalendarDays(issuedAt, supplier.invoice_due_days);
  const { data: confirmedPayments, error: paymentLookupError } = await supabaseAdmin
    .from("payments")
    .select("id, amount, status, created_at")
    .eq("quote_id", quote.id)
    .in("status", ["confirmed", "paid"])
    .order("created_at", { ascending: true });
  if (paymentLookupError) return NextResponse.json({ error: paymentLookupError.message }, { status: 500 });

  let remaining = total;
  const allocations = (confirmedPayments ?? []).flatMap((payment: { id: string; amount: number }) => {
    const allocation = Math.min(Math.max(Number(payment.amount) || 0, 0), Math.max(remaining, 0));
    remaining = Math.max(remaining - allocation, 0);
    return allocation > 0 ? [{ payment_id: payment.id, amount: allocation }] : [];
  });
  const amountPaid = Math.round((total - remaining) * 100) / 100;
  const amountDue = Math.round(remaining * 100) / 100;
  const status = amountDue === 0 ? "paid" : amountPaid > 0 ? "part_paid" : "issued";

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .insert({
      company_id: quote.company_id,
      source_quote_id: quote.id,
      invoice_number: String(invoiceNumber),
      status,
      currency: "ZAR",
      supplier_snapshot: supplierSnapshot,
      billing_profile_snapshot: billingSnapshot,
      line_items: Array.isArray(quote.line_items) ? quote.line_items : [],
      subtotal,
      vat_rate: vatRate,
      vat,
      total,
      amount_paid: amountPaid,
      amount_due: amountDue,
      purchase_order_ref: quote.purchase_order_ref || null,
      cost_centre: quote.cost_centre || null,
      payment_terms: supplier.invoice_payment_terms,
      issued_at: issuedAt.toISOString(),
      due_at: dueAt,
      paid_at: amountDue === 0 && amountPaid > 0 ? issuedAt.toISOString() : null,
      created_by: session.adminId,
    })
    .select()
    .single();
  if (invoiceError || !invoice) return NextResponse.json({ error: invoiceError?.message || "Could not issue invoice." }, { status: 500 });

  const eventResult = await supabaseAdmin.from("invoice_events").insert({
    invoice_id: invoice.id,
    event_type: "issued",
    actor_id: session.adminId,
    actor_label: session.name || session.email,
    details: {
      source_quote_id: quote.id,
      source_quote_reference: quote.reference,
      invoice_number: invoice.invoice_number,
      vat_label: formatVatLabel(vatRate),
      total,
    },
  });
  if (eventResult.error) console.error("Invoice event record error:", eventResult.error);

  if (allocations.length > 0) {
    const { error: allocationError } = await supabaseAdmin
      .from("invoice_payment_allocations")
      .insert(allocations.map((allocation) => ({
        invoice_id: invoice.id,
        payment_id: allocation.payment_id,
        amount: allocation.amount,
        allocated_by: session.adminId,
        note: "Automatically allocated from confirmed source-quote payment at invoice issue.",
      })));
    if (allocationError) console.error("Invoice allocation record error:", allocationError);

    const paymentIds = allocations.map((allocation) => allocation.payment_id);
    const { error: paymentLinkError } = await supabaseAdmin.from("payments").update({ invoice_id: invoice.id }).in("id", paymentIds);
    if (paymentLinkError) console.error("Invoice payment link error:", paymentLinkError);

    const { error: allocationEventError } = await supabaseAdmin.from("invoice_events").insert({
      invoice_id: invoice.id,
      event_type: "payment_allocated",
      actor_id: session.adminId,
      actor_label: session.name || session.email,
      details: { allocated_amount: amountPaid, allocation_count: allocations.length },
    });
    if (allocationEventError) console.error("Invoice allocation event error:", allocationEventError);
  }

  await writeLedgerEntry({
    company_id: quote.company_id,
    entry_type: "invoice_issued",
    amount: total,
    description: `Invoice issued from quote ${quote.reference} — ${invoice.invoice_number}`,
    reference: invoice.invoice_number,
    quote_id: quote.id,
    invoice_id: invoice.id,
    status: "issued",
    created_by: session.email || "admin",
  });

  return NextResponse.json({ ok: true, invoice });
}
