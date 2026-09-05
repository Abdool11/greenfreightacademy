import { supabaseAdmin } from "@/lib/supabase";

export interface CreditAllocationResult {
  allocated: boolean;
  creditCount: number;
}

/**
 * Allocates the seats purchased on one quote exactly once.
 *
 * The database function is the concurrency boundary: it inserts a unique
 * allocation row for the payment before atomically increasing the company
 * balance. Repeated Paystack callbacks or browser verification requests
 * therefore return allocated=false and never increase credits twice.
 */
export async function allocateQuoteCreditsOnce(params: {
  paymentId: string;
  quoteId: string;
  companyId: string;
}): Promise<CreditAllocationResult> {
  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("line_items")
    .eq("id", params.quoteId)
    .eq("company_id", params.companyId)
    .single();

  if (quoteError || !quote) {
    throw new Error(`Unable to load quote for credit allocation: ${quoteError?.message ?? "not found"}`);
  }

  const creditCount = Array.isArray(quote.line_items) ? quote.line_items.length : 0;
  if (creditCount === 0) return { allocated: false, creditCount: 0 };

  const { data, error } = await supabaseAdmin.rpc("allocate_quote_credits_once", {
    p_payment_id: params.paymentId,
    p_quote_id: params.quoteId,
    p_company_id: params.companyId,
    p_credit_count: creditCount,
  });

  if (error) {
    throw new Error(`Credit allocation failed: ${error.message}`);
  }

  return { allocated: Boolean(data), creditCount };
}
