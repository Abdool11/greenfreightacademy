-- =============================================================================
-- MIGRATION: 20260506_column_gaps_fix.sql
-- Fixes all column-level gaps identified by full code audit (May 2026)
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards
-- =============================================================================

-- =============================================================================
-- 1. companies — add all columns used in auth, registration, and trial flows
-- =============================================================================
-- register/route.ts inserts: name, contact_name, contact_email, contact_phone,
--   fleet_size, password_hash, status
-- trial/activate/route.ts inserts: contact_name, email (already exists),
--   password_hash, account_type, trial_seats, trial_expires_at, status
-- stats/route.ts filters on: status = 'active'
-- vouchers/route.ts updates: account_type, trial_expires_at
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contact_name      TEXT,
  ADD COLUMN IF NOT EXISTS contact_email     TEXT,          -- alias; code uses both 'email' and 'contact_email'
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS fleet_size        INT,
  ADD COLUMN IF NOT EXISTS password_hash     TEXT,
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'active',   -- 'active', 'suspended', 'trial'
  ADD COLUMN IF NOT EXISTS trial_seats       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_expires_at  TIMESTAMPTZ;

-- Create index on status for fast filtering
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_contact_email ON companies(contact_email);

-- =============================================================================
-- 2. quotes — add reference_number alias, line_items, eft_reference
-- =============================================================================
-- admin/super/route.ts selects: reference_number, line_items, eft_reference
-- company/quote/route.ts inserts: line_items (JSONB), reference (already exists)
-- The code uses both 'reference' and 'reference_number' — add the alias column
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS reference_number  TEXT,          -- alias for reference; populated by trigger below
  ADD COLUMN IF NOT EXISTS line_items        JSONB,         -- structured line items for display
  ADD COLUMN IF NOT EXISTS eft_reference     TEXT;          -- EFT payment reference from company

-- Backfill reference_number from reference for any existing rows
UPDATE quotes SET reference_number = reference WHERE reference_number IS NULL AND reference IS NOT NULL;

-- Trigger to keep reference_number in sync with reference going forward
CREATE OR REPLACE FUNCTION sync_quote_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference_number IS NULL THEN
    NEW.reference_number := NEW.reference;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_quote_reference_number ON quotes;
CREATE TRIGGER trg_sync_quote_reference_number
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION sync_quote_reference_number();

-- =============================================================================
-- 3. courses — add all columns used in admin/programmes/route.ts
-- =============================================================================
-- programmes/route.ts inserts/updates: price_model, duration_weeks,
--   module_count, cpd_frequency, audience, status
-- Code uses .eq('status', 'archived') — schema has is_active (boolean)
-- Add status column; keep is_active for backward compat
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS price_model      TEXT DEFAULT 'per_driver_per_month',
  ADD COLUMN IF NOT EXISTS duration_weeks   INT,
  ADD COLUMN IF NOT EXISTS module_count     INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS cpd_frequency    TEXT DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS audience         TEXT DEFAULT 'drivers',
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'active';   -- 'active', 'archived'

-- Backfill status from is_active for existing rows
UPDATE courses SET status = CASE WHEN is_active = TRUE THEN 'active' ELSE 'archived' END
  WHERE status IS NULL OR status = 'active';

-- =============================================================================
-- 4. trial_vouchers — add all columns used in vouchers/route.ts
-- =============================================================================
-- vouchers/route.ts selects: expires_days, welcome_message, brochure_url,
--   status, activated_at, notes
-- vouchers/route.ts inserts: expires_days, welcome_message, brochure_url
-- vouchers/route.ts updates: status, sent_at, activated_at (via trial/activate),
--   company_id, converted_at, converted_by
ALTER TABLE trial_vouchers
  ADD COLUMN IF NOT EXISTS expires_days     INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS welcome_message  TEXT,
  ADD COLUMN IF NOT EXISTS brochure_url     TEXT,
  ADD COLUMN IF NOT EXISTS sent_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_by     UUID,
  ADD COLUMN IF NOT EXISTS notes            TEXT;

-- =============================================================================
-- 5. site_config — add description column used in admin/stats/route.ts upsert
-- =============================================================================
-- admin/stats/route.ts upserts: { key, value, description }
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS description  TEXT;

-- =============================================================================
-- 6. gfa_admins — ensure adminId field maps correctly
-- =============================================================================
-- auth.ts returns session.adminId but programmes/route.ts uses session.id
-- The session object has adminId (not id) — this is a code issue, not schema.
-- Schema is correct. Note added for developer awareness.
-- No schema change needed here; fix is in code (see note below).

-- =============================================================================
-- 7. prospect_leads — ensure assigned_to column exists (PATCH uses it)
-- =============================================================================
-- leads/route.ts PATCH updates: assigned_to
ALTER TABLE prospect_leads
  ADD COLUMN IF NOT EXISTS assigned_to  UUID;

-- =============================================================================
-- 8. Seed site_config with all keys required by admin/stats/route.ts
-- =============================================================================
INSERT INTO site_config (key, value, description) VALUES
  ('stats_companies_mode',      'static',  'live = count from DB; static = use override value'),
  ('stats_companies_static',    '7',       'Static company count shown on public stats strip'),
  ('stats_drivers_mode',        'static',  'live = count from DB; static = use override value'),
  ('stats_drivers_static',      '252',     'Static driver count shown on public stats strip'),
  ('stats_certificates_mode',   'static',  'live = count from DB; static = use override value'),
  ('stats_certificates_static', '207',     'Static certificate count shown on public stats strip'),
  ('stats_workshops_mode',      'static',  'live = count from DB; static = use override value'),
  ('stats_workshops_static',    '34',      'Static workshop count shown on public stats strip'),
  ('contact_email',             'durbanroadtransport@gmail.com', 'Contact email shown across all three sites'),
  ('bulletin_fee',              '500',     'Default fee (ZAR) for urgent private bulletins'),
  ('whatsapp_phone_id',         '',        'Meta WhatsApp Business phone number ID'),
  ('whatsapp_access_token',     '',        'Meta WhatsApp Business access token'),
  ('email_booking_to',          'durbanroadtransport@gmail.com', 'Admin email for booking notifications'),
  ('company_name',              'GreenFreightAcademy', 'Company name for quotes and invoices'),
  ('company_vat_number',        '',        'VAT number for quotes and invoices'),
  ('company_address',           '',        'Company address for quotes and invoices'),
  ('company_bank_name',         '',        'Bank name for EFT payment details'),
  ('company_bank_account',      '',        'Bank account number for EFT'),
  ('company_bank_branch',       '',        'Bank branch code for EFT'),
  ('company_email',             'info@greenfreightacademy.com', 'Public contact email'),
  ('company_phone',             '',        'Public contact phone number')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
