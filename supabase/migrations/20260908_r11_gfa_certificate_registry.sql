-- Release 11: GFA canonical certificate registry, verification and private document access
-- Scope: GFA academy certification only. This migration must not be copied into BetterDriver or SafeFreight.
-- Safety: idempotent objects; no production certificate data is mutated or deleted.

-- A collision-safe sequence supports atomic allocation only inside the certificate issue function.
CREATE SEQUENCE IF NOT EXISTS gfa_certificate_number_seq START WITH 100000;

ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS certificate_version TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS issued_event_id UUID REFERENCES learning_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS document_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS document_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_by_certificate_id UUID REFERENCES certifications(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certifications_issued_event
  ON certifications(issued_event_id)
  WHERE issued_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_certifications_document_storage_path
  ON certifications(document_storage_path)
  WHERE document_storage_path IS NOT NULL;

-- One opaque correlation map is held in GFA. BetterDriver receives no GFA database credential,
-- browser session or raw personal identity through this table.
CREATE TABLE IF NOT EXISTS driver_external_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL CHECK (external_system IN ('betterdriver')),
  external_subject_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  UNIQUE (external_system, external_subject_ref),
  UNIQUE (driver_id, external_system)
);
CREATE INDEX IF NOT EXISTS idx_driver_external_identities_driver
  ON driver_external_identities(driver_id)
  WHERE deactivated_at IS NULL;

