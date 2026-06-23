-- =============================================================================
-- MIGRATION: 20260507_remove_drivers_email_unique.sql
-- Removes the UNIQUE constraint on drivers.email
-- Email is an optional field; multiple drivers may share an email or have NULL
-- =============================================================================

ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_email_key;
