-- =============================================================================
-- Setup tokens for trial account onboarding
-- Allows admin to create trial companies with credits, company sets own password
-- via a setup link sent in the welcome email.
-- =============================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS setup_token       UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS setup_expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS setup_token_used  BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_companies_setup_token ON companies(setup_token) WHERE setup_token_used = FALSE;
