-- RELEASE 9: Payment Credit Allocation Idempotency
-- Prevent duplicate credit balances when Paystack browser verification and webhook
-- delivery both observe the same successful payment. Safe to run repeatedly.
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_credit_allocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  quote_id      UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credit_count  INTEGER NOT NULL CHECK (credit_count > 0),
  allocated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A paid quote can contribute its purchased seats once. The payment constraint
-- also protects against duplicate payment-provider callbacks for the same row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_credit_allocations_payment
  ON payment_credit_allocations(payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_credit_allocations_quote
  ON payment_credit_allocations(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_credit_allocations_company
  ON payment_credit_allocations(company_id, allocated_at DESC);

CREATE OR REPLACE FUNCTION allocate_quote_credits_once(
  p_payment_id UUID,
  p_quote_id UUID,
  p_company_id UUID,
  p_credit_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  did_allocate BOOLEAN := FALSE;
BEGIN
  IF p_credit_count IS NULL OR p_credit_count <= 0 THEN
    RAISE EXCEPTION 'Credit count must be positive';
  END IF;

  -- Validate the payment/quote/company relationship while locking the payment.
  PERFORM 1
  FROM payments
  WHERE id = p_payment_id
    AND quote_id = p_quote_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment does not belong to the supplied quote and company';
  END IF;

  INSERT INTO payment_credit_allocations (payment_id, quote_id, company_id, credit_count)
  VALUES (p_payment_id, p_quote_id, p_company_id, p_credit_count)
  ON CONFLICT DO NOTHING
  RETURNING TRUE INTO did_allocate;

  IF did_allocate THEN
    UPDATE companies
    SET credit_balance = COALESCE(credit_balance, 0) + p_credit_count
    WHERE id = p_company_id;
  END IF;

  RETURN COALESCE(did_allocate, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION allocate_quote_credits_once(UUID, UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION allocate_quote_credits_once(UUID, UUID, UUID, INTEGER) TO service_role;

-- =============================================================================
-- END RELEASE 9 MIGRATION
-- =============================================================================
