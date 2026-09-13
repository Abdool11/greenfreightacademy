-- =============================================================================
-- RELEASE 12: Canonical Certificate Contract Completion
-- Scope: Green Freight Academy only. This migration must not be copied to
-- BetterDriver, SafeFreight, TAG, or any sister repository.
-- Safety: idempotent schema additions and functions only. It does not issue,
-- revoke, supersede or delete production certificates.
-- =============================================================================

-- Canonical certificate references are opaque integration identifiers. They are
-- distinct from the public certificate number and from the database primary key.
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS certificate_ref TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS decision_event_id UUID,
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE certifications
SET certificate_ref = 'gfa_cert_' || replace(gen_random_uuid()::TEXT, '-', '')
WHERE certificate_ref IS NULL;

UPDATE certifications
SET lifecycle_status = CASE
  WHEN status = 'revoked' THEN 'REVOKED'
  WHEN status = 'superseded' THEN 'SUPERSEDED'
  WHEN status = 'expired' THEN 'EXPIRED'
  WHEN status IN ('pending_review', 'pending_document') THEN 'PENDING_REVIEW'
  ELSE 'ISSUED'
END
WHERE lifecycle_status IS NULL;

ALTER TABLE certifications
  ALTER COLUMN certificate_ref SET DEFAULT ('gfa_cert_' || replace(gen_random_uuid()::TEXT, '-', '')),
  ALTER COLUMN lifecycle_status SET DEFAULT 'PENDING_REVIEW',
  ALTER COLUMN certificate_ref SET NOT NULL,
  ALTER COLUMN lifecycle_status SET NOT NULL,
  ALTER COLUMN certificate_number DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certifications_certificate_ref_unique
  ON certifications(certificate_ref);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certifications_decision_event_unique
  ON certifications(decision_event_id)
  WHERE decision_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certifications_lifecycle_status
  ON certifications(lifecycle_status, issued_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'certifications_lifecycle_status_valid'
  ) THEN
    ALTER TABLE certifications
      ADD CONSTRAINT certifications_lifecycle_status_valid
      CHECK (lifecycle_status IN ('PENDING_REVIEW', 'ISSUED', 'SUPERSEDED', 'EXPIRED', 'REVOKED', 'NOT_ELIGIBLE'));
  END IF;
END
$$;

-- This is the GFA-held mapping for an authorised BetterDriver enrolment. It uses
-- opaque BetterDriver references only and never stores a BetterDriver credential,
-- browser session, raw identity number, or profile payload.
CREATE TABLE IF NOT EXISTS certificate_external_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_system TEXT NOT NULL CHECK (external_system IN ('betterdriver')),
  external_driver_ref TEXT NOT NULL,
  external_company_ref TEXT NOT NULL,
  external_enrolment_ref TEXT NOT NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrolment_id UUID NOT NULL REFERENCES enrolments(id) ON DELETE CASCADE,
  programme_code TEXT NOT NULL,
  programme_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  UNIQUE (external_system, external_enrolment_ref),
  UNIQUE (enrolment_id, external_system)
);
CREATE INDEX IF NOT EXISTS idx_certificate_external_mappings_active_driver
  ON certificate_external_mappings(driver_id, external_system)
  WHERE deactivated_at IS NULL;

