-- ─────────────────────────────────────────────────────────────────────────────
-- Release 18 — Cohort Activation Gate
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin → Cohort Approvals is the only path that may send driver invitations.
-- A cohort becomes activatable once finance has confirmed payment, and becomes
-- live only when a GFA administrator activates it there.
--
-- Application code already writes approval_status explicitly on every insert.
-- This migration moves the column default so that any future insert which forgets
-- to set it cannot silently create a live cohort and bypass the gate.
--
-- Safe to run repeatedly. Existing rows are deliberately left untouched: cohorts
-- already live stay live, and a cohort that was awaiting finance is moved to
-- 'payment_received' by the EFT reconciliation flow, not by this migration.

ALTER TABLE deployments
  ALTER COLUMN approval_status SET DEFAULT 'payment_received';

COMMENT ON COLUMN deployments.approval_status IS
  'Cohort activation gate. pending_payment = awaiting finance confirmation; payment_received = activatable by an administrator; live = invitations sent; completed = training finished. Only Admin -> Cohort Approvals sets live.';
