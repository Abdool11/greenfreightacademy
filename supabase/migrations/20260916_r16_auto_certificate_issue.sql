-- =============================================================================
-- RELEASE 16: Automatic Certificate Issue After Verified Completion
-- Scope: Green Freight Academy only. Do not copy this migration to BetterDriver,
-- SafeFreight, TAG, or any sister repository.
--
-- A cryptographically verified, mapped BetterDriver COMPLETE event is already
-- emitted only after the learning platform applies the configured completion
-- rule. For the launch Professional Truck Driver Program, that rule is: every
-- required module complete and every required quiz score >= 4/5.
--
-- This function atomically records one source event, allocates one canonical
-- GFA certificate number and creates one ISSUED certificate. PDF rendering and
-- private storage remain in the application layer because object storage is not
-- transactional with PostgreSQL. A retry of the same event returns the original
-- certificate so the PDF render can safely be retried without a second number.
-- =============================================================================

CREATE OR REPLACE FUNCTION gfa_record_auto_issued_certificate(
  p_source_event_id TEXT,
  p_completion_evidence_ref TEXT,
  p_external_driver_ref TEXT,
  p_external_company_ref TEXT,
  p_external_enrolment_ref TEXT,
  p_programme_code TEXT,
  p_programme_version TEXT,
  p_driver_id UUID,
  p_company_id UUID,
  p_enrolment_id UUID,
  p_course_id UUID,
  p_programme TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  created BOOLEAN,
  certificate_id UUID,
  certificate_ref TEXT,
  certificate_number TEXT,
  certificate_version TEXT,
  lifecycle_status TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  decision_event_id UUID,
  correlation_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  event_row certificate_decision_events%ROWTYPE;
  certificate_row certifications%ROWTYPE;
  event_id UUID;
  allocated_number TEXT;
  audit_correlation_id UUID := gen_random_uuid();
BEGIN
  IF coalesce(trim(p_source_event_id), '') = '' OR
     coalesce(trim(p_completion_evidence_ref), '') = '' OR
     coalesce(trim(p_programme_code), '') = '' OR
     coalesce(trim(p_programme_version), '') = '' OR
     p_driver_id IS NULL OR p_company_id IS NULL OR p_enrolment_id IS NULL OR
     p_course_id IS NULL OR p_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Automatic certificate issue requires complete verified completion evidence' USING ERRCODE = 'P0001';
  END IF;

  -- The unique source event is the idempotency key. If this is a retry, return
  -- the original canonical certificate rather than allocating another number.
  INSERT INTO certificate_decision_events (
    source_system,
    source_event_id,
    schema_version,
    event_type,
    completion_evidence_ref,
    external_driver_ref,
    external_company_ref,
    external_enrolment_ref,
    programme_code,
    programme_version,
    driver_id,
    company_id,
    enrolment_id,
    occurred_at,
    decision_status,
    outcome_detail,
    processed_at,
    payload
  ) VALUES (
    'betterdriver',
    p_source_event_id,
    '1.0',
    'bd.learning_completion_evidence.v1',
    p_completion_evidence_ref,
    p_external_driver_ref,
    p_external_company_ref,
    p_external_enrolment_ref,
    p_programme_code,
    p_programme_version,
    p_driver_id,
    p_company_id,
    p_enrolment_id,
    p_occurred_at,
    'ISSUED',
    'Automatically issued from verified qualifying completion evidence.',
    NOW(),
    coalesce(p_payload, '{}'::JSONB) || jsonb_build_object(
      'automatic_issue', true,
      'automatic_issue_rule', 'verified_learning_completion'
    )
  )
  ON CONFLICT (source_system, source_event_id) DO NOTHING
  RETURNING id INTO event_id;

  IF event_id IS NULL THEN
    SELECT * INTO event_row
    FROM certificate_decision_events
    WHERE source_system = 'betterdriver'
      AND source_event_id = p_source_event_id;

    SELECT * INTO certificate_row
    FROM certifications
    WHERE decision_event_id = event_row.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The prior completion event has no canonical GFA certificate' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY SELECT
      false,
      certificate_row.id,
      certificate_row.certificate_ref,
      certificate_row.certificate_number,
      certificate_row.certificate_version,
      certificate_row.lifecycle_status,
      certificate_row.issued_at,
      certificate_row.expires_at,
      event_row.id,
      audit_correlation_id;
    RETURN;
  END IF;

  allocated_number := gfa_allocate_certificate_number(NOW());

  INSERT INTO certifications (
    driver_id,
    company_id,
    enrolment_id,
    course_id,
    certificate_ref,
    certificate_number,
    programme,
    status,
    lifecycle_status,
    certificate_version,
    decision_event_id,
    issued_at,
    lifecycle_updated_at
  ) VALUES (
    p_driver_id,
    p_company_id,
    p_enrolment_id,
    p_course_id,
    'gfa_cert_' || replace(gen_random_uuid()::TEXT, '-', ''),
    allocated_number,
    coalesce(nullif(trim(p_programme), ''), p_programme_code),
    'pending_document',
    'ISSUED',
    p_programme_version,
    event_id,
    NOW(),
    NOW()
  )
  RETURNING * INTO certificate_row;

  INSERT INTO admin_audit_log (
    admin_id,
    admin_name,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    NULL,
    'GFA automatic certificate service',
    'certificate_auto_issued',
    'certifications',
    certificate_row.id,
    jsonb_build_object(
      'certificate_ref', certificate_row.certificate_ref,
      'certificate_number', certificate_row.certificate_number,
      'previous_lifecycle_status', NULL,
      'lifecycle_status', 'ISSUED',
      'source_system', 'betterdriver',
      'source_event_id', p_source_event_id,
      'completion_evidence_ref', p_completion_evidence_ref,
      'correlation_id', audit_correlation_id
    ),
    NOW()
  );

  RETURN QUERY SELECT
    true,
    certificate_row.id,
    certificate_row.certificate_ref,
    certificate_row.certificate_number,
    certificate_row.certificate_version,
    certificate_row.lifecycle_status,
    certificate_row.issued_at,
    certificate_row.expires_at,
    event_id,
    audit_correlation_id;
END;
$$;

COMMENT ON FUNCTION gfa_record_auto_issued_certificate(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, TIMESTAMPTZ, JSONB
) IS 'GFA-only automatic certificate issuance for one verified BetterDriver learning-completion event. Idempotent by source event.';

-- =============================================================================
-- END RELEASE 16 MIGRATION
-- =============================================================================
