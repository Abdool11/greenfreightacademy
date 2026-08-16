-- =============================================================================
-- RELEASE 2: EFT Reconciliation & Payment-Approval Controls
-- Safe to re-run. Adds only additive payment-control fields and audit records.
-- =============================================================================

-- ─── 1. Expand payment records with submitted-EFT and reconciliation evidence ──
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS eft_reference              TEXT,
  ADD COLUMN IF NOT EXISTS eft_date                   DATE,
  ADD COLUMN IF NOT EXISTS notes                      TEXT,
  ADD COLUMN IF NOT EXISTS proof_url                  TEXT,
  ADD COLUMN IF NOT EXISTS proof_file_name            TEXT,
  ADD COLUMN IF NOT EXISTS expected_amount_snapshot   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS variance_amount            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bank_transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS bank_transaction_date      DATE,
  ADD COLUMN IF NOT EXISTS reconciliation_notes       TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_status      TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS reconciled_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by              TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by                TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason           TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_quote_status ON payments(quote_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_eft_reference ON payments(eft_reference);
CREATE INDEX IF NOT EXISTS idx_payments_reconciliation_status ON payments(reconciliation_status);

-- ─── 2. Immutable audit trail for all payment-reconciliation decisions ─────────
CREATE TABLE IF NOT EXISTS payment_reconciliation_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id           UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  quote_id             UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type           TEXT NOT NULL,
  -- submitted | clarification_requested | confirmed | rejected | variance_noted
  expected_amount      NUMERIC(12,2),
  submitted_amount     NUMERIC(12,2),
  variance_amount      NUMERIC(12,2),
  eft_reference        TEXT,
  notes                TEXT,
  performed_by         TEXT NOT NULL DEFAULT 'system',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_payment
  ON payment_reconciliation_events(payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_quote
  ON payment_reconciliation_events(quote_id, created_at DESC);

-- ─── 3. Private server-managed bucket for payment proof files ──────────────────
-- Proof files are uploaded only through authenticated server routes using the
-- Supabase service role. No public object policy is created.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  FALSE,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- END RELEASE 2 MIGRATION
-- =============================================================================
