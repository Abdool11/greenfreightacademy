-- Add approved_at and approved_by to quotes table
-- Both Paystack auto-approve and EFT manual approval set these fields
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by  TEXT;

COMMENT ON COLUMN quotes.approved_at IS 'Timestamp when quote was approved (auto for Paystack, manual for EFT)';
COMMENT ON COLUMN quotes.approved_by IS 'Who approved: paystack_auto or admin email/UUID';
