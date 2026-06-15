-- ============================================================
-- TAG ECOSYSTEM — CORRECTED SEED SCRIPTS (title-compatible)
-- ============================================================
-- Run this in the Supabase SQL Editor AFTER running
-- ALL_MIGRATIONS_RUN_ONCE.sql
--
-- IMPORTANT: Change the passwords below before running.
-- Passwords are bcrypt-hashed. Generate a hash at:
-- https://bcrypt-generator.com (use 10 rounds)
--
-- The placeholder hash below corresponds to: TagAdmin2024!
-- Replace with your own secure password hash.
-- ============================================================

-- ─── TAG Admin ────────────────────────────────────────────────────────────────
-- Default login: admin@transportactiongroup.co.za / TagAdmin2024!
INSERT INTO tag_admins (email, name, password_hash, role, created_at)
VALUES (
  'admin@transportactiongroup.co.za',
  'TAG Administrator',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi',
  'super_admin',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ─── GFA Admin ────────────────────────────────────────────────────────────────
-- Default login: admin@greenfreightacademy.co.za / GfaAdmin2024!
INSERT INTO gfa_admins (email, name, password_hash, role, created_at)
VALUES (
  'admin@greenfreightacademy.co.za',
  'GFA Administrator',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi',
  'super_admin',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ─── BD Admin ─────────────────────────────────────────────────────────────────
-- Default login: admin@betterdriver.co.za / BdAdmin2024!
INSERT INTO bd_admins (email, name, password_hash, role, created_at)
VALUES (
  'admin@betterdriver.co.za',
  'BetterDriver Administrator',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi',
  'super_admin',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ─── GFA Site Config (Default Values) ────────────────────────────────────────
INSERT INTO site_config (key, value, description) VALUES
  ('whatsapp_phone_id',       'REPLACE_WITH_META_PHONE_ID',       'Meta WhatsApp Phone Number ID'),
  ('whatsapp_access_token',   'REPLACE_WITH_META_ACCESS_TOKEN',   'Meta WhatsApp Permanent System User Token'),
  ('whatsapp_welcome_template', 'gfa_driver_magic_link',          'Meta-approved template for driver welcome/magic link'),
  ('whatsapp_magic_link_template', 'gfa_driver_magic_link',       'Meta-approved template for company deploy magic link'),
  ('support_email',           'support@greenfreightacademy.co.za','Default support email address'),
  ('support_phone',           '+27 XX XXX XXXX',                  'Default support phone number')
ON CONFLICT (key) DO NOTHING;

-- ─── GFA Courses (Default Programmes) ────────────────────────────────────────
-- NOTE: Uses "title" column (live DB schema). If your DB still has "name",
-- change "title" to "name" below before running.
INSERT INTO courses (
  id, title, slug, description,
  price_corporate, price_individual,
  programme, moodle_course_id,
  is_active, status,
  module_count, duration_weeks, price_model, cpd_frequency, audience,
  created_at
) VALUES
  (
    gen_random_uuid(),
    'Professional Truck Driver Programme',
    'professional-truck-driver',
    'Comprehensive driver development programme for professional truck drivers.',
    1500.00, 1500.00,
    'p1', NULL,
    TRUE, 'active',
    12, 12, 'per_driver_per_month', 'quarterly', 'drivers',
    NOW()
  ),
  (
    gen_random_uuid(),
    'Eco-Driver Training',
    'eco-driver-training',
    'Fuel efficiency and eco-driving techniques for commercial drivers.',
    800.00, 800.00,
    'p1', NULL,
    TRUE, 'active',
    8, 4, 'per_driver_per_month', 'quarterly', 'drivers',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- ─── Verification Query ───────────────────────────────────────────────────────
-- Run this after the seed to verify everything was inserted correctly:
-- SELECT 'tag_admins' as tbl, count(*) from tag_admins
-- UNION ALL SELECT 'gfa_admins', count(*) from gfa_admins
-- UNION ALL SELECT 'bd_admins', count(*) from bd_admins
-- UNION ALL SELECT 'site_config', count(*) from site_config
-- UNION ALL SELECT 'courses', count(*) from courses;
