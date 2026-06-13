-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Schema Gaps Fix
-- Date: 2026-05-05
-- Purpose: Adds all tables and columns referenced in GFA/BD code that were
--          missing from the base schema (20260501_base_schema.sql).
--          Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- =============================================================================
-- 1. bulletin_campaigns
-- Referenced by: disseminate/route.ts, campaign/route.ts, interactions/route.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS bulletin_campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id           UUID REFERENCES bulletins(id) ON DELETE CASCADE,
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE,
  total_targeted        INT DEFAULT 0,
  total_delivered       INT DEFAULT 0,
  total_opened          INT DEFAULT 0,
  total_acknowledged    INT DEFAULT 0,
  total_check_completed INT DEFAULT 0,
  total_feedback_submitted INT DEFAULT 0,
  notification_fields   JSONB,
  disseminated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bulletin_campaigns_bulletin ON bulletin_campaigns(bulletin_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_campaigns_company ON bulletin_campaigns(company_id);

-- =============================================================================
-- 2. campaign_logs
-- Referenced by: admin/campaigns/route.ts, admin/funnel/route.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS campaign_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID,
  lead_id       UUID REFERENCES prospect_leads(id) ON DELETE SET NULL,
  lead_count    INT DEFAULT 0,
  sent_count    INT DEFAULT 0,
  seats         INT DEFAULT 0,
  expires_days  INT DEFAULT 30,
  send_via      TEXT,               -- 'email', 'whatsapp', 'both'
  channel       TEXT,               -- alias for send_via (used in funnel route)
  status        TEXT DEFAULT 'sent',
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_created ON campaign_logs(created_at DESC);

-- =============================================================================
-- 3. cpd_library
-- Referenced by: bulletins/cpd-library/route.ts, admin/super/route.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS cpd_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT,
  description   TEXT,
  why_relevant  TEXT,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'active',  -- 'active', 'archived'
  gfa_notes     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpd_library_status ON cpd_library(status);

-- =============================================================================
-- 4. cpd_library_items
-- Referenced by: bulletins/submit/route.ts, admin/cpd-queue/route.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS cpd_library_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id           UUID REFERENCES bulletins(id) ON DELETE CASCADE,
  company_id            UUID REFERENCES companies(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  category              TEXT,
  description           TEXT,
  why_relevant          TEXT,
  source_company_name   TEXT,
  shared_anonymously    BOOLEAN DEFAULT FALSE,
  image_urls            JSONB,
  status                TEXT DEFAULT 'pending_review',
                        -- 'pending_review', 'approved', 'rejected'
  is_urgent_contribution BOOLEAN DEFAULT FALSE,
  admin_notes           TEXT,
  reviewed_by           UUID,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpd_library_items_status ON cpd_library_items(status);

-- =============================================================================
-- 5. gfa_admins
-- Referenced by: lib/auth.ts (getAdminSession)
-- =============================================================================
CREATE TABLE IF NOT EXISTS gfa_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',  -- 'admin', 'super_admin'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. bulletins — add missing columns referenced in submit/route.ts
-- =============================================================================
ALTER TABLE bulletins
  ADD COLUMN IF NOT EXISTS category              TEXT,
  ADD COLUMN IF NOT EXISTS date_observed         DATE,
  ADD COLUMN IF NOT EXISTS description           TEXT,
  ADD COLUMN IF NOT EXISTS why_it_matters        TEXT,
  ADD COLUMN IF NOT EXISTS mitigation_message    TEXT,
  ADD COLUMN IF NOT EXISTS driver_action         JSONB,
  ADD COLUMN IF NOT EXISTS distribution          TEXT DEFAULT 'cpd_library',
  ADD COLUMN IF NOT EXISTS audience_type         TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS audience_ids          JSONB,
  ADD COLUMN IF NOT EXISTS confidential          BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS supporting_file_url   TEXT,
  ADD COLUMN IF NOT EXISTS image_urls            JSONB,
  ADD COLUMN IF NOT EXISTS disseminated_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deadline          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_user_id    UUID;

-- =============================================================================
-- 7. driver_bulletin_interactions — add missing columns
-- Referenced by: interactions/route.ts (status, campaign_id, opened_at, etc.)
-- =============================================================================
ALTER TABLE driver_bulletin_interactions
  ADD COLUMN IF NOT EXISTS campaign_id              UUID REFERENCES bulletin_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status                   TEXT DEFAULT 'new',
                           -- 'new','opened','acknowledged','check_completed','completed'
  ADD COLUMN IF NOT EXISTS delivered_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_completed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS understanding_questions  JSONB,
  ADD COLUMN IF NOT EXISTS understanding_responses  JSONB,
  ADD COLUMN IF NOT EXISTS understanding_score      INT,
  ADD COLUMN IF NOT EXISTS feedback_comment         TEXT,
  ADD COLUMN IF NOT EXISTS feedback_type            TEXT,
  ADD COLUMN IF NOT EXISTS updated_at               TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dbi_campaign ON driver_bulletin_interactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dbi_status ON driver_bulletin_interactions(status);

-- =============================================================================
-- 8. prospect_leads — add missing columns
-- Referenced by: admin/leads/route.ts, admin/funnel/route.ts
-- =============================================================================
ALTER TABLE prospect_leads
  ADD COLUMN IF NOT EXISTS company_name      TEXT,
  ADD COLUMN IF NOT EXISTS contact_name      TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS stage             TEXT DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS last_activity_at  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS voucher_id        UUID REFERENCES trial_vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by        UUID;

-- =============================================================================
-- 9. admin_audit_log — add target_type / target_id aliases
-- Code uses target_type/target_id; schema has entity_type/entity_id.
-- Add both so either naming convention works.
-- =============================================================================
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS target_type  TEXT,
  ADD COLUMN IF NOT EXISTS target_id    TEXT;

-- =============================================================================
-- 10. moodle_webhook_log
-- Created by 20260504_moodle_integration.sql but included here for combined run
-- =============================================================================
CREATE TABLE IF NOT EXISTS moodle_webhook_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moodle_user_id  INTEGER,
  course_id       INTEGER,
  event_type      TEXT,
  completion_state INTEGER,
  payload         JSONB,
  processed       BOOLEAN DEFAULT FALSE,
  error           TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_log_received ON moodle_webhook_log(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_user ON moodle_webhook_log(moodle_user_id);

-- =============================================================================
-- END OF GAPS FIX MIGRATION
-- =============================================================================
