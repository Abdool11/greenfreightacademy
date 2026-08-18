import { getConfigs } from "@/lib/supabase";

export interface BillingProfileInput {
  legal_entity_name: string;
  trading_name?: string | null;
  registration_number?: string | null;
  vat_registered: boolean;
  vat_number?: string | null;
  billing_address: string;
  accounts_contact_name: string;
  accounts_email: string;
  accounts_phone?: string | null;
}

export interface BillingProfile extends BillingProfileInput {
  id?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierProfile {
  legal_name: string;
  trading_name: string;
  registration_number: string;
  vat_number: string;
  address: string;
  email: string;
  phone: string;
  bank_name: string;
  bank_account: string;
  bank_branch: string;
  bank_account_holder: string;
  bank_account_type: string;
  bank_product_type: string;
  quote_validity_days: number;
  payment_terms: string;
  terms_note: string;
}

const trim = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function validateBillingProfile(input: Partial<BillingProfileInput>) {
  const profile: BillingProfileInput = {
    legal_entity_name: trim(input.legal_entity_name),
    trading_name: trim(input.trading_name) || null,
    registration_number: trim(input.registration_number) || null,
    vat_registered: Boolean(input.vat_registered),
    vat_number: trim(input.vat_number) || null,
    billing_address: trim(input.billing_address),
    accounts_contact_name: trim(input.accounts_contact_name),
    accounts_email: trim(input.accounts_email),
    accounts_phone: trim(input.accounts_phone) || null,
  };

  const errors: Record<string, string> = {};
  if (!profile.legal_entity_name) errors.legal_entity_name = "Legal entity name is required.";
  if (!profile.billing_address) errors.billing_address = "Billing address is required.";
  if (!profile.accounts_contact_name) errors.accounts_contact_name = "Accounts contact name is required.";
  if (!profile.accounts_email) {
    errors.accounts_email = "Accounts email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(profile.accounts_email)) {
    errors.accounts_email = "Enter a valid accounts email address.";
  }
  if (profile.vat_registered && !profile.vat_number) {
    errors.vat_number = "VAT number is required when the company is VAT registered.";
  }

  return { profile, errors, isValid: Object.keys(errors).length === 0 };
}

export async function getSupplierProfile(): Promise<SupplierProfile> {
  const config = await getConfigs([
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
  ]);

  const parsedValidity = Number.parseInt(config.quote_validity_days ?? "14", 10);
  return {
    legal_name: trim(config.company_name) || "GreenFreightAcademy",
    trading_name: trim(config.company_trading_name),
    registration_number: trim(config.company_registration_number),
    vat_number: trim(config.company_vat_number),
    address: trim(config.company_address),
    email: trim(config.company_email) || "info@greenfreightacademy.com",
    phone: trim(config.company_phone),
    bank_name: trim(config.company_bank_name),
    bank_account: trim(config.company_bank_account),
    bank_branch: trim(config.company_bank_branch),
    bank_account_holder: trim(config.company_bank_account_holder),
    bank_account_type: trim(config.company_bank_account_type),
    bank_product_type: trim(config.company_bank_product_type),
    quote_validity_days: Number.isFinite(parsedValidity) && parsedValidity > 0 ? parsedValidity : 14,
    payment_terms: trim(config.quote_payment_terms) || "Payment is required before training is deployed.",
    terms_note: trim(config.quote_terms_note),
  };
}

export function getQuoteValidUntil(validityDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + validityDays);
  return date.toISOString().slice(0, 10);
}

export function asBillingSnapshot(profile: BillingProfile) {
  return {
    legal_entity_name: profile.legal_entity_name,
    trading_name: profile.trading_name || "",
    registration_number: profile.registration_number || "",
    vat_registered: Boolean(profile.vat_registered),
    vat_number: profile.vat_number || "",
    billing_address: profile.billing_address,
    accounts_contact_name: profile.accounts_contact_name,
    accounts_email: profile.accounts_email,
    accounts_phone: profile.accounts_phone || "",
  };
}
