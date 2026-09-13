-- =============================================================================
-- RELEASE 14: EFT Reconciliation Audit Repair
-- Scope: Green Freight Academy only. This migration must not be copied to
-- BetterDriver, SafeFreight, TAG, or any sister repository.
-- Safety: the function performs no work until a protected GFA finance route
-- invokes it. It locks one pending payment and records its decision atomically.
-- =============================================================================

CREATE OR REPLACE FUNCTION gfa_apply_eft_reconciliation_decision(
  p_payment_id UUID,
  p_decision TEXT,
  p_admin_id UUID,
  p_admin_label TEXT,
  p_reconciliation_notes TEXT DEFAULT NULL,
  p_bank_transaction_reference TEXT DEFAULT NULL,
  p_bank_transaction_date DATE DEFAULT NULL
)
RETURNS TABLE (
  payment_id UUID,
  quote_id UUID,
  company_id UUID,
  payment_status TEXT,
  reconciliation_status TEXT,
  expected_amount NUMERIC,
  submitted_amount NUMERIC,
  variance_amount NUMERIC,
  reconciliation_event_id UUID,
  ledger_entry_id UUID,
  audit_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  payment_row payments%ROWTYPE;
  quote_row quotes%ROWTYPE;
  expected_value NUMERIC;
  submitted_value NUMERIC;
  variance_value NUMERIC;
  now_value TIMESTAMPTZ := NOW();
  event_id_value UUID;
  ledger_id_value UUID;
  audit_id_value UUID;
  event_type_value TEXT;
BEGIN
  IF p_decision NOT IN ('confirm', 'request_clarification', 'reject') THEN
    RAISE EXCEPTION 'Unsupported reconciliation decision' USING ERRCODE = 'P0001';
  END IF;
  IF p_admin_id IS NULL OR coalesce(trim(p_admin_label), '') = '' THEN
    RAISE EXCEPTION 'A GFA administrator identity is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO payment_row
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record was not found' USING ERRCODE = 'P0001';
  END IF;
  IF payment_row.status NOT IN ('pending_verification', 'clarification_requested') THEN
    RAISE EXCEPTION 'Payment cannot be reconciled from its current status' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO quote_row
  FROM quotes
  WHERE id = payment_row.quote_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked quote was not found' USING ERRCODE = 'P0001';
  END IF;

  expected_value := COALESCE(payment_row.expected_amount_snapshot, quote_row.total, 0);
  submitted_value := COALESCE(payment_row.amount, 0);
  variance_value := ROUND(submitted_value - expected_value, 2);

  IF p_decision = 'confirm' AND variance_value <> 0 THEN
    RAISE EXCEPTION 'EFT variance must be resolved before confirmation' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision = 'confirm' AND coalesce(trim(p_bank_transaction_reference), '') = '' THEN
    RAISE EXCEPTION 'Bank transaction reference is required before confirmation' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision IN ('request_clarification', 'reject') AND length(coalesce(trim(p_reconciliation_notes), '')) = 0 THEN
    RAISE EXCEPTION 'A reconciliation note is required for this decision' USING ERRCODE = 'P0001';
  END IF;

  IF p_decision = 'confirm' THEN
    UPDATE payments
    SET status = 'confirmed',
        confirmed_at = now_value,
        confirmed_by = p_admin_id,
        reconciliation_status = 'confirmed',
        reconciliation_notes = NULLIF(trim(p_reconciliation_notes), ''),
        bank_transaction_reference = trim(p_bank_transaction_reference),
        bank_transaction_date = p_bank_transaction_date,
        reconciled_at = now_value,
        reconciled_by = p_admin_label
    WHERE id = payment_row.id;

    UPDATE quotes
    SET status = 'approved',
        paid_at = now_value,
        payment_method = 'eft',
        approved_at = now_value,
        approved_by = p_admin_label
    WHERE id = quote_row.id
      AND status = 'eft_submitted';

    event_type_value := 'confirmed';
  ELSIF p_decision = 'reject' THEN
    UPDATE payments
    SET status = 'rejected',
        reconciliation_status = 'rejected',
        reconciliation_notes = trim(p_reconciliation_notes),
        rejected_at = now_value,
        rejected_by = p_admin_label,
        rejection_reason = trim(p_reconciliation_notes),
        reconciled_at = now_value,
        reconciled_by = p_admin_label
    WHERE id = payment_row.id;

    UPDATE quotes
    SET status = 'pending'
    WHERE id = quote_row.id
      AND status = 'eft_submitted';

    event_type_value := 'rejected';
  ELSE
    UPDATE payments
    SET status = 'clarification_requested',
        reconciliation_status = 'clarification_requested',
        reconciliation_notes = trim(p_reconciliation_notes),
        reconciled_at = now_value,
        reconciled_by = p_admin_label
    WHERE id = payment_row.id;

    event_type_value := 'clarification_requested';
  END IF;

  INSERT INTO payment_reconciliation_events (
    payment_id,
    quote_id,
    company_id,
    event_type,
    expected_amount,
    submitted_amount,
    variance_amount,
    eft_reference,
    notes,
    performed_by,
    created_at
  ) VALUES (
    payment_row.id,
    quote_row.id,
    quote_row.company_id,
    event_type_value,
    expected_value,
    submitted_value,
    variance_value,
    COALESCE(payment_row.eft_reference, payment_row.reference),
    NULLIF(trim(p_reconciliation_notes), ''),
    p_admin_label,
    now_value
  ) RETURNING id INTO event_id_value;

  IF p_decision = 'confirm' THEN
    INSERT INTO ledger_entries (
      company_id,
      entry_type,
      amount,
      description,
      reference,
      quote_id,
      payment_id,
      status,
      created_by,
      created_at
    ) VALUES (
      quote_row.company_id,
      'eft_confirmed',
      submitted_value,
      'EFT reconciled and confirmed — ' || quote_row.reference,
      trim(p_bank_transaction_reference),
      quote_row.id,
      payment_row.id,
      'confirmed',
      p_admin_label,
      now_value
    ) RETURNING id INTO ledger_id_value;
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
    p_admin_label,
    'eft_reconciliation_' || event_type_value,
    'payments',
    payment_row.id,
    jsonb_build_object(
      'quote_id', quote_row.id,
      'quote_reference', quote_row.reference,
      'company_id', quote_row.company_id,
      'expected_amount', expected_value,
      'submitted_amount', submitted_value,
      'variance_amount', variance_value,
      'bank_transaction_reference', NULLIF(trim(p_bank_transaction_reference), ''),
      'payment_reconciliation_event_id', event_id_value,
      'ledger_entry_id', ledger_id_value
    ),
    now_value
  ) RETURNING id INTO audit_id_value;

  payment_id := payment_row.id;
  quote_id := quote_row.id;
  company_id := quote_row.company_id;
  payment_status := CASE p_decision
    WHEN 'confirm' THEN 'confirmed'
    WHEN 'reject' THEN 'rejected'
    ELSE 'clarification_requested'
  END;
  reconciliation_status := payment_status;
  expected_amount := expected_value;
  submitted_amount := submitted_value;
  variance_amount := variance_value;
  reconciliation_event_id := event_id_value;
  ledger_entry_id := ledger_id_value;
  audit_id := audit_id_value;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- END RELEASE 14 MIGRATION
-- =============================================================================