-- Receipt/audit record for the versioned BetterDriver completion evidence event.
-- The source event is unique so replay or retry cannot create a second workflow.
CREATE TABLE IF NOT EXISTS certificate_decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL CHECK (source_system IN ('betterdriver')),
  source_event_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  event_type TEXT NOT NULL,
  completion_evidence_ref TEXT NOT NULL,
  external_driver_ref TEXT NOT NULL,
  external_company_ref TEXT NOT NULL,
  external_enrolment_ref TEXT NOT NULL,
  programme_code TEXT NOT NULL,
  programme_version TEXT NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  enrolment_id UUID REFERENCES enrolments(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decision_status TEXT NOT NULL CHECK (decision_status IN ('PENDING_REVIEW', 'ISSUED', 'SUPERSEDED', 'EXPIRED', 'REVOKED', 'NOT_ELIGIBLE')),
  outcome_detail TEXT,
  processed_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  UNIQUE (source_system, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_certificate_decision_events_enrolment_time
  ON certificate_decision_events(enrolment_id, received_at DESC);

-- One signed BetterDriver browser assertion can grant only one view/download
-- action for one GFA certificate. GFA stores the signed JWT identifier, never a
-- raw BetterDriver browser session or document URL.
CREATE TABLE IF NOT EXISTS certificate_handoff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_jti TEXT NOT NULL UNIQUE,
  handoff_code_hash TEXT NOT NULL UNIQUE,
  certificate_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('betterdriver')),
  permitted_action TEXT NOT NULL CHECK (permitted_action IN ('view', 'download')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certificate_handoff_sessions_redeem
  ON certificate_handoff_sessions(handoff_code_hash, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE certificate_external_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_handoff_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificate_external_mappings' AND policyname = 'certificate_external_mappings_service_only') THEN
    CREATE POLICY "certificate_external_mappings_service_only"
      ON certificate_external_mappings FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificate_decision_events' AND policyname = 'certificate_decision_events_service_only') THEN
    CREATE POLICY "certificate_decision_events_service_only"
      ON certificate_decision_events FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificate_handoff_sessions' AND policyname = 'certificate_handoff_sessions_service_only') THEN
    CREATE POLICY "certificate_handoff_sessions_service_only"
      ON certificate_handoff_sessions FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Allocate the public certificate number only when a GFA administrator issues a
-- pending certificate. This maintains a stable opaque reference while avoiding
-- gaps from records still awaiting GFA professional review.
CREATE OR REPLACE FUNCTION gfa_issue_pending_certificate(
  p_certificate_id UUID
)
RETURNS TABLE (certificate_id UUID, certificate_number TEXT, certificate_ref TEXT, certificate_version TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  certificate_row certifications%ROWTYPE;
  allocated_number TEXT;
BEGIN
  SELECT * INTO certificate_row
  FROM certifications
  WHERE id = p_certificate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate was not found' USING ERRCODE = 'P0001';
  END IF;

  IF certificate_row.lifecycle_status = 'PENDING_REVIEW' THEN
    allocated_number := gfa_allocate_certificate_number(NOW());
    UPDATE certifications
    SET certificate_number = allocated_number,
        status = 'pending_document',
        lifecycle_status = 'ISSUED',
        issued_at = NOW(),
        lifecycle_updated_at = NOW()
    WHERE id = certificate_row.id
    RETURNING id, certifications.certificate_number, certifications.certificate_ref, certifications.certificate_version
      INTO certificate_id, certificate_number, certificate_ref, certificate_version;
    RETURN NEXT;
    RETURN;
  END IF;

  IF certificate_row.lifecycle_status = 'ISSUED' AND certificate_row.certificate_number IS NOT NULL THEN
    certificate_id := certificate_row.id;
    certificate_number := certificate_row.certificate_number;
    certificate_ref := certificate_row.certificate_ref;
    certificate_version := certificate_row.certificate_version;
    RETURN NEXT;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Certificate is not eligible for issuance' USING ERRCODE = 'P0001';
END;
$$;

-- Redeem a signed BetterDriver browser handoff exactly once. The current GFA
-- lifecycle and document state are checked at redemption time, so revocation,
-- supersession or expiry wins over an earlier signed assertion.
CREATE OR REPLACE FUNCTION gfa_redeem_certificate_handoff(
  p_handoff_code_hash TEXT
)
RETURNS TABLE (certificate_id UUID, document_storage_path TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE certificate_handoff_sessions AS session_row
  SET used_at = NOW()
  FROM certifications AS certificate_row
  WHERE session_row.handoff_code_hash = p_handoff_code_hash
    AND session_row.used_at IS NULL
    AND session_row.expires_at > NOW()
    AND session_row.certificate_id = certificate_row.id
    AND certificate_row.lifecycle_status = 'ISSUED'
    AND certificate_row.status IN ('active', 'issued')
    AND (certificate_row.expires_at IS NULL OR certificate_row.expires_at > NOW())
    AND certificate_row.document_storage_path IS NOT NULL
  RETURNING certificate_row.id, certificate_row.document_storage_path;
END;
$$;

-- Supersession preserves the old GFA record and points it to the replacement.
-- The application verifies operator authority and same-driver ownership first.
CREATE OR REPLACE FUNCTION gfa_mark_certificate_superseded(
  p_certificate_id UUID,
  p_replacement_certificate_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_row certifications%ROWTYPE;
  replacement_row certifications%ROWTYPE;
BEGIN
  SELECT * INTO current_row FROM certifications WHERE id = p_certificate_id FOR UPDATE;
  SELECT * INTO replacement_row FROM certifications WHERE id = p_replacement_certificate_id FOR UPDATE;

  IF NOT FOUND OR current_row.id IS NULL OR replacement_row.id IS NULL THEN
    RAISE EXCEPTION 'Certificate or replacement was not found' USING ERRCODE = 'P0001';
  END IF;
  IF current_row.driver_id <> replacement_row.driver_id THEN
    RAISE EXCEPTION 'Replacement certificate must belong to the same driver' USING ERRCODE = 'P0001';
  END IF;
  IF current_row.id = replacement_row.id THEN
    RAISE EXCEPTION 'A certificate cannot supersede itself' USING ERRCODE = 'P0001';
  END IF;
  IF replacement_row.lifecycle_status <> 'ISSUED' THEN
    RAISE EXCEPTION 'Replacement certificate is not issued' USING ERRCODE = 'P0001';
  END IF;

  UPDATE certifications
  SET status = 'superseded',
      lifecycle_status = 'SUPERSEDED',
      superseded_at = NOW(),
      replaced_by_certificate_id = replacement_row.id,
      lifecycle_updated_at = NOW()
  WHERE id = current_row.id
    AND lifecycle_status = 'ISSUED';

  RETURN FOUND;
END;
$$;

-- =============================================================================
-- END RELEASE 12 MIGRATION
-- =============================================================================
