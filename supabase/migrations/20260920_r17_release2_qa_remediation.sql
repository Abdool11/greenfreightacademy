-- =============================================================================
-- RELEASE 17: GFA Release 2 QA Remediation
-- Scope: Green Freight Academy only.
--
-- This migration makes the authorised launch catalogue explicit and provides an
-- advisory-lock protected invitation reservation helper for the GFA admin cohort
-- approval workflow. It does not contact BetterDriver, send messages, issue
-- certificates, delete records, reconcile historic data or change production
-- settings by itself.
-- =============================================================================

-- Catalogue compatibility: historic environments have not always contained the
-- same course-display fields. Add only additive fields needed by the live GFA
-- pricing and programme queries.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE;

-- The historic invitation table exists in more than one shape across GFA
-- environments. These additive fields support safe invitation reuse and a
-- minimal delivery record without depending on an untracked schema change.
ALTER TABLE driver_invitations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_slug TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_mobile TEXT,
  ADD COLUMN IF NOT EXISTS driver_email TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_via TEXT[];

ALTER TABLE enrolments
  ADD COLUMN IF NOT EXISTS programme_id TEXT,
  ADD COLUMN IF NOT EXISTS programme_slug TEXT,
  ADD COLUMN IF NOT EXISTS modules_completed INTEGER DEFAULT 0;

-- Fail closed if this environment has no recognised Professional Truck Driver
-- Program record. Engineering must resolve the catalogue data deliberately,
-- rather than deploying a customer journey that could sell another programme.
DO $$
DECLARE
  ptdp_course_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO ptdp_course_count
  FROM courses
  WHERE slug IN ('ptdp', 'professional-truck-driver');

  IF ptdp_course_count = 0 THEN
    RAISE EXCEPTION
      'Release 17 requires one existing PTDP course with slug ptdp or professional-truck-driver';
  END IF;
END
$$;

-- Keep exactly one canonical PTDP record customer-visible. Historic duplicate
-- aliases are preserved for audit/history but are not offered for new sales.
WITH ranked_ptdp AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS row_number
  FROM courses
  WHERE slug IN ('ptdp', 'professional-truck-driver')
)
UPDATE courses AS course
SET price_corporate = 299,
    price_individual = 0,
    price_model = 'once_off',
    cpd_frequency = NULL,
    is_active = TRUE,
    is_visible = TRUE,
    available = TRUE,
    status = 'active'
FROM ranked_ptdp
WHERE course.id = ranked_ptdp.id
  AND ranked_ptdp.row_number = 1;

-- All other offers, including any duplicate PTDP alias, remain in the database
-- but are unavailable and hidden from the public, client and quote paths until
-- a later GFA product release explicitly enables them.
WITH ranked_ptdp AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS row_number
  FROM courses
  WHERE slug IN ('ptdp', 'professional-truck-driver')
)
UPDATE courses AS course
SET is_active = FALSE,
    is_visible = FALSE,
    available = FALSE,
    status = 'archived'
WHERE NOT EXISTS (
  SELECT 1
  FROM ranked_ptdp
  WHERE ranked_ptdp.id = course.id
    AND ranked_ptdp.row_number = 1
);

-- Reserve one driver invitation per deployment through an advisory lock. This
-- keeps repeated administrator clicks/retries from creating a second invitation
-- or triggering a second outbound send. Existing historic invitations are never
-- changed or deleted; the latest unrevoked one is returned as the reusable row.
CREATE OR REPLACE FUNCTION gfa_reserve_cohort_driver_invitation(
  p_deployment_id UUID,
  p_driver_id UUID,
  p_company_id UUID,
  p_programme_slug TEXT,
  p_driver_name TEXT,
  p_driver_mobile TEXT,
  p_driver_email TEXT,
  p_expires_at TIMESTAMPTZ,
  p_token TEXT
)
RETURNS TABLE (
  invitation_id UUID,
  token TEXT,
  reused BOOLEAN,
  whatsapp_sent_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_invitation driver_invitations%ROWTYPE;
  created_invitation driver_invitations%ROWTYPE;
BEGIN
  IF p_deployment_id IS NULL OR p_driver_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'Deployment, driver and company are required';
  END IF;
  IF COALESCE(trim(p_token), '') = '' THEN
    RAISE EXCEPTION 'Invitation token is required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_deployment_id::TEXT || ':' || p_driver_id::TEXT, 0)
  );

  SELECT *
  INTO existing_invitation
  FROM driver_invitations
  WHERE deployment_id = p_deployment_id
    AND driver_id = p_driver_id
    AND revoked_at IS NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF FOUND THEN
    invitation_id := existing_invitation.id;
    token := existing_invitation.token;
    reused := TRUE;
    whatsapp_sent_at := existing_invitation.whatsapp_sent_at;
    email_sent_at := existing_invitation.email_sent_at;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO driver_invitations (
    driver_id,
    company_id,
    deployment_id,
    token,
    program_assignment,
    programme_slug,
    driver_name,
    driver_mobile,
    driver_email,
    status,
    expires_at,
    created_at
  ) VALUES (
    p_driver_id,
    p_company_id,
    p_deployment_id,
    p_token,
    'p1',
    COALESCE(NULLIF(trim(p_programme_slug), ''), 'professional-truck-driver'),
    COALESCE(NULLIF(trim(p_driver_name), ''), 'Driver'),
    NULLIF(trim(p_driver_mobile), ''),
    NULLIF(trim(p_driver_email), ''),
    'pending',
    p_expires_at,
    NOW()
  )
  RETURNING * INTO created_invitation;

  invitation_id := created_invitation.id;
  token := created_invitation.token;
  reused := FALSE;
  whatsapp_sent_at := NULL;
  email_sent_at := NULL;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION gfa_reserve_cohort_driver_invitation(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gfa_reserve_cohort_driver_invitation(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT
) TO service_role;

-- =============================================================================
-- END RELEASE 17 MIGRATION
-- =============================================================================
