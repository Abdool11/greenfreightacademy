-- Fix missing columns on deployments table
-- The live DB was provisioned with an older schema that lacks columns the deploy API needs.

-- quote_id (referenced by deploy API)
ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- deployed_at (referenced by deploy API)
ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ;

-- campaign_id (referenced by deploy API + enrolments)
ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- programme_id and seats were created NOT NULL in the live DB
-- but the deploy API does not provide them. Make them nullable.
ALTER TABLE deployments
  ALTER COLUMN programme_id DROP NOT NULL;
ALTER TABLE deployments
  ALTER COLUMN seats DROP NOT NULL;

-- Ensure the FK exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'deployments_campaign_id_fkey'
  ) THEN
    ALTER TABLE deployments
      ADD CONSTRAINT deployments_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES training_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;
