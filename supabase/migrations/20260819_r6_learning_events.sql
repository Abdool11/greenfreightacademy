-- Release 6: BetterDriver/Moodle event ledger and training-start revenue recognition
CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('betterdriver','moodle')),
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('training_link_activated','training_started','module_completed','training_completed','certificate_issued','briefing_delivered','briefing_acknowledged')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  enrolment_id UUID REFERENCES enrolments(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  UNIQUE(source, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_learning_events_enrolment_time ON learning_events(enrolment_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS revenue_recognition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrolment_id UUID NOT NULL REFERENCES enrolments(id) ON DELETE CASCADE,
  learning_event_id UUID NOT NULL REFERENCES learning_events(id) ON DELETE RESTRICT,
  recognised_at TIMESTAMPTZ NOT NULL,
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount >= 0),
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enrolment_id)
);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_company_time ON revenue_recognition_events(company_id, recognised_at DESC);

ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS training_started_event_id UUID REFERENCES learning_events(id) ON DELETE SET NULL;

ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_recognition_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='learning_events' AND policyname='learning_events_service_only') THEN
    CREATE POLICY "learning_events_service_only" ON learning_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='revenue_recognition_events' AND policyname='revenue_recognition_service_only') THEN
    CREATE POLICY "revenue_recognition_service_only" ON revenue_recognition_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
