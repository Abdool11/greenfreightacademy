-- =============================================================================
-- MIGRATION: 20260806_accounting_notifications.sql
-- Adds: ledger_entries, admin_notification_prefs, discount columns, promo_codes
-- All statements are additive — safe to re-run with IF NOT EXISTS guards.
-- No existing tables are dropped or structurally modified.
-- =============================================================================

-- =============================================================================
-- 1. LEDGER ENTRIES
-- Append-only financial event log. One row per financial event per company.
-- Populated automatically by API routes — never edited manually.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_type      TEXT NOT NULL,
  -- entry_type values:
  --   'quote_issued'            quote sent to client
  --   'payment_received'        Paystack card payment confirmed
  --   'eft_submitted'           client submitted EFT notification (pending)
  --   'eft_confirmed'           admin manually confirmed EFT
  --   'credits_allocated'       credits added to company balance
  --   'credits_used'            credits consumed by deployment
  --   'credits_refunded'        credits returned (e.g. cancelled deployment)
  --   'trial_credits'           trial credits granted by admin
  --   'bulletin_payment'        urgent bulletin fee paid
  amount          NUMERIC(10,2) NOT NULL,   -- positive = money in; negative = credits used
  currency        TEXT DEFAULT 'ZAR',
  balance_after   NUMERIC(10,2),            -- snapshot of credit_balance after this entry
  quote_id        UUID REFERENCES quotes(id) ON DELETE SET NULL,
  payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,            -- human-readable e.g. "12 drivers × PTDP — Aug 2026"
  reference       TEXT,                     -- quote ref, paystack ref, or EFT ref
  driver_count    INT DEFAULT 0,
  programme_slug  TEXT,
  status          TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'failed', 'reversed'
  created_by      TEXT DEFAULT 'system',    -- 'system', 'paystack_webhook', or admin email
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_company    ON ledger_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type       ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created    ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_status     ON ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_ledger_quote      ON ledger_entries(quote_id);

-- =============================================================================
-- 2. ADMIN NOTIFICATION PREFERENCES
-- One row per event type. Stores which channels are enabled per event.
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_notification_prefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key       TEXT UNIQUE NOT NULL,
  label           TEXT NOT NULL,
  description     TEXT,
  group_name      TEXT DEFAULT 'general',   -- 'transactions', 'operations', 'alerts'
  whatsapp_1      BOOLEAN DEFAULT TRUE,
  whatsapp_2      BOOLEAN DEFAULT FALSE,
  email_1         BOOLEAN DEFAULT TRUE,
  email_2         BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default notification preferences
INSERT INTO admin_notification_prefs
  (event_key, label, description, group_name, whatsapp_1, whatsapp_2, email_1, email_2)
VALUES
  ('company_registered',         'New Company Registered',          'Fires when a new company self-registers or is created by admin.',           'transactions', TRUE,  FALSE, TRUE,  FALSE),
  ('quote_generated',            'New Quote Generated',             'Fires when a client generates a training quote.',                           'transactions', TRUE,  FALSE, TRUE,  FALSE),
  ('eft_submitted',              'EFT Payment Submitted',           'Client has submitted EFT proof — action required to verify and approve.',   'transactions', TRUE,  TRUE,  TRUE,  FALSE),
  ('payment_received_paystack',  'Paystack Payment Received',       'Card payment confirmed via Paystack — auto-approved, no action needed.',    'transactions', TRUE,  FALSE, TRUE,  FALSE),
  ('payment_received_eft',       'EFT Payment Confirmed',           'Admin has manually confirmed an EFT payment.',                             'transactions', FALSE, FALSE, TRUE,  FALSE),
  ('training_deployed',          'Training Deployed',               'A company has deployed training to their drivers.',                         'operations',   FALSE, FALSE, TRUE,  FALSE),
  ('trial_activated',            'Trial Voucher Activated',         'A prospect has activated a trial voucher.',                                 'operations',   TRUE,  FALSE, TRUE,  FALSE),
  ('driver_certified',           'Driver Certified',                'A driver has completed their programme and been certified.',                'operations',   FALSE, FALSE, FALSE, FALSE),
  ('bulletin_payment_received',  'Bulletin Payment Received',       'A company has paid for an urgent driver bulletin.',                         'transactions', TRUE,  FALSE, TRUE,  FALSE),
  ('quote_pending_24h',          'Quote Pending >24h',              'A quote has been unpaid for more than 24 hours — follow-up alert.',         'alerts',       TRUE,  TRUE,  TRUE,  FALSE),
  ('eft_pending_48h',            'EFT Pending >48h',                'An EFT submission has not been confirmed for more than 48 hours.',          'alerts',       TRUE,  TRUE,  TRUE,  TRUE)
ON CONFLICT (event_key) DO NOTHING;

-- =============================================================================
-- 3. ADMIN NOTIFICATION RECIPIENTS
-- Stored in site_config as key/value pairs (consistent with existing pattern).
-- =============================================================================
INSERT INTO site_config (key, value, description) VALUES
  ('admin_whatsapp_1',  '', 'Primary admin WhatsApp number for notifications (e.g. 27821234567)'),
  ('admin_whatsapp_2',  '', 'Secondary admin WhatsApp number for notifications'),
  ('admin_email_2',     '', 'Secondary admin email for notifications (email_1 = email_booking_to)')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 4. NOTIFICATION LOG
-- Records every notification sent — used for the admin notifications log view.
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key       TEXT NOT NULL,
  channel         TEXT NOT NULL,   -- 'whatsapp_1', 'whatsapp_2', 'email_1', 'email_2'
  recipient       TEXT,            -- phone number or email address
  message_preview TEXT,            -- first 200 chars of message
  status          TEXT DEFAULT 'sent',  -- 'sent', 'failed'
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_created ON admin_notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_event   ON admin_notification_log(event_key);

-- =============================================================================
-- 5. DISCOUNT COLUMNS ON COMPANIES AND QUOTES
-- Additive columns only — no existing data affected.
-- =============================================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS discount_percent   NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_note      TEXT,
  ADD COLUMN IF NOT EXISTS discount_set_by    TEXT,
  ADD COLUMN IF NOT EXISTS discount_set_at    TIMESTAMPTZ;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS discount_percent   NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_note      TEXT,
  ADD COLUMN IF NOT EXISTS promo_code         TEXT;

-- =============================================================================
-- 6. PROMO CODES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  discount_type   TEXT NOT NULL DEFAULT 'percent',  -- 'percent' or 'fixed'
  discount_value  NUMERIC(10,2) NOT NULL,
  min_drivers     INT DEFAULT 1,
  max_uses        INT,                               -- NULL = unlimited
  uses_count      INT DEFAULT 0,
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code) WHERE is_active = TRUE;

-- =============================================================================
-- 7. STALE ALERT TRACKING
-- Prevents duplicate stale-pending alerts from the cron job.
-- =============================================================================
CREATE TABLE IF NOT EXISTS stale_alert_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,   -- 'quote' or 'eft'
  entity_id       UUID NOT NULL,
  alert_type      TEXT NOT NULL,   -- 'quote_pending_24h' or 'eft_pending_48h'
  alerted_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_id, alert_type)
);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
