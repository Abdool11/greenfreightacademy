-- =============================================================================
-- RELEASE 1: Billing Profiles, Formal Quote Snapshots & Configurable Terms
-- Safe to run repeatedly. All additions are additive and preserve existing data.
-- =============================================================================

-- ─── 1. Client billing profiles ────────────────────────────────────────────────
-- One current billing profile per company. Formal quote data is copied into a
-- quote snapshot at issue time so later profile edits never alter historic quotes.
CREATE TABLE IF NOT EXISTS company_billing_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  legal_entity_name     TEXT NOT NULL,
  trading_name          TEXT,
  registration_number   TEXT,
  vat_registered        BOOLEAN NOT NULL DEFAULT FALSE,
  vat_number            TEXT,
  billing_address       TEXT NOT NULL,
  accounts_contact_name TEXT NOT NULL,
  accounts_email        TEXT NOT NULL,
  accounts_phone        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_billing_profiles_company
  ON company_billing_profiles(company_id);

-- ─── 2. Immutable quote-version records ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_versions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id           UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  version_number     INT NOT NULL,
  reference          TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'issued',
  line_items         JSONB NOT NULL DEFAULT '[]'::jsonb,
  billing_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  supplier_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtotal           NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat                NUMERIC(12,2) NOT NULL DEFAULT 0,
  total              NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until        DATE,
  purchase_order_ref TEXT,
  cost_centre        TEXT,
  issued_by          UUID,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_quote_versions_quote
  ON quote_versions(quote_id, version_number DESC);

-- ─── 3. Current formal-quote control fields ────────────────────────────────────
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quote_version             INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valid_until               DATE,
  ADD COLUMN IF NOT EXISTS billing_profile_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supplier_snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS purchase_order_ref        TEXT,
  ADD COLUMN IF NOT EXISTS cost_centre               TEXT,
  ADD COLUMN IF NOT EXISTS supersedes_quote_id       UUID REFERENCES quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issued_at                 TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);

-- ─── 4. Supplier and quote-term configuration ──────────────────────────────────
-- Existing company_name/company_vat_number/company_address/company_email/company_phone
-- remain the primary supplier fields. The entries below add formal procurement details.
INSERT INTO site_config (key, value, description) VALUES
  ('company_trading_name', '', 'Optional supplier trading name shown on formal quotes'),
  ('company_registration_number', '', 'Supplier registration number shown on formal quotes'),
  ('quote_validity_days', '14', 'Default number of calendar days a newly issued formal quote remains valid'),
  ('quote_payment_terms', 'Payment is required before training is deployed.', 'Formal payment terms shown on quotations'),
  ('quote_terms_note', '', 'Optional commercial terms or procurement note shown on quotations')
ON CONFLICT (key) DO NOTHING;

-- ─── 5. Updated-at helper for billing profiles ──────────────────────────────────
CREATE OR REPLACE FUNCTION touch_company_billing_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_billing_profiles_updated_at ON company_billing_profiles;
CREATE TRIGGER trg_company_billing_profiles_updated_at
  BEFORE UPDATE ON company_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_company_billing_profile_updated_at();

-- =============================================================================
-- END RELEASE 1 MIGRATION
-- =============================================================================
