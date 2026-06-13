-- ============================================================
-- TAG Ecosystem — Row-Level Security (RLS) Migration
-- 20260506_enable_rls_all_tables.sql
-- ============================================================
-- CONTEXT
-- -------
-- All API routes in BD, GFA, and TAG use the service_role key
-- (supabaseAdmin) which bypasses RLS. This is correct and safe.
--
-- However, the anon key is embedded in the frontend bundle
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY). Without RLS, anyone who
-- extracts the anon key from the browser can read, write, and
-- delete all data directly via the Supabase REST API.
--
-- This migration:
--   1. Enables RLS on every table that was missing it
--   2. Adds a single "deny all anon" policy on each table
--      (service_role bypasses RLS entirely — no policy needed)
--   3. Preserves the existing policies on tables that already
--      had RLS enabled (companies, drivers, enrolments, etc.)
--
-- POLICY DESIGN
-- -------------
-- Because all legitimate access goes through our Next.js API
-- routes using the service_role key, the correct policy for
-- every table is: DENY ALL for the anon role.
-- This is the most secure and simplest approach.
-- ============================================================

-- ── 1. Tables that already had RLS — ensure policies are tight ──────────────

-- certifications (already has RLS)
DROP POLICY IF EXISTS "deny_anon_certifications" ON certifications;
CREATE POLICY "deny_anon_certifications"
  ON certifications FOR ALL
  TO anon
  USING (false);

-- companies (already has RLS)
DROP POLICY IF EXISTS "deny_anon_companies" ON companies;
CREATE POLICY "deny_anon_companies"
  ON companies FOR ALL
  TO anon
  USING (false);

-- driver_invitations (already has RLS)
DROP POLICY IF EXISTS "deny_anon_driver_invitations" ON driver_invitations;
CREATE POLICY "deny_anon_driver_invitations"
  ON driver_invitations FOR ALL
  TO anon
  USING (false);

-- drivers (already has RLS)
DROP POLICY IF EXISTS "deny_anon_drivers" ON drivers;
CREATE POLICY "deny_anon_drivers"
  ON drivers FOR ALL
  TO anon
  USING (false);

-- enrolments (already has RLS)
DROP POLICY IF EXISTS "deny_anon_enrolments" ON enrolments;
CREATE POLICY "deny_anon_enrolments"
  ON enrolments FOR ALL
  TO anon
  USING (false);

-- gfa_videos (already has RLS)
DROP POLICY IF EXISTS "deny_anon_gfa_videos" ON gfa_videos;
CREATE POLICY "deny_anon_gfa_videos"
  ON gfa_videos FOR ALL
  TO anon
  USING (false);

-- training_campaigns (already has RLS)
DROP POLICY IF EXISTS "deny_anon_training_campaigns" ON training_campaigns;
CREATE POLICY "deny_anon_training_campaigns"
  ON training_campaigns FOR ALL
  TO anon
  USING (false);

-- ── 2. Tables missing RLS — enable and lock down ────────────────────────────

-- admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_admin_audit_log" ON admin_audit_log;
CREATE POLICY "deny_anon_admin_audit_log"
  ON admin_audit_log FOR ALL
  TO anon
  USING (false);

-- bd_admins
ALTER TABLE bd_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bd_admins" ON bd_admins;
CREATE POLICY "deny_anon_bd_admins"
  ON bd_admins FOR ALL
  TO anon
  USING (false);

-- bulletin_campaigns
ALTER TABLE bulletin_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bulletin_campaigns" ON bulletin_campaigns;
CREATE POLICY "deny_anon_bulletin_campaigns"
  ON bulletin_campaigns FOR ALL
  TO anon
  USING (false);

-- bulletin_payments
ALTER TABLE bulletin_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bulletin_payments" ON bulletin_payments;
CREATE POLICY "deny_anon_bulletin_payments"
  ON bulletin_payments FOR ALL
  TO anon
  USING (false);

-- bulletins
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_bulletins" ON bulletins;
CREATE POLICY "deny_anon_bulletins"
  ON bulletins FOR ALL
  TO anon
  USING (false);

-- campaign_logs
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_campaign_logs" ON campaign_logs;
CREATE POLICY "deny_anon_campaign_logs"
  ON campaign_logs FOR ALL
  TO anon
  USING (false);

