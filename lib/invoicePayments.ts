import { supabaseAdmin } from "@/lib/supabase";

export async function allocateConfirmedPaymentToInvoice(input: {
  quoteId: string;
  paymentId: string;
  amount: number;
  actorId?: string | null;
  actorLabel?: string | null;
  note?: string;
}) {
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, total, amount_paid, amount_due, status")
    .eq("source_quote_id", input.quoteId)
    .maybeSingle();
  if (invoiceError) throw invoiceError;
  if (!invoice || invoice.status === "void" || Number(invoice.amount_due) <= 0) return { allocated: false, invoiceId: invoice?.id ?? null };

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("invoice_payment_allocations")
    .select("id")
    .eq("payment_id", input.paymentId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { allocated: false, invoiceId: invoice.id };

  const allocation = Math.min(Math.max(Number(input.amount) || 0, 0), Number(invoice.amount_due));
  if (allocation <= 0) return { allocated: false, invoiceId: invoice.id };

  const amountPaid = Math.round((Number(invoice.amount_paid) + allocation) * 100) / 100;
  const amountDue = Math.max(Math.round((Number(invoice.total) - amountPaid) * 100) / 100, 0);
  const status = amountDue === 0 ? "paid" : "part_paid";
  const now = new Date().toISOString();

  const { error: invoiceUpdateError } = await supabaseAdmin
    .from("invoices")
    .update({ amount_paid: amountPaid, amount_due: amountDue, status, paid_at: amountDue === 0 ? now : null })
    .eq("id", invoice.id);
  if (invoiceUpdateError) throw invoiceUpdateError;

  const { error: allocationError } = await supabaseAdmin.from("invoice_payment_allocations").insert({
    invoice_id: invoice.id,
    payment_id: input.paymentId,
    amount: allocation,
    allocated_by: input.actorId || null,
    note: input.note || "Allocated when payment was confirmed.",
  });
  if (allocationError) throw allocationError;

  const { error: paymentLinkError } = await supabaseAdmin.from("payments").update({ invoice_id: invoice.id }).eq("id", input.paymentId);
  if (paymentLinkError) throw paymentLinkError;

  const { error: eventError } = await supabaseAdmin.from("invoice_events").insert({
    invoice_id: invoice.id,
    event_type: "payment_allocated",
    actor_id: input.actorId || null,
    actor_label: input.actorLabel || null,
    details: { payment_id: input.paymentId, allocated_amount: allocation, amount_due: amountDue, status },
  });
  if (eventError) throw eventError;

  return { allocated: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, amountDue, status };
}
