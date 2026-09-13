-- =============================================================================
-- RELEASE 15: GFA CPD Queue and Bulletin QA Repair
-- Scope: Green Freight Academy only.
-- Safety: restores only GFA CPD queue schema compatibility and adds an atomic
-- queue-decision/audit helper. It does not send bulletins or messages.
-- =============================================================================

CREATE TABLE IF NOT EXISTS cpd_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id UUID REFERENCES bulletins(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  why_relevant TEXT,
  source_company_name TEXT,
  shared_anonymously BOOLEAN DEFAULT FALSE,
  image_urls JSONB,
  status TEXT DEFAULT 'pending_review',
  is_urgent_contribution BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Older environments may contain an earlier CPD table shape. Restore each
-- current route dependency idempotently rather than assuming all historic
-- migrations were applied in every environment.
ALTER TABLE cpd_library_items
  ADD COLUMN IF NOT EXISTS bulletin_id UUID REFERENCES bulletins(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS why_relevant TEXT,
  ADD COLUMN IF NOT EXISTS source_company_name TEXT,
  ADD COLUMN IF NOT EXISTS shared_anonymously BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_urls JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS is_urgent_contribution BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_cpd_library_items_status ON cpd_library_items(status);

CREATE OR REPLACE FUNCTION gfa_apply_cpd_library_decision(
  p_item_id UUID,
  p_action TEXT,
  p_admin_id UUID,
  p_admin_name TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  item_id UUID,
  status TEXT,
  audit_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  item_row cpd_library_items%ROWTYPE;
  resulting_status TEXT;
  audit_id_value UUID;
  now_value TIMESTAMPTZ := NOW();
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Unsupported CPD queue action' USING ERRCODE = 'P0001';
  END IF;
  IF p_admin_id IS NULL OR COALESCE(trim(p_admin_name), '') = '' THEN
    RAISE EXCEPTION 'A GFA administrator identity is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO item_row
  FROM cpd_library_items
  WHERE id = p_item_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CPD library item was not found' USING ERRCODE = 'P0001';
  END IF;
  IF item_row.status <> 'pending_review' THEN
    RAISE EXCEPTION 'CPD library item is not pending review' USING ERRCODE = 'P0001';
  END IF;

  resulting_status := CASE p_action WHEN 'approve' THEN 'approved' ELSE 'rejected' END;

  UPDATE cpd_library_items
  SET status = resulting_status,
      admin_notes = NULLIF(trim(p_admin_notes), ''),
      reviewed_by = p_admin_id,
      reviewed_at = now_value
  WHERE id = item_row.id;

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
    'cpd_library_' || p_action,
    'cpd_library_items',
    item_row.id,
    jsonb_build_object(
      'title', item_row.title,
      'bulletin_id', item_row.bulletin_id,
      'company_id', item_row.company_id,
      'status_before', item_row.status,
      'status_after', resulting_status,
      'admin_notes', NULLIF(trim(p_admin_notes), '')
    ),
    now_value
  ) RETURNING id INTO audit_id_value;

  item_id := item_row.id;
  status := resulting_status;
  audit_id := audit_id_value;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- END RELEASE 15 MIGRATION
-- =============================================================================
