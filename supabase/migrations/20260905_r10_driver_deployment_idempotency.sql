-- RELEASE 10: Driver Deployment Idempotency
-- Reserve a paid quote/driver deployment once before creating enrolments or sending WhatsApp.
-- Safe to run repeatedly. Existing historic deployments are preserved.
-- =============================================================================

CREATE TABLE IF NOT EXISTS quote_driver_deployments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id            UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deployment_id       UUID REFERENCES deployments(id) ON DELETE SET NULL,
  credit_count        INTEGER NOT NULL CHECK (credit_count > 0),
  status              TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'prepared', 'sent', 'delivery_failed')),
  invitation_id       UUID REFERENCES driver_invitations(id) ON DELETE SET NULL,
  deployed_at         TIMESTAMPTZ,
  whatsapp_sent_at    TIMESTAMPTZ,
  failure_detail      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_driver_deployments_quote_driver
  ON quote_driver_deployments(quote_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_quote_driver_deployments_company_status
  ON quote_driver_deployments(company_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION reserve_quote_driver_deployment_once(
  p_quote_id UUID,
  p_driver_id UUID,
  p_company_id UUID,
  p_deployment_id UUID,
  p_credit_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credit_balance NUMERIC;
  did_reserve BOOLEAN := FALSE;
BEGIN
  IF p_credit_count IS NULL OR p_credit_count <= 0 THEN
    RAISE EXCEPTION 'Deployment credit count must be positive';
  END IF;

  SELECT COALESCE(credit_balance, 0)
  INTO current_credit_balance
  FROM companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  IF current_credit_balance < p_credit_count THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO quote_driver_deployments (
    quote_id, driver_id, company_id, deployment_id, credit_count, status
  ) VALUES (
    p_quote_id, p_driver_id, p_company_id, p_deployment_id, p_credit_count, 'reserved'
  )
  ON CONFLICT (quote_id, driver_id) DO NOTHING
  RETURNING TRUE INTO did_reserve;

  IF did_reserve THEN
    UPDATE companies
    SET credit_balance = COALESCE(credit_balance, 0) - p_credit_count
    WHERE id = p_company_id;
  END IF;

  RETURN COALESCE(did_reserve, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION touch_quote_driver_deployment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_driver_deployments_updated_at ON quote_driver_deployments;
CREATE TRIGGER trg_quote_driver_deployments_updated_at
  BEFORE UPDATE ON quote_driver_deployments
  FOR EACH ROW EXECUTE FUNCTION touch_quote_driver_deployment_updated_at();

REVOKE ALL ON FUNCTION reserve_quote_driver_deployment_once(UUID, UUID, UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_quote_driver_deployment_once(UUID, UUID, UUID, UUID, INTEGER) TO service_role;

-- =============================================================================
-- END RELEASE 10 MIGRATION
-- =============================================================================