-- GFA stores only a hash of each one-time BetterDriver document authorisation code.
CREATE TABLE IF NOT EXISTS certificate_delivery_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('betterdriver')),
  authorization_code_hash TEXT NOT NULL UNIQUE,
  source_event_id UUID REFERENCES learning_events(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certificate_delivery_grants_redeem
  ON certificate_delivery_grants(authorization_code_hash, expires_at)
  WHERE used_at IS NULL;

-- Minimal audit records intentionally exclude raw identity data, raw certificate access codes,
-- full document URLs and full IP addresses. Application code stores HMAC fingerprints only.
CREATE TABLE IF NOT EXISTS certificate_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES certifications(id) ON DELETE SET NULL,
  query_fingerprint TEXT NOT NULL,
  request_fingerprint TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('verified', 'expired', 'revoked', 'not_found', 'invalid_request', 'rate_limited')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certificate_verification_events_certificate_time
  ON certificate_verification_events(certificate_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS certificate_document_access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES certifications(id) ON DELETE SET NULL,
  audience TEXT NOT NULL CHECK (audience IN ('betterdriver', 'gfa_admin')),
  outcome TEXT NOT NULL CHECK (outcome IN ('granted', 'expired', 'used', 'invalid', 'unavailable')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certificate_document_access_events_certificate_time
  ON certificate_document_access_events(certificate_id, occurred_at DESC);

-- Private GFA-owned bucket. Direct public reads are not permitted; server routes mint short-lived URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('gfa-certificate-documents', 'gfa-certificate-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Service-role-only access keeps certificate records and audit tables off the public data plane.
ALTER TABLE driver_external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_delivery_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_document_access_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_external_identities' AND policyname = 'driver_external_identities_service_only') THEN
    CREATE POLICY "driver_external_identities_service_only"
      ON driver_external_identities FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificate_delivery_grants' AND policyname = 'certificate_delivery_grants_service_only') THEN
    CREATE POLICY "certificate_delivery_grants_service_only"
      ON certificate_delivery_grants FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificate_verification_events' AND policyname = 'certificate_verification_events_service_only') THEN
    CREATE POLICY "certificate_verification_events_service_only"
      ON certificate_verification_events FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificate_document_access_events' AND policyname = 'certificate_document_access_events_service_only') THEN
    CREATE POLICY "certificate_document_access_events_service_only"
      ON certificate_document_access_events FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Allocate inside PostgreSQL so concurrent issuances cannot claim the same certificate number.
CREATE OR REPLACE FUNCTION gfa_allocate_certificate_number(p_issued_at TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := 'GFA-' || to_char(p_issued_at AT TIME ZONE 'Africa/Johannesburg', 'YYYY') || '-' || lpad(nextval('gfa_certificate_number_seq')::TEXT, 8, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM certifications WHERE certificate_number = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Creates the GFA canonical certificate record for a persisted, authenticated certificate-issued event.
-- A newly inserted record remains pending_document until the private PDF upload completes in GFA.
CREATE OR REPLACE FUNCTION gfa_issue_certificate_from_learning_event(p_learning_event_id UUID)
RETURNS TABLE (certificate_id UUID, certificate_number TEXT, created BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  event_row learning_events%ROWTYPE;
  enrolment_row enrolments%ROWTYPE;
  course_programme TEXT;
  existing_certificate certifications%ROWTYPE;
  issued_number TEXT;
BEGIN
  SELECT * INTO event_row
  FROM learning_events
  WHERE id = p_learning_event_id
    AND event_type = 'certificate_issued'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate issue event % was not found', p_learning_event_id USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO enrolment_row
  FROM enrolments
  WHERE id = event_row.enrolment_id
    AND driver_id = event_row.driver_id
    AND company_id = event_row.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate issue event % has no matching enrolment', p_learning_event_id USING ERRCODE = 'P0001';
  END IF;

  SELECT programme INTO course_programme FROM courses WHERE id = enrolment_row.course_id;

  SELECT * INTO existing_certificate
  FROM certifications
  WHERE enrolment_id = enrolment_row.id
    AND status IN ('active', 'issued', 'pending_document')
  ORDER BY issued_at DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE certifications
    SET issued_event_id = COALESCE(issued_event_id, event_row.id),
        status = CASE WHEN status = 'active' THEN 'pending_document' ELSE status END,
        certificate_version = COALESCE(NULLIF(certificate_version, ''), 'v1')
    WHERE id = existing_certificate.id
    RETURNING id, certificate_number INTO certificate_id, certificate_number;
    created := false;
    RETURN NEXT;
    RETURN;
  END IF;

  issued_number := gfa_allocate_certificate_number(event_row.occurred_at);

  INSERT INTO certifications (
    driver_id,
    company_id,
    enrolment_id,
    course_id,
    certificate_number,
    programme,
    issued_at,
    status,
    certificate_version,
    issued_event_id
  ) VALUES (
    enrolment_row.driver_id,
    enrolment_row.company_id,
    enrolment_row.id,
    enrolment_row.course_id,
    issued_number,
    COALESCE(course_programme, 'driver-foundation'),
    event_row.occurred_at,
    'pending_document',
    'v1',
    event_row.id
  )
  RETURNING id, certificate_number INTO certificate_id, certificate_number;

  created := true;
  RETURN NEXT;
END;
$$;

-- Atomically redeem one BetterDriver authorisation code only while the certificate remains valid
-- and the private document is available. The returned storage path is never persisted by BetterDriver.
CREATE OR REPLACE FUNCTION gfa_redeem_certificate_delivery_grant(p_authorization_code_hash TEXT)
RETURNS TABLE (certificate_id UUID, document_storage_path TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE certificate_delivery_grants grant_row
  SET used_at = NOW()
  FROM certifications certificate_row
  WHERE grant_row.authorization_code_hash = p_authorization_code_hash
    AND grant_row.used_at IS NULL
    AND grant_row.expires_at > NOW()
    AND grant_row.certificate_id = certificate_row.id
    AND certificate_row.status IN ('active', 'issued')
    AND certificate_row.document_storage_path IS NOT NULL
  RETURNING certificate_row.id, certificate_row.document_storage_path;
END;
$$;

-- Notes for operations:
-- 1. Existing legacy certifications with status='active' remain readable. They are not bulk-converted.
-- 2. The application never uses certifications.pdf_url for new GFA certificates; it stores a private bucket path above.
-- 3. Certificate/registry feature flags remain false until Preview evidence is signed off.
