-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Training Campaign Lifecycle
-- Adds training_campaigns table, links enrolments to campaigns,
-- adds HR feedback fields on enrolments, and credit_balance on companies.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. training_campaigns table
CREATE TABLE IF NOT EXISTS training_campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              text NOT NULL,
  duration_days     integer NOT NULL DEFAULT 30,
  start_date        timestamptz,
  end_date          timestamptz,
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'active', 'closed')),
  closed_at         timestamptz,
  refunded_credits  numeric(10,2) DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_campaigns_company
  ON training_campaigns(company_id);

-- 2. Link enrolments to campaigns + HR feedback fields
ALTER TABLE enrolments
  ADD COLUMN IF NOT EXISTS campaign_id               uuid REFERENCES training_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hr_feedback_understanding integer CHECK (hr_feedback_understanding BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS hr_feedback_enjoyment     integer CHECK (hr_feedback_enjoyment BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS hr_feedback_more_learning integer CHECK (hr_feedback_more_learning BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS hr_feedback_submitted_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_enrolments_campaign
  ON enrolments(campaign_id);

-- 3. Credit balance on companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS credit_balance numeric(10,2) NOT NULL DEFAULT 0;

-- 4. Row-level security: companies can only see their own campaigns
ALTER TABLE training_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'training_campaigns'
    AND policyname = 'company_own_campaigns'
  ) THEN
    CREATE POLICY "company_own_campaigns"
      ON training_campaigns
      FOR ALL
      USING (company_id = (
        SELECT id FROM companies
        WHERE id = training_campaigns.company_id
      ));
  END IF;
END
$$;
