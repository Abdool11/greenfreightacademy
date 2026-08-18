-- =============================================================================
-- RELEASE 3: Discount Governance, Authority Controls & Audit Trail
-- All operations are additive and safe to re-run.
-- =============================================================================

-- ─── 1. Role-based discount authority policy ───────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_authority_rules (
  role                           TEXT PRIMARY KEY,
  max_request_percent            NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_approval_percent           NUMERIC(5,2) NOT NULL DEFAULT 0,
  require_different_approver     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO discount_authority_rules (role, max_request_percent, max_approval_percent, require_different_approver)
VALUES
  ('admin', 20.00, 20.00, TRUE),
  ('super_admin', 100.00, 100.00, TRUE)
ON CONFLICT (role) DO UPDATE SET
  max_request_percent = EXCLUDED.max_request_percent,
  max_approval_percent = EXCLUDED.max_approval_percent,
  require_different_approver = EXCLUDED.require_different_approver,
  updated_at = NOW();

-- ─── 2. Controlled discount request records ────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_reference       TEXT UNIQUE NOT NULL,
  discount_type           TEXT NOT NULL, -- percentage | fixed_amount
  requested_value         NUMERIC(12,2) NOT NULL,
  requested_percent       NUMERIC(5,2) NOT NULL DEFAULT 0,
  list_subtotal           NUMERIC(12,2) NOT NULL,
  discount_amount         NUMERIC(12,2) NOT NULL,
  revised_subtotal        NUMERIC(12,2) NOT NULL,
  revised_vat             NUMERIC(12,2) NOT NULL,
  revised_total           NUMERIC(12,2) NOT NULL,
  reason_category         TEXT NOT NULL,
  reason_note             TEXT NOT NULL,
  supporting_reference    TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | applied | cancelled
  requested_by            UUID REFERENCES gfa_admins(id) ON DELETE SET NULL,
  requested_by_name       TEXT NOT NULL,
  requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by             UUID REFERENCES gfa_admins(id) ON DELETE SET NULL,
  approved_by_name        TEXT,
  approved_at             TIMESTAMPTZ,
  approval_note           TEXT,
  rejected_by             UUID REFERENCES gfa_admins(id) ON DELETE SET NULL,
  rejected_by_name        TEXT,
  rejected_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  applied_at              TIMESTAMPTZ,
  applied_quote_version   INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discount_requests_quote ON discount_requests(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discount_requests_status ON discount_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discount_requests_company ON discount_requests(company_id, created_at DESC);

-- ─── 3. Immutable event history for each discount decision ──────────────────────
CREATE TABLE IF NOT EXISTS discount_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_request_id   UUID NOT NULL REFERENCES discount_requests(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL, -- requested | approved | rejected | applied | cancelled
  performed_by          UUID REFERENCES gfa_admins(id) ON DELETE SET NULL,
  performed_by_name     TEXT NOT NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discount_events_request ON discount_events(discount_request_id, created_at ASC);

-- ─── 4. Link the current quote to its approved discount and preserve revisions ──
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS discount_request_id UUID REFERENCES discount_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS list_subtotal       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discount_applied_by TEXT;

ALTER TABLE quote_versions
  ADD COLUMN IF NOT EXISTS discount_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── 5. Notification defaults for governed discount decisions ──────────────────
INSERT INTO admin_notification_prefs
  (event_key, label, description, group_name, whatsapp_1, whatsapp_2, email_1, email_2)
VALUES
  ('discount_requested', 'Discount Approval Requested', 'A discount request needs an independent approval before a revised quote can be issued.', 'transactions', TRUE, FALSE, TRUE, FALSE),
  ('discount_approved', 'Discount Applied to Quote', 'An approved discount has created a revised formal quote.', 'transactions', FALSE, FALSE, TRUE, FALSE)
ON CONFLICT (event_key) DO NOTHING;

-- ─── 6. Updated-at helper ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_discount_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_discount_requests_updated_at ON discount_requests;
CREATE TRIGGER trg_discount_requests_updated_at
  BEFORE UPDATE ON discount_requests
  FOR EACH ROW EXECUTE FUNCTION touch_discount_request_updated_at();

-- =============================================================================
-- END RELEASE 3 MIGRATION
-- =============================================================================
