-- =============================================================================
-- RELEASE 8: Commercial Invoices, Configurable VAT & Document Snapshots
-- Safe to run repeatedly. Additive only; preserves historic quotes and payments.
-- =============================================================================

-- ─── 1. Supplier commercial settings ───────────────────────────────────────────
-- These settings are copied into quote/invoice snapshots at issue time. The VAT
-- rate defaults to the historic GFA calculation rate so current quote behaviour
-- does not change when this migration is applied.
INSERT INTO site_config (key, value, description) VALUES
  ('company_vat_rate', '15', 'VAT percentage applied to newly issued GFA commercial documents; confirm with a tax professional before changing'),
  ('invoice_due_days', '14', 'Default calendar days from issue date to invoice due date'),
  ('invoice_payment_terms', 'Payment is due by the date stated on this invoice.', 'Default payment terms copied into newly issued invoices')
ON CONFLICT (key) DO NOTHING;

-- ─── 2. Concurrency-safe annual invoice number sequence ─────────────────────────
CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  invoice_year  INTEGER PRIMARY KEY,
  last_number   INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION next_gfa_invoice_number(p_issued_at TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER;
  v_sequence INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM COALESCE(p_issued_at, NOW()) AT TIME ZONE 'Africa/Johannesburg')::INTEGER;

  INSERT INTO invoice_number_sequences (invoice_year, last_number, updated_at)
  VALUES (v_year, 1, NOW())
  ON CONFLICT (invoice_year) DO UPDATE
    SET last_number = invoice_number_sequences.last_number + 1,
        updated_at = NOW()
  RETURNING last_number INTO v_sequence;

  RETURN format('GFA-INV-%s-%s', v_year, LPAD(v_sequence::TEXT, 4, '0'));
END;
$$;

-- ─── 3. Immutable invoice records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                 UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  source_quote_id            UUID UNIQUE REFERENCES quotes(id) ON DELETE SET NULL,
  invoice_number             TEXT NOT NULL UNIQUE,
  status                     TEXT NOT NULL DEFAULT 'issued'
                               CHECK (status IN ('draft', 'issued', 'part_paid', 'paid', 'void')),
  currency                   TEXT NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  supplier_snapshot          JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_profile_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  line_items                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal                   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat_rate                   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  vat                        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (vat >= 0),
  total                      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid                NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_due                 NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  purchase_order_ref         TEXT,
  cost_centre                TEXT,
  payment_terms              TEXT NOT NULL DEFAULT '',
  issued_at                  TIMESTAMPTZ,
  due_at                     DATE,
  paid_at                    TIMESTAMPTZ,
  voided_at                  TIMESTAMPTZ,
  void_reason                TEXT,
  created_by                 UUID,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_paid <= total),
  CHECK (amount_due = GREATEST(total - amount_paid, 0)),
  CHECK (
    (status <> 'void' OR voided_at IS NOT NULL)
    AND (status <> 'paid' OR amount_due = 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_invoices_company_issued
  ON invoices(company_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due
  ON invoices(status, due_at);
CREATE INDEX IF NOT EXISTS idx_invoices_source_quote
  ON invoices(source_quote_id);

-- ─── 4. Invoice lifecycle evidence and payment allocations ──────────────────────
CREATE TABLE IF NOT EXISTS invoice_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('created', 'issued', 'payment_allocated', 'voided', 'note')),
  actor_id     UUID,
  actor_label  TEXT,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice
  ON invoice_events(invoice_id, created_at DESC);

CREATE TABLE IF NOT EXISTS invoice_payment_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_id   UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allocated_by UUID,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_invoice
  ON invoice_payment_allocations(invoice_id, allocated_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_payment
  ON invoice_payment_allocations(payment_id);

-- ─── 5. Optional direct invoice linkage for existing finance records ────────────
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_invoice_status
  ON payments(invoice_id, status)
  WHERE invoice_id IS NOT NULL;

ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_invoice_created
  ON ledger_entries(invoice_id, created_at DESC)
  WHERE invoice_id IS NOT NULL;

-- ─── 6. Invoice timestamp guard ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION touch_invoice_updated_at();

-- ─── 7. Deny anonymous access; application routes use authenticated sessions or
-- service-role server access and enforce tenant/admin checks in application code. ──
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payment_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'deny_anon_invoices'
  ) THEN
    CREATE POLICY "deny_anon_invoices" ON invoices FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoice_events' AND policyname = 'deny_anon_invoice_events'
  ) THEN
    CREATE POLICY "deny_anon_invoice_events" ON invoice_events FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoice_payment_allocations' AND policyname = 'deny_anon_invoice_payment_allocations'
  ) THEN
    CREATE POLICY "deny_anon_invoice_payment_allocations" ON invoice_payment_allocations FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
END
$$;

-- =============================================================================
-- END RELEASE 8
-- =============================================================================
