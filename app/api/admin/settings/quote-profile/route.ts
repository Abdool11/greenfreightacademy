import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { parseVatRate } from "@/lib/commercialTax";

const QUOTE_PROFILE_KEYS = [
  "company_name",
  "company_trading_name",
  "company_registration_number",
  "company_vat_number",
  "company_address",
  "company_email",
  "company_phone",
  "company_bank_name",
  "company_bank_account",
  "company_bank_branch",
  "company_bank_account_holder",
  "company_bank_account_type",
  "company_bank_product_type",
  "quote_validity_days",
  "quote_payment_terms",
  "quote_terms_note",
  "company_vat_rate",
  "invoice_due_days",
  "invoice_payment_terms",
] as const;

type QuoteProfileKey = typeof QUOTE_PROFILE_KEYS[number];

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("site_config")
    .select("key, value")
    .in("key", QUOTE_PROFILE_KEYS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const config: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => { config[row.key] = row.value ?? ""; });
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { config?: Record<string, unknown> };
  const supplied = body.config ?? {};
  const validityDays = Number.parseInt(String(supplied.quote_validity_days ?? "14"), 10);
  const invoiceDueDays = Number.parseInt(String(supplied.invoice_due_days ?? "14"), 10);
  const rawVatRate = String(supplied.company_vat_rate ?? "15").trim();
  const vatRate = parseVatRate(rawVatRate, -1);
  if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 365) {
    return NextResponse.json({ error: "Quote validity must be between 1 and 365 days." }, { status: 400 });
  }
  if (!Number.isFinite(invoiceDueDays) || invoiceDueDays < 0 || invoiceDueDays > 365) {
    return NextResponse.json({ error: "Invoice payment due days must be between 0 and 365." }, { status: 400 });
  }
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
    return NextResponse.json({ error: "VAT percentage must be between 0 and 100." }, { status: 400 });
  }

  const values: Record<QuoteProfileKey, string> = {
    ...(Object.fromEntries(QUOTE_PROFILE_KEYS.map((key) => [key, String(supplied[key] ?? "").trim()])) as Record<QuoteProfileKey, string>),
    quote_validity_days: String(validityDays),
    invoice_due_days: String(invoiceDueDays),
    company_vat_rate: String(vatRate),
  };
  const upserts = QUOTE_PROFILE_KEYS.map((key: QuoteProfileKey) => ({
    key,
    value: values[key],
    description: `Formal commercial document configuration: ${key}`,
  }));

  const { error } = await supabaseAdmin
    .from("site_config")
    .upsert(upserts, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