-- certifications (already handled above)

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_courses" ON courses;
CREATE POLICY "deny_anon_courses"
  ON courses FOR ALL
  TO anon
  USING (false);

-- cpd_library
ALTER TABLE cpd_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_library" ON cpd_library;
CREATE POLICY "deny_anon_cpd_library"
  ON cpd_library FOR ALL
  TO anon
  USING (false);

-- cpd_library_items
ALTER TABLE cpd_library_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_library_items" ON cpd_library_items;
CREATE POLICY "deny_anon_cpd_library_items"
  ON cpd_library_items FOR ALL
  TO anon
  USING (false);

-- cpd_modules
ALTER TABLE cpd_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_modules" ON cpd_modules;
CREATE POLICY "deny_anon_cpd_modules"
  ON cpd_modules FOR ALL
  TO anon
  USING (false);

-- cpd_records
ALTER TABLE cpd_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_cpd_records" ON cpd_records;
CREATE POLICY "deny_anon_cpd_records"
  ON cpd_records FOR ALL
  TO anon
  USING (false);

-- deployments
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_deployments" ON deployments;
CREATE POLICY "deny_anon_deployments"
  ON deployments FOR ALL
  TO anon
  USING (false);

-- driver_bulletin_interactions
ALTER TABLE driver_bulletin_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_driver_bulletin_interactions" ON driver_bulletin_interactions;
CREATE POLICY "deny_anon_driver_bulletin_interactions"
  ON driver_bulletin_interactions FOR ALL
  TO anon
  USING (false);

-- driver_cpd_participation
ALTER TABLE driver_cpd_participation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_driver_cpd_participation" ON driver_cpd_participation;
CREATE POLICY "deny_anon_driver_cpd_participation"
  ON driver_cpd_participation FOR ALL
  TO anon
  USING (false);

-- gfa_admins
ALTER TABLE gfa_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_gfa_admins" ON gfa_admins;
CREATE POLICY "deny_anon_gfa_admins"
  ON gfa_admins FOR ALL
  TO anon
  USING (false);

-- moodle_completion_log
ALTER TABLE moodle_completion_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_moodle_completion_log" ON moodle_completion_log;
CREATE POLICY "deny_anon_moodle_completion_log"
  ON moodle_completion_log FOR ALL
  TO anon
  USING (false);

-- moodle_webhook_log
ALTER TABLE moodle_webhook_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_moodle_webhook_log" ON moodle_webhook_log;
CREATE POLICY "deny_anon_moodle_webhook_log"
  ON moodle_webhook_log FOR ALL
  TO anon
  USING (false);

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_payments" ON payments;
CREATE POLICY "deny_anon_payments"
  ON payments FOR ALL
  TO anon
  USING (false);

-- prospect_leads
ALTER TABLE prospect_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_prospect_leads" ON prospect_leads;
CREATE POLICY "deny_anon_prospect_leads"
  ON prospect_leads FOR ALL
  TO anon
  USING (false);

-- quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_quotes" ON quotes;
CREATE POLICY "deny_anon_quotes"
  ON quotes FOR ALL
  TO anon
  USING (false);

-- session_token_blocklist
ALTER TABLE session_token_blocklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_session_token_blocklist" ON session_token_blocklist;
CREATE POLICY "deny_anon_session_token_blocklist"
  ON session_token_blocklist FOR ALL
  TO anon
  USING (false);

-- site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_site_config" ON site_config;
CREATE POLICY "deny_anon_site_config"
  ON site_config FOR ALL
  TO anon
  USING (false);

-- trial_vouchers
ALTER TABLE trial_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_trial_vouchers" ON trial_vouchers;
CREATE POLICY "deny_anon_trial_vouchers"
  ON trial_vouchers FOR ALL
  TO anon
  USING (false);

-- ── 3. Verify ────────────────────────────────────────────────────────────────
-- After running this migration, run the following query in the Supabase SQL
-- editor to confirm zero tables have RLS disabled:
--
--   SELECT tablename
--   FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename NOT IN (
--       SELECT relname FROM pg_class
--       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
--       WHERE nspname = 'public' AND relrowsecurity = true
--     );
--
-- Expected result: 0 rows.
-- ============================================================
