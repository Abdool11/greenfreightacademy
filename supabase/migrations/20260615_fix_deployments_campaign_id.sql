-- Fix missing campaign_id column on deployments table
-- (The base schema includes it, but some DBs were provisioned before it was added.)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE deployments ADD COLUMN campaign_id UUID;
  END IF;
END $$;

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
