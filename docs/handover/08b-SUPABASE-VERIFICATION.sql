-- ============================================================
-- TAG Ecosystem — Supabase Schema Verification Queries
-- ============================================================
-- Run these queries in the Supabase SQL Editor to verify that
-- the database schema is correctly deployed.
-- ============================================================

-- ─── 1. Verify All Tables Exist ──────────────────────────────────────────────
-- Expected result: 31 rows, one per table.
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ─── 2. Verify RLS is Enabled on All Tables ──────────────────────────────────
-- Expected result: 0 rows (no tables should be missing RLS).
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT relname
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE nspname = 'public' AND relrowsecurity = true
  );

-- ─── 3. Verify Admin Users Were Seeded ───────────────────────────────────────
-- Expected result: 1 row per admin table.
SELECT 'tag_admins' AS table_name, count(*) AS row_count FROM tag_admins
UNION ALL
SELECT 'gfa_admins', count(*) FROM gfa_admins
UNION ALL
SELECT 'bd_admins', count(*) FROM bd_admins;

-- ─── 4. Verify Core Columns on Key Tables ────────────────────────────────────
-- Expected result: All columns should be present (no missing rows).
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'drivers' AND column_name IN ('id','phone','language_preference','moodle_user_id','profile_complete','activation_status'))
    OR (table_name = 'enrolments' AND column_name IN ('id','driver_id','course_id','status','moodle_enrolment_id','progress_percent','completed_at'))
    OR (table_name = 'companies' AND column_name IN ('id','name','email','password_hash','account_type','is_active'))
    OR (table_name = 'driver_invitations' AND column_name IN ('id','driver_id','token','expires_at','used_at'))
  )
ORDER BY table_name, column_name;

-- ─── 5. Verify Moodle Integration Columns ────────────────────────────────────
-- Expected result: moodle_user_id and moodle_enrolment_id must exist.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('drivers', 'enrolments')
  AND column_name LIKE 'moodle%'
ORDER BY table_name, column_name;

-- ─── 6. Verify Site Config Was Seeded ────────────────────────────────────────
-- Expected result: At least 4 rows of site configuration.
SELECT key, value FROM site_config ORDER BY key;

-- ─── 7. Full Row Count Summary ───────────────────────────────────────────────
-- Use this for a quick health check after deployment.
SELECT
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
