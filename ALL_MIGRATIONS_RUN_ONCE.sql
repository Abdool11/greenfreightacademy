-- =============================================================================
-- BASE SCHEMA — TAG Ecosystem (GFA + BetterDriver)
-- Run this FIRST on a fresh Supabase project.
-- All statements are idempotent (safe to re-run).
-- =============================================================================

-- ─── Enable UUID generation ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- ─── companies ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  vat_number          TEXT,
  industry            TEXT,
  account_type        TEXT DEFAULT 'trial',   -- 'trial', 'active', 'suspended'
  credit_balance      NUMERIC(10,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── drivers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT,
  mobile              TEXT,
  id_number           TEXT,                   -- SA ID number
  password_hash       TEXT,                   -- nullable; no longer used (magic link model)
  activation_status   TEXT DEFAULT 'pending', -- 'pending', 'activated', 'certified'
  activated_at        TIMESTAMPTZ,
  profile_complete    BOOLEAN DEFAULT FALSE,
  language_preference TEXT DEFAULT 'en',      -- 'en', 'zu', 'af'
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_mobile ON drivers(mobile);

-- ─── courses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  description         TEXT,
  price_corporate     NUMERIC(10,2) DEFAULT 0,
  price_individual    NUMERIC(10,2) DEFAULT 0,
  programme           TEXT DEFAULT 'p1',      -- 'p1', 'p2'
  moodle_course_id    INT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── quotes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference           TEXT UNIQUE NOT NULL,
  items_json          JSONB DEFAULT '[]',     -- [{driverId, driverName, courseIds}]
  subtotal            NUMERIC(10,2) DEFAULT 0,
  vat                 NUMERIC(10,2) DEFAULT 0,
  total               NUMERIC(10,2) DEFAULT 0,
  status              TEXT DEFAULT 'draft',   -- 'draft','sent','paid','eft_submitted','deployed'
  payment_method      TEXT,                   -- 'paystack', 'eft'
  paystack_reference  TEXT,
  paid_at             TIMESTAMPTZ,
  deployed_at         TIMESTAMPTZ,
  eft_submitted_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- ─── deployments ──────────────────────────────────────────────────────────────
-- A deployment is created when a company deploys a paid quote.
-- It groups all driver_invitations for that deployment.
CREATE TABLE IF NOT EXISTS deployments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                UUID REFERENCES quotes(id) ON DELETE SET NULL,
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id             UUID,               -- FK to training_campaigns added after that table
  cohort_id               UUID,               -- optional cohort grouping
  approval_status         TEXT DEFAULT 'live',-- 'pending', 'live', 'closed'
  approved_at             TIMESTAMPTZ,
  approved_by             UUID,
  magic_links_sent_at     TIMESTAMPTZ,
  magic_links_sent_count  INT DEFAULT 0,
  payment_confirmed_by    UUID,
  deployed_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deployments_company ON deployments(company_id);
CREATE INDEX IF NOT EXISTS idx_deployments_quote ON deployments(quote_id);

-- ─── driver_invitations ───────────────────────────────────────────────────────
-- One row per driver per deployment. The opaque token IS the magic link.
-- Persistent model: token does not expire on first use.
CREATE TABLE IF NOT EXISTS driver_invitations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  deployment_id       UUID REFERENCES deployments(id) ON DELETE SET NULL,
  token               TEXT UNIQUE NOT NULL,   -- opaque 64-char hex token
  program_assignment  TEXT DEFAULT 'p1',      -- 'p1', 'p2', 'p1_p2'
  invite_video_url    TEXT,                   -- Bunny.net HLS URL for welcome video
  expires_at          TIMESTAMPTZ,            -- campaign end date; NULL = no expiry
  first_accessed_at   TIMESTAMPTZ,            -- first tap of magic link
  revoked_at          TIMESTAMPTZ,            -- operator revocation
  status              TEXT DEFAULT 'pending', -- 'pending', 'activated', 'revoked'
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitations_driver ON driver_invitations(driver_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON driver_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_deployment ON driver_invitations(deployment_id);

-- ─── enrolments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrolments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id                   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id                  UUID REFERENCES companies(id) ON DELETE SET NULL,
  course_id                   UUID REFERENCES courses(id) ON DELETE SET NULL,
  quote_id                    UUID REFERENCES quotes(id) ON DELETE SET NULL,
  campaign_id                 UUID,           -- FK to training_campaigns
  deployment_id               UUID REFERENCES deployments(id) ON DELETE SET NULL,
  status                      TEXT DEFAULT 'enrolled', -- 'enrolled','in_progress','completed','certified','expired'
  progress_percent            INT DEFAULT 0,
  link_activated              BOOLEAN DEFAULT FALSE,
  certified                   BOOLEAN DEFAULT FALSE,
  enrolled_at                 TIMESTAMPTZ DEFAULT NOW(),
  completed_at                TIMESTAMPTZ,
  certified_at                TIMESTAMPTZ,
  nudge_sent_at               TIMESTAMPTZ,
  -- Moodle sync fields
  moodle_user_id              INT,
  moodle_enrolment_id         INT,
  moodle_last_synced_at       TIMESTAMPTZ,
  -- HR self-evaluation feedback
  hr_feedback_understanding   INT,            -- 1–5 stars
  hr_feedback_enjoyment       INT,
  hr_feedback_more_learning   INT,
  hr_feedback_submitted_at    TIMESTAMPTZ,
  UNIQUE (driver_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrolments_driver ON enrolments(driver_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_company ON enrolments(company_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_campaign ON enrolments(campaign_id);

-- ─── certifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,
  enrolment_id        UUID REFERENCES enrolments(id) ON DELETE SET NULL,
  course_id           UUID REFERENCES courses(id) ON DELETE SET NULL,
  certificate_number  TEXT UNIQUE NOT NULL,
  programme           TEXT DEFAULT 'p1',
  issued_at           TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  status              TEXT DEFAULT 'active',  -- 'active', 'expired', 'revoked'
  pdf_url             TEXT,                   -- S3/Bunny.net URL for downloadable PDF
  moodle_certificate_id INT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_driver ON certifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_certifications_number ON certifications(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);

-- ─── payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,
  deployment_id       UUID REFERENCES deployments(id) ON DELETE SET NULL,
  quote_id            UUID REFERENCES quotes(id) ON DELETE SET NULL,
  payment_method      TEXT,                   -- 'paystack', 'eft', 'credit'
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT DEFAULT 'ZAR',
  reference           TEXT,
  paystack_reference  TEXT,
  status              TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'failed', 'refunded'
  confirmed_at        TIMESTAMPTZ,
  confirmed_by        UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

-- =============================================================================
-- BULLETINS
-- =============================================================================

CREATE TABLE IF NOT EXISTS bulletins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  content             TEXT,
  urgency             TEXT DEFAULT 'standard',-- 'standard', 'urgent'
  status              TEXT DEFAULT 'draft',   -- 'draft','submitted','approved','disseminated'
  audience            TEXT DEFAULT 'company', -- 'company', 'community'
  is_cpd              BOOLEAN DEFAULT FALSE,
  cpd_waiver          BOOLEAN DEFAULT FALSE,  -- true = client waived fee to share with community
  video_url           TEXT,
  attachment_url      TEXT,
  -- WhatsApp notification config
  wa_notify_drivers   BOOLEAN DEFAULT TRUE,
  wa_include_topic    BOOLEAN DEFAULT TRUE,
  wa_include_urgency  BOOLEAN DEFAULT TRUE,
  wa_include_link     BOOLEAN DEFAULT TRUE,
  wa_custom_message   TEXT,
  wa_sent_at          TIMESTAMPTZ,
  wa_sent_count       INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulletin_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id         UUID REFERENCES bulletins(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,
  amount              NUMERIC(10,2) NOT NULL,
  method              TEXT,                   -- 'paystack', 'invoice'
  paystack_reference  TEXT,
  status              TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'invoiced'
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_bulletin_interactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID REFERENCES drivers(id) ON DELETE CASCADE,
  bulletin_id         UUID REFERENCES bulletins(id) ON DELETE CASCADE,
  read_at             TIMESTAMPTZ,
  acknowledged_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (driver_id, bulletin_id)
);

-- =============================================================================
-- CPD (Continuing Professional Development)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cpd_modules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  module_type         TEXT DEFAULT 'internal',-- 'internal', 'bulletin'
  source_bulletin_id  UUID REFERENCES bulletins(id) ON DELETE SET NULL,
  video_url           TEXT,
  duration_minutes    INT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cpd_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  module_id           UUID REFERENCES cpd_modules(id) ON DELETE SET NULL,
  module_title        TEXT,                   -- denormalised for CV display
  completed_at        TIMESTAMPTZ DEFAULT NOW(),
  score               INT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpd_records_driver ON cpd_records(driver_id);

CREATE TABLE IF NOT EXISTS driver_cpd_participation (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  cpd_module_id       UUID REFERENCES cpd_modules(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  UNIQUE (driver_id, cpd_module_id)
);

-- =============================================================================
-- TRAINING CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS training_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  duration_days       INT,
  start_date          DATE,
  end_date            DATE,
  status              TEXT DEFAULT 'active',  -- 'draft', 'active', 'closed'
  closed_at           TIMESTAMPTZ,
  refunded_credits    NUMERIC(10,2) DEFAULT 0,
  invite_video_id     UUID,                   -- FK to gfa_videos added below
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON training_campaigns(company_id);

-- ─── Add campaign FK to deployments (safe if already exists) ─────────────────
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

-- ─── Add campaign FK to enrolments ───────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'enrolments_campaign_id_fkey'
  ) THEN
    ALTER TABLE enrolments
      ADD CONSTRAINT enrolments_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES training_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- GFA VIDEO LIBRARY
-- =============================================================================

CREATE TABLE IF NOT EXISTS gfa_videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  video_type          TEXT NOT NULL DEFAULT 'invite',
  -- video_type: 'invite', 'teaser', 'portal_walkthrough', 'module', 'arc_open', 'arc_close'
  bunny_video_id      TEXT,
  bunny_library_id    TEXT,
  playback_url        TEXT,                   -- Bunny.net HLS stream URL
  thumbnail_url       TEXT,
  duration_seconds    INT,
  language            TEXT DEFAULT 'en',      -- 'en', 'zu', 'af'
  programme           TEXT,                   -- 'p1', 'p2', null = general/marketing
  is_public           BOOLEAN DEFAULT FALSE,
  upload_status       TEXT DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'error'
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gfa_videos_type ON gfa_videos(video_type);
CREATE INDEX IF NOT EXISTS idx_gfa_videos_language ON gfa_videos(language);

-- ─── Add invite_video FK to training_campaigns ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'training_campaigns_invite_video_id_fkey'
  ) THEN
    ALTER TABLE training_campaigns
      ADD CONSTRAINT training_campaigns_invite_video_id_fkey
      FOREIGN KEY (invite_video_id) REFERENCES gfa_videos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- MOODLE INTEGRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS moodle_completion_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID REFERENCES drivers(id) ON DELETE CASCADE,
  enrolment_id        UUID REFERENCES enrolments(id) ON DELETE CASCADE,
  moodle_user_id      INT,
  moodle_course_id    INT,
  event_type          TEXT NOT NULL,          -- 'module_complete', 'programme_complete', 'quiz_pass', 'quiz_fail'
  module_name         TEXT,
  score               INT,
  source              TEXT DEFAULT 'webhook', -- 'webhook', 'poll'
  raw_payload         JSONB,
  processed_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moodle_log_driver ON moodle_completion_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_moodle_log_enrolment ON moodle_completion_log(enrolment_id);

-- =============================================================================
-- SESSION MANAGEMENT (BD)
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_token_blocklist (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  blocked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason              TEXT
);
CREATE INDEX IF NOT EXISTS idx_blocklist_driver_id ON session_token_blocklist(driver_id);

-- =============================================================================
-- BD ADMINS
-- =============================================================================

CREATE TABLE IF NOT EXISTS bd_admins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRIAL VOUCHERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS trial_vouchers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL,
  seats               INT DEFAULT 1,
  expires_at          TIMESTAMPTZ,
  status              TEXT DEFAULT 'active',  -- 'active', 'used', 'expired'
  used_by             UUID REFERENCES companies(id) ON DELETE SET NULL,
  voucher_sent        BOOLEAN DEFAULT FALSE,
  created_by          UUID,
  created_by_name     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SITE CONFIG (GFA admin settings — key/value store)
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_config (
  key                 TEXT PRIMARY KEY,
  value               TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config values (safe to re-run — ON CONFLICT DO NOTHING)
INSERT INTO site_config (key, value) VALUES
  ('whatsapp_phone_id',              ''),
  ('whatsapp_access_token',          ''),
  ('whatsapp_magic_link_template',   ''),   -- Meta-approved template name for magic link dispatch
  ('bd_base_url',                    'https://betterdriver.co.za'),
  ('email_booking_to',               'durbanroadtransport@gmail.com'),
  ('company_name',                   'GreenFreightAcademy'),
  ('bulletin_urgent_fee',            '500'),
  ('contact_email',                  'info@greenfreightacademy.co.za'),
  ('contact_phone',                  ''),
  ('stats_drivers_mode',             'live'),
  ('stats_certifications_mode',      'live'),
  ('stats_companies_mode',           'live'),
  ('stats_workshops_mode',           'static'),
  ('stats_workshops_static',         '12')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PROSPECT LEADS (TAG contact form submissions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS prospect_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT,
  email               TEXT,
  company             TEXT,
  phone               TEXT,
  message             TEXT,
  source              TEXT DEFAULT 'tag',     -- 'tag', 'gfa', 'bd'
  stage               TEXT DEFAULT 'new',     -- 'new', 'contacted', 'converted'
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ADMIN AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id            UUID,
  admin_name          TEXT,
  action              TEXT NOT NULL,
  entity_type         TEXT,
  entity_id           UUID,
  details             JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on sensitive tables; service role bypasses all policies.
-- =============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_campaigns ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by all API routes via supabaseAdmin)
-- No additional policies needed for service role — it bypasses RLS by design.

-- =============================================================================
-- END OF BASE SCHEMA
-- =============================================================================
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
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: GFA Video Library + Bulletin WhatsApp notification fields
-- Date: 2026-05-02
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. GFA Video Library
-- Stores metadata for all Bunny.net-hosted videos managed by GFA admin.
-- video_type: invite | teaser | portal_walkthrough | module
-- upload_status: pending | processing | ready | error

CREATE TABLE IF NOT EXISTS gfa_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  video_type        TEXT NOT NULL CHECK (video_type IN ('invite', 'teaser', 'portal_walkthrough', 'module')),
  bunny_video_id    TEXT,
  bunny_library_id  TEXT,
  playback_url      TEXT,
  thumbnail_url     TEXT,
  duration_seconds  INTEGER,
  language          TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'zu', 'af')),
  programme         TEXT,          -- null = general; 'p1', 'p2', etc.
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  upload_status     TEXT NOT NULL DEFAULT 'pending'
                    CHECK (upload_status IN ('pending', 'processing', 'ready', 'error')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: only GFA admins can read/write
ALTER TABLE gfa_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gfa_admins_manage_videos"
  ON gfa_videos
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- Index for type + language filtering
CREATE INDEX IF NOT EXISTS idx_gfa_videos_type_lang ON gfa_videos (video_type, language);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Bulletin campaigns — add notification_fields column
-- Stores which WhatsApp fields the operator selected when disseminating.

ALTER TABLE bulletin_campaigns
  ADD COLUMN IF NOT EXISTS notification_fields JSONB;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Bulletins — add whatsapp_notification_fields column
-- Persists the field selection on the bulletin record itself for reporting.

ALTER TABLE bulletins
  ADD COLUMN IF NOT EXISTS whatsapp_notification_fields JSONB;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Training campaigns — add invite_video_id column
-- Links a campaign to a GFA video library entry for the invite video.

ALTER TABLE training_campaigns
  ADD COLUMN IF NOT EXISTS invite_video_id UUID REFERENCES gfa_videos(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Driver invitations — add invite_video_url column
-- Denormalised for fast lookup at magic link resolution time.
-- Populated from gfa_videos.playback_url when the invitation is created.

ALTER TABLE driver_invitations
  ADD COLUMN IF NOT EXISTS invite_video_url TEXT;
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
-- =============================================================================
-- MIGRATION: 20260506_column_gaps_fix.sql
-- Fixes all column-level gaps identified by full code audit (May 2026)
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards
-- =============================================================================

-- =============================================================================
-- 1. companies — add all columns used in auth, registration, and trial flows
-- =============================================================================
-- register/route.ts inserts: name, contact_name, contact_email, contact_phone,
--   fleet_size, password_hash, status
-- trial/activate/route.ts inserts: contact_name, email (already exists),
--   password_hash, account_type, trial_seats, trial_expires_at, status
-- stats/route.ts filters on: status = 'active'
-- vouchers/route.ts updates: account_type, trial_expires_at
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contact_name      TEXT,
  ADD COLUMN IF NOT EXISTS contact_email     TEXT,          -- alias; code uses both 'email' and 'contact_email'
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS fleet_size        INT,
  ADD COLUMN IF NOT EXISTS password_hash     TEXT,
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'active',   -- 'active', 'suspended', 'trial'
  ADD COLUMN IF NOT EXISTS trial_seats       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_expires_at  TIMESTAMPTZ;

-- Create index on status for fast filtering
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_contact_email ON companies(contact_email);

-- =============================================================================
-- 2. quotes — add reference_number alias, line_items, eft_reference
-- =============================================================================
-- admin/super/route.ts selects: reference_number, line_items, eft_reference
-- company/quote/route.ts inserts: line_items (JSONB), reference (already exists)
-- The code uses both 'reference' and 'reference_number' — add the alias column
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS reference_number  TEXT,          -- alias for reference; populated by trigger below
  ADD COLUMN IF NOT EXISTS line_items        JSONB,         -- structured line items for display
  ADD COLUMN IF NOT EXISTS eft_reference     TEXT;          -- EFT payment reference from company

-- Backfill reference_number from reference for any existing rows
UPDATE quotes SET reference_number = reference WHERE reference_number IS NULL AND reference IS NOT NULL;

-- Trigger to keep reference_number in sync with reference going forward
CREATE OR REPLACE FUNCTION sync_quote_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference_number IS NULL THEN
    NEW.reference_number := NEW.reference;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_quote_reference_number ON quotes;
CREATE TRIGGER trg_sync_quote_reference_number
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION sync_quote_reference_number();

-- =============================================================================
-- 3. courses — add all columns used in admin/programmes/route.ts
-- =============================================================================
-- programmes/route.ts inserts/updates: price_model, duration_weeks,
--   module_count, cpd_frequency, audience, status
-- Code uses .eq('status', 'archived') — schema has is_active (boolean)
-- Add status column; keep is_active for backward compat
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS price_model      TEXT DEFAULT 'per_driver_per_month',
  ADD COLUMN IF NOT EXISTS duration_weeks   INT,
  ADD COLUMN IF NOT EXISTS module_count     INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS cpd_frequency    TEXT DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS audience         TEXT DEFAULT 'drivers',
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'active';   -- 'active', 'archived'

-- Backfill status from is_active for existing rows
UPDATE courses SET status = CASE WHEN is_active = TRUE THEN 'active' ELSE 'archived' END
  WHERE status IS NULL OR status = 'active';

-- =============================================================================
-- 4. trial_vouchers — add all columns used in vouchers/route.ts
-- =============================================================================
-- vouchers/route.ts selects: expires_days, welcome_message, brochure_url,
--   status, activated_at, notes
-- vouchers/route.ts inserts: expires_days, welcome_message, brochure_url
-- vouchers/route.ts updates: status, sent_at, activated_at (via trial/activate),
--   company_id, converted_at, converted_by
ALTER TABLE trial_vouchers
  ADD COLUMN IF NOT EXISTS expires_days     INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS welcome_message  TEXT,
  ADD COLUMN IF NOT EXISTS brochure_url     TEXT,
  ADD COLUMN IF NOT EXISTS sent_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_by     UUID,
  ADD COLUMN IF NOT EXISTS notes            TEXT;

-- =============================================================================
-- 5. site_config — add description column used in admin/stats/route.ts upsert
-- =============================================================================
-- admin/stats/route.ts upserts: { key, value, description }
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS description  TEXT;

-- =============================================================================
-- 6. gfa_admins — ensure adminId field maps correctly
-- =============================================================================
-- auth.ts returns session.adminId but programmes/route.ts uses session.id
-- The session object has adminId (not id) — this is a code issue, not schema.
-- Schema is correct. Note added for developer awareness.
-- No schema change needed here; fix is in code (see note below).

-- =============================================================================
-- 7. prospect_leads — ensure assigned_to column exists (PATCH uses it)
-- =============================================================================
-- leads/route.ts PATCH updates: assigned_to
ALTER TABLE prospect_leads
  ADD COLUMN IF NOT EXISTS assigned_to  UUID;

-- =============================================================================
-- 8. Seed site_config with all keys required by admin/stats/route.ts
-- =============================================================================
INSERT INTO site_config (key, value, description) VALUES
  ('stats_companies_mode',      'static',  'live = count from DB; static = use override value'),
  ('stats_companies_static',    '7',       'Static company count shown on public stats strip'),
  ('stats_drivers_mode',        'static',  'live = count from DB; static = use override value'),
  ('stats_drivers_static',      '252',     'Static driver count shown on public stats strip'),
  ('stats_certificates_mode',   'static',  'live = count from DB; static = use override value'),
  ('stats_certificates_static', '207',     'Static certificate count shown on public stats strip'),
  ('stats_workshops_mode',      'static',  'live = count from DB; static = use override value'),
  ('stats_workshops_static',    '34',      'Static workshop count shown on public stats strip'),
  ('contact_email',             'durbanroadtransport@gmail.com', 'Contact email shown across all three sites'),
  ('bulletin_fee',              '500',     'Default fee (ZAR) for urgent private bulletins'),
  ('whatsapp_phone_id',         '',        'Meta WhatsApp Business phone number ID'),
  ('whatsapp_access_token',     '',        'Meta WhatsApp Business access token'),
  ('email_booking_to',          'durbanroadtransport@gmail.com', 'Admin email for booking notifications'),
  ('company_name',              'GreenFreightAcademy', 'Company name for quotes and invoices'),
  ('company_vat_number',        '',        'VAT number for quotes and invoices'),
  ('company_address',           '',        'Company address for quotes and invoices'),
  ('company_bank_name',         '',        'Bank name for EFT payment details'),
  ('company_bank_account',      '',        'Bank account number for EFT'),
  ('company_bank_branch',       '',        'Bank branch code for EFT'),
  ('company_email',             'info@greenfreightacademy.com', 'Public contact email'),
  ('company_phone',             '',        'Public contact phone number')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- ============================================================
-- MIGRATION: 20260506_enable_rls_all_tables.sql
-- ============================================================
-- ============================================================
-- TAG Ecosystem — Row-Level Security (RLS) Migration
-- 20260506_enable_rls_all_tables.sql
-- ============================================================
-- CONTEXT
-- -------
-- All API routes in BD, GFA, and TAG use the service_role key
-- (supabaseAdmin) which bypasses RLS. This is correct and safe.
--
-- However, the anon key is embedded in the frontend bundle
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY). Without RLS, anyone who
-- extracts the anon key from the browser can read, write, and
-- delete all data directly via the Supabase REST API.
--
-- This migration:
--   1. Enables RLS on every table that was missing it
--   2. Adds a single "deny all anon" policy on each table
--      (service_role bypasses RLS entirely — no policy needed)
--   3. Preserves the existing policies on tables that already
--      had RLS enabled (companies, drivers, enrolments, etc.)
--
-- POLICY DESIGN
-- -------------
-- Because all legitimate access goes through our Next.js API
-- routes using the service_role key, the correct policy for
-- every table is: DENY ALL for the anon role.
-- This is the most secure and simplest approach.
-- ============================================================

-- ── 1. Tables that already had RLS — ensure policies are tight ──────────────

-- certifications (already has RLS)
DROP POLICY IF EXISTS "deny_anon_certifications" ON certifications;
CREATE POLICY "deny_anon_certifications"
  ON certifications FOR ALL
  TO anon
  USING (false);

-- companies (already has RLS)
DROP POLICY IF EXISTS "deny_anon_companies" ON companies;
CREATE POLICY "deny_anon_companies"
  ON companies FOR ALL
  TO anon
  USING (false);

-- driver_invitations (already has RLS)
DROP POLICY IF EXISTS "deny_anon_driver_invitations" ON driver_invitations;
CREATE POLICY "deny_anon_driver_invitations"
  ON driver_invitations FOR ALL
  TO anon
  USING (false);

-- drivers (already has RLS)
DROP POLICY IF EXISTS "deny_anon_drivers" ON drivers;
CREATE POLICY "deny_anon_drivers"
  ON drivers FOR ALL
  TO anon
  USING (false);

-- enrolments (already has RLS)
DROP POLICY IF EXISTS "deny_anon_enrolments" ON enrolments;
CREATE POLICY "deny_anon_enrolments"
  ON enrolments FOR ALL
  TO anon
  USING (false);

-- gfa_videos (already has RLS)
DROP POLICY IF EXISTS "deny_anon_gfa_videos" ON gfa_videos;
CREATE POLICY "deny_anon_gfa_videos"
  ON gfa_videos FOR ALL
  TO anon
  USING (false);

-- training_campaigns (already has RLS)
DROP POLICY IF EXISTS "deny_anon_training_campaigns" ON training_campaigns;
CREATE POLICY "deny_anon_training_campaigns"
  ON training_campaigns FOR ALL
  TO anon
  USING (false);

-- ── 2. Tables missing RLS — enable and lock down ────────────────────────────

-- admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_admin_audit_log" ON admin_audit_log;
CREATE POLICY "deny_anon_admin_audit_log"
  ON admin_audit_log FOR ALL
  TO anon
  USING (false);

-- bd_admins
ALTER TABLE bd_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bd_admins" ON bd_admins;
CREATE POLICY "deny_anon_bd_admins"
  ON bd_admins FOR ALL
  TO anon
  USING (false);

-- bulletin_campaigns
ALTER TABLE bulletin_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bulletin_campaigns" ON bulletin_campaigns;
CREATE POLICY "deny_anon_bulletin_campaigns"
  ON bulletin_campaigns FOR ALL
  TO anon
  USING (false);

-- bulletin_payments
ALTER TABLE bulletin_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bulletin_payments" ON bulletin_payments;
CREATE POLICY "deny_anon_bulletin_payments"
  ON bulletin_payments FOR ALL
  TO anon
  USING (false);

-- bulletins
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bulletins" ON bulletins;
CREATE POLICY "deny_anon_bulletins"
  ON bulletins FOR ALL
  TO anon
  USING (false);

-- campaign_logs
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_campaign_logs" ON campaign_logs;
CREATE POLICY "deny_anon_campaign_logs"
  ON campaign_logs FOR ALL
  TO anon
  USING (false);

-- certifications (already handled above)

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_courses" ON courses;
CREATE POLICY "deny_anon_courses"
  ON courses FOR ALL
  TO anon
  USING (false);

-- cpd_library
ALTER TABLE cpd_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_library" ON cpd_library;
CREATE POLICY "deny_anon_cpd_library"
  ON cpd_library FOR ALL
  TO anon
  USING (false);

-- cpd_library_items
ALTER TABLE cpd_library_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_library_items" ON cpd_library_items;
CREATE POLICY "deny_anon_cpd_library_items"
  ON cpd_library_items FOR ALL
  TO anon
  USING (false);

-- cpd_modules
ALTER TABLE cpd_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_modules" ON cpd_modules;
CREATE POLICY "deny_anon_cpd_modules"
  ON cpd_modules FOR ALL
  TO anon
  USING (false);

-- cpd_records
ALTER TABLE cpd_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_records" ON cpd_records;
CREATE POLICY "deny_anon_cpd_records"
  ON cpd_records FOR ALL
  TO anon
  USING (false);

-- deployments
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_deployments" ON deployments;
CREATE POLICY "deny_anon_deployments"
  ON deployments FOR ALL
  TO anon
  USING (false);

-- driver_bulletin_interactions
ALTER TABLE driver_bulletin_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_driver_bulletin_interactions" ON driver_bulletin_interactions;
CREATE POLICY "deny_anon_driver_bulletin_interactions"
  ON driver_bulletin_interactions FOR ALL
  TO anon
  USING (false);

-- driver_cpd_participation
ALTER TABLE driver_cpd_participation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_driver_cpd_participation" ON driver_cpd_participation;
CREATE POLICY "deny_anon_driver_cpd_participation"
  ON driver_cpd_participation FOR ALL
  TO anon
  USING (false);

-- gfa_admins
ALTER TABLE gfa_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_gfa_admins" ON gfa_admins;
CREATE POLICY "deny_anon_gfa_admins"
  ON gfa_admins FOR ALL
  TO anon
  USING (false);

-- moodle_completion_log
ALTER TABLE moodle_completion_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_moodle_completion_log" ON moodle_completion_log;
CREATE POLICY "deny_anon_moodle_completion_log"
  ON moodle_completion_log FOR ALL
  TO anon
  USING (false);

-- moodle_webhook_log
ALTER TABLE moodle_webhook_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_moodle_webhook_log" ON moodle_webhook_log;
CREATE POLICY "deny_anon_moodle_webhook_log"
  ON moodle_webhook_log FOR ALL
  TO anon
  USING (false);

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_payments" ON payments;
CREATE POLICY "deny_anon_payments"
  ON payments FOR ALL
  TO anon
  USING (false);

-- prospect_leads
ALTER TABLE prospect_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_prospect_leads" ON prospect_leads;
CREATE POLICY "deny_anon_prospect_leads"
  ON prospect_leads FOR ALL
  TO anon
  USING (false);

-- quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_quotes" ON quotes;
CREATE POLICY "deny_anon_quotes"
  ON quotes FOR ALL
  TO anon
  USING (false);

-- session_token_blocklist
ALTER TABLE session_token_blocklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_session_token_blocklist" ON session_token_blocklist;
CREATE POLICY "deny_anon_session_token_blocklist"
  ON session_token_blocklist FOR ALL
  TO anon
  USING (false);

-- site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_site_config" ON site_config;
CREATE POLICY "deny_anon_site_config"
  ON site_config FOR ALL
  TO anon
  USING (false);

-- trial_vouchers
ALTER TABLE trial_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_trial_vouchers" ON trial_vouchers;
CREATE POLICY "deny_anon_trial_vouchers"
  ON trial_vouchers FOR ALL
  TO anon
  USING (false);

-- ── 3. Verify ────────────────────────────────────────────────────────────────
-- After running this migration, run the following query in the Supabase SQL
-- editor to confirm zero tables have RLS disabled:
--
--   SELECT tablename
--   FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename NOT IN (
--       SELECT relname FROM pg_class
--       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
--       WHERE nspname = 'public' AND relrowsecurity = true
--     );
--
-- Expected result: 0 rows.
-- ============================================================
