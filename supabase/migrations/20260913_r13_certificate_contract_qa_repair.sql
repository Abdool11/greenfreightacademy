-- =============================================================================
-- RELEASE 13: Certificate Contract QA Repair
-- Scope: Green Freight Academy only. This migration must not be copied to
-- BetterDriver, SafeFreight, TAG, or any sister repository.
-- Safety: idempotent function replacement only. It does not create, issue,
-- revoke, supersede or delete any certificate until an authenticated GFA
-- administrator invokes the corresponding protected API route.
-- =============================================================================

-- Applies one canonical GFA certificate decision in one database transaction.
-- It locks the certificate rows, reconciles the originating BetterDriver
-- completion-evidence event when present, and creates an administrator audit
-- record with the actor, lifecycle transition, bounded reason and correlation
-- ID. Rendering/uploading an issued PDF deliberately remains outside this
-- function because object storage is not transactional with PostgreSQL.
CREATE OR REPLACE FUNCTION gfa_apply_certificate_decision(
  p_action TEXT,
  p_certificate_id UUID,
  p_admin_id UUID,
  p_admin_name TEXT,
  p_reason TEXT DEFAULT NULL,
  p_replacement_certificate_id UUID DEFAULT NULL
)
RETURNS TABLE (
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
  certificate_row certifications%ROWTYPE;
  replacement_row certifications%ROWTYPE;
  allocated_number TEXT;
  prior_lifecycle TEXT;
  next_lifecycle TEXT;
  audit_action TEXT;
  audit_correlation_id UUID := gen_random_uuid();
  event_outcome TEXT;
BEGIN
  IF p_action NOT IN ('ISSUE', 'NOT_ELIGIBLE', 'REVOKE', 'SUPERSEDE') THEN
    RAISE EXCEPTION 'Unsupported certificate decision action' USING ERRCODE = 'P0001';
  END IF;

  IF p_admin_id IS NULL OR coalesce(trim(p_admin_name), '') = '' THEN
    RAISE EXCEPTION 'A GFA administrator identity is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO certificate_row
  FROM certifications
  WHERE id = p_certificate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate was not found' USING ERRCODE = 'P0001';
  END IF;

  prior_lifecycle := certificate_row.lifecycle_status;

  IF p_action = 'ISSUE' THEN
    IF certificate_row.lifecycle_status <> 'PENDING_REVIEW' THEN
      RAISE EXCEPTION 'Certificate is not eligible for issuance' USING ERRCODE = 'P0001';
    END IF;

    allocated_number := gfa_allocate_certificate_number(NOW());
    UPDATE certifications
    SET certificate_number = allocated_number,
        status = 'pending_document',
        lifecycle_status = 'ISSUED',
        issued_at = NOW(),
        lifecycle_updated_at = NOW(),
        decision_reason = NULL
    WHERE id = certificate_row.id
    RETURNING * INTO certificate_row;

    next_lifecycle := 'ISSUED';
    audit_action := 'certificate_issued';
    event_outcome := NULL;

  ELSIF p_action = 'NOT_ELIGIBLE' THEN
    IF certificate_row.lifecycle_status <> 'PENDING_REVIEW' THEN
      RAISE EXCEPTION 'Certificate cannot be marked not eligible from its current lifecycle state' USING ERRCODE = 'P0001';
    END IF;
    IF length(coalesce(trim(p_reason), '')) < 10 OR length(trim(p_reason)) > 500 THEN
      RAISE EXCEPTION 'A decision reason between 10 and 500 characters is required' USING ERRCODE = 'P0001';
    END IF;

    UPDATE certifications
    SET status = 'not_eligible',
        lifecycle_status = 'NOT_ELIGIBLE',
        decision_reason = trim(p_reason),
        lifecycle_updated_at = NOW()
    WHERE id = certificate_row.id
    RETURNING * INTO certificate_row;

    next_lifecycle := 'NOT_ELIGIBLE';
    audit_action := 'certificate_not_eligible';
    event_outcome := trim(p_reason);

  ELSIF p_action = 'REVOKE' THEN
    IF certificate_row.lifecycle_status <> 'ISSUED' THEN
      RAISE EXCEPTION 'Certificate cannot be revoked from its current lifecycle state' USING ERRCODE = 'P0001';
    END IF;
    IF length(coalesce(trim(p_reason), '')) < 10 OR length(trim(p_reason)) > 500 THEN
      RAISE EXCEPTION 'A revocation reason between 10 and 500 characters is required' USING ERRCODE = 'P0001';
    END IF;

    UPDATE certifications
    SET status = 'revoked',
        lifecycle_status = 'REVOKED',
        revoked_at = NOW(),
        revoked_by = p_admin_id,
        revoked_reason = trim(p_reason),
        lifecycle_updated_at = NOW()
    WHERE id = certificate_row.id
    RETURNING * INTO certificate_row;

    next_lifecycle := 'REVOKED';
    audit_action := 'certificate_revoked';
    event_outcome := trim(p_reason);

  ELSE
    IF certificate_row.lifecycle_status <> 'ISSUED' THEN
      RAISE EXCEPTION 'Certificate cannot be superseded from its current lifecycle state' USING ERRCODE = 'P0001';
    END IF;
    IF p_replacement_certificate_id IS NULL THEN
      RAISE EXCEPTION 'A replacement certificate is required' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO replacement_row
    FROM certifications
    WHERE id = p_replacement_certificate_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Replacement certificate was not found' USING ERRCODE = 'P0001';
    END IF;
    IF replacement_row.id = certificate_row.id OR replacement_row.driver_id <> certificate_row.driver_id THEN
      RAISE EXCEPTION 'Replacement certificate must be a different issued certificate for the same driver' USING ERRCODE = 'P0001';
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
    WHERE id = certificate_row.id
    RETURNING * INTO certificate_row;

    next_lifecycle := 'SUPERSEDED';
    audit_action := 'certificate_superseded';
    event_outcome := 'Replaced by certificate ' || replacement_row.certificate_ref;
  END IF;

  IF certificate_row.decision_event_id IS NOT NULL THEN
    UPDATE certificate_decision_events
    SET decision_status = next_lifecycle,
        outcome_detail = event_outcome,
        processed_at = NOW()
    WHERE id = certificate_row.decision_event_id;
  END IF;

  INSERT INTO admin_audit_log (
    admin_id,
    admin_name,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    p_admin_id,
    p_admin_name,
    audit_action,
    'certifications',
    certificate_row.id,
    jsonb_build_object(
      'certificate_ref', certificate_row.certificate_ref,
      'certificate_number', certificate_row.certificate_number,
      'previous_lifecycle_status', prior_lifecycle,
      'lifecycle_status', next_lifecycle,
      'reason', nullif(trim(coalesce(p_reason, '')), ''),
      'replacement_certificate_id', p_replacement_certificate_id,
      'decision_event_id', certificate_row.decision_event_id,
      'correlation_id', audit_correlation_id
    ),
    NOW()
  );

  certificate_id := certificate_row.id;
  certificate_ref := certificate_row.certificate_ref;
  certificate_number := certificate_row.certificate_number;
  certificate_version := certificate_row.certificate_version;
  lifecycle_status := certificate_row.lifecycle_status;
  issued_at := certificate_row.issued_at;
  expires_at := certificate_row.expires_at;
  decision_event_id := certificate_row.decision_event_id;
  correlation_id := audit_correlation_id;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- END RELEASE 13 MIGRATION
-- =============================================================================
