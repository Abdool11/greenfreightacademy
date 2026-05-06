# TAG Ecosystem — Known Failure Modes Guide

This guide lists the most common predictable issues Asif will encounter during deployment and integration, along with their diagnosis and fix.

## 1. Authentication & Access

### Symptom: Cannot log into any admin panel after fresh deployment.
* **Diagnosis:** The admin tables (`tag_admins`, `gfa_admins`, `bd_admins`) are empty. There is no default admin account.
* **Fix:** Run the provided seed SQL scripts in the Supabase SQL Editor to insert the first admin user for each platform.

### Symptom: Magic link clicks result in a 500 error or redirect loop.
* **Diagnosis:** The `BD_JWT_SECRET` environment variable is missing or mismatched between GFA (which generates the token) and BD (which verifies it).
* **Fix:** Ensure `BD_JWT_SECRET` is identical in both the GFA and BD `.env.local` files.

## 2. Moodle Integration

### Symptom: Driver activation succeeds, but no Moodle user is created.
* **Diagnosis:** The `MOODLE_TOKEN` is invalid, or the Moodle service user lacks the `core_user_create_users` capability.
* **Fix:** Verify the token in Moodle (Site Admin > Plugins > Web Services > Manage tokens) and check the assigned role's capabilities.

### Symptom: Progress bar in BD portal stays at 0% despite completing modules in Moodle.
* **Diagnosis:** The Moodle Outgoing Webhooks plugin is not configured correctly, or the BD cron polling job is not running.
* **Fix:** 
  1. Check the Moodle webhook logs for failed deliveries.
  2. Verify the `MOODLE_WEBHOOK_SECRET` matches between Moodle and BD.
  3. Ensure the BD polling cron job is executing successfully.

### Symptom: Driver clicks "Start Course" and gets a Moodle login screen instead of the course.
* **Diagnosis:** The auto-login token generation failed, or Moodle is not configured to accept the token.
* **Fix:** Verify the Moodle authentication settings and ensure the auto-login key is configured correctly as per the Moodle integration spec.

## 3. WhatsApp Notifications

### Symptom: WhatsApp messages are not sending (silent failure).
* **Diagnosis:** The Meta Graph API credentials are incorrect, or the message template name/parameters do not match exactly what was approved by Meta.
* **Fix:** 
  1. Check the server logs for Meta API error responses.
  2. Verify `META_WA_TOKEN` and `META_WA_PHONE_NUMBER_ID`.
  3. Ensure the template names in the code exactly match the approved templates in Meta Business Suite.

## 4. Database & Schema

### Symptom: Supabase warns about "Table publicly accessible".
* **Diagnosis:** Row-Level Security (RLS) is disabled on one or more tables.
* **Fix:** Run the `20260506_enable_rls_all_tables.sql` migration in the Supabase SQL Editor.

### Symptom: API routes return 500 errors complaining about missing columns.
* **Diagnosis:** The database schema is out of sync with the codebase. A migration was missed.
* **Fix:** Run the `tag-ecosystem-audit.py` script to identify missing columns, then apply the necessary SQL migrations.

## 5. Environment Variables

### Symptom: Application starts but features fail silently.
* **Diagnosis:** Required environment variables are missing. Next.js does not always crash on startup if a runtime variable is missing.
* **Fix:** Run the Env Var Validator script (`validate-env.js`) before starting the application to ensure all required variables are present.
