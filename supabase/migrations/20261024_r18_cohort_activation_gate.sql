-- ─────────────────────────────────────────────────────────────────────────────
-- Release 18 — Cohort Activation Gate
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin → Cohort Approvals is the only path that may send driver invitations.
-- A cohort becomes activatable once finance has confirmed payment, and becomes
-- live when the cohort is activated.
--
-- Safe to run repeatedly.

-- ─── 1. Cohort activation gate ───────────────────────────────────────────────
-- Application code writes approval_status explicitly on every insert. This moves
-- the column default so that any future insert which forgets to set it cannot
-- silently create a live cohort and bypass the gate.
--
-- Existing rows are deliberately left untouched: cohorts already live stay live,
-- and a cohort that was awaiting finance is moved to 'payment_received' by the
-- EFT reconciliation flow, not by this migration.

ALTER TABLE deployments
  ALTER COLUMN approval_status SET DEFAULT 'payment_received';

COMMENT ON COLUMN deployments.approval_status IS
  'Cohort activation gate. pending_payment = awaiting finance confirmation; payment_received = activatable; live = invitations sent; completed = training finished.';

-- ─── 2. Payment confirmation columns (schema drift repair) ───────────────────
-- The Cohort Approvals board selects payment_method, payment_reference,
-- payment_amount and payment_confirmed_at from deployments, and renders them on
-- every row. These columns exist in the live database but were never captured in
-- a migration, so a database rebuilt from this repository returns a PostgREST
-- error for the unknown columns and the board renders empty with no explanation.
--
-- Added idempotently, so this is a no-op where they already exist. No existing
-- value is modified.

ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS payment_method       TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference    TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount       NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN deployments.payment_confirmed_at IS
  'When a GFA administrator or the finance reconciliation flow confirmed the payment that activates this cohort.';
