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
