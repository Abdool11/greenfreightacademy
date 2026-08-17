-- R7A: Compliance profile, evidence reporting, RTMS review and quote lifecycle
CREATE TABLE IF NOT EXISTS company_compliance_profiles (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  rtms_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (rtms_status IN ('not_applicable','preparing','certified')),
  rtms_reference TEXT,
  safety_manager_name TEXT,
  safety_manager_email TEXT,
  safety_manager_mobile TEXT,
  annual_review_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  annual_review_lead_days INT NOT NULL DEFAULT 30 CHECK (annual_review_lead_days >= 1),
  renewal_route TEXT NOT NULL DEFAULT 'client_decides' CHECK (renewal_route IN ('cpd','refresher','client_decides')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_competency_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  last_qualifying_at TIMESTAMPTZ, next_review_due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (status IN ('current','due_soon','overdue','not_applicable')),
  evidence_type TEXT, evidence_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, driver_id)
);
CREATE INDEX IF NOT EXISTS idx_competency_reviews_due ON driver_competency_reviews(company_id, next_review_due_at);

CREATE TABLE IF NOT EXISTS evidence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  control_number TEXT UNIQUE NOT NULL, report_type TEXT NOT NULL, reporting_period_start DATE, reporting_period_end DATE,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb, snapshot_json JSONB NOT NULL, sha256_checksum TEXT NOT NULL,
  pdf_storage_path TEXT, csv_storage_path TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  generated_by UUID, generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ, revoked_by UUID, revoke_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_reports_company_generated ON evidence_reports(company_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS evidence_report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), report_id UUID NOT NULL REFERENCES evidence_reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('generated','downloaded','validated','revoked')),
  actor_id UUID, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE, alert_type TEXT NOT NULL, alert_stage TEXT NOT NULL,
  due_date DATE, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(company_id, driver_id, alert_type, alert_stage, due_date)
);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_quotes_active_expiry ON quotes(company_id, expires_at) WHERE archived_at IS NULL;
