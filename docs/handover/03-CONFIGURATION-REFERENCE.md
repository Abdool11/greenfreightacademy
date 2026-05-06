# TAG Ecosystem — Configuration Reference

This document provides the definitive configuration details for all external integrations required by the TAG ecosystem.

## 1. Environment Variables

The master reference for all environment variables across TAG, GFA, and BD is maintained in the `ENV-VAR-REFERENCE.md` file located in the `docs/` folder of each repository. Ensure all variables are populated before starting the applications.

## 2. Moodle LMS Integration

BetterDriver relies on Moodle for course delivery and progress tracking.

### Required Moodle Settings
1. **Web Services:** Enable web services and the REST protocol.
2. **Service Token:** Create a dedicated service user and generate a token.
3. **Required Functions:** The service must have access to:
   - `core_user_create_users`
   - `core_user_get_users_by_field`
   - `enrol_manual_enrol_users`
   - `core_course_get_courses`
   - `core_completion_get_course_completion_status`
   - `core_course_get_contents`
   - `gradereport_user_get_grade_items`
4. **Course Settings:** Enable Completion Tracking at the site level and within each course.

### Outgoing Webhooks Plugin
To push progress updates from Moodle to BD in real-time, install the "Outgoing Webhooks" plugin in Moodle.
- **Endpoint URL:** `https://betterdriver.co.za/api/moodle/webhook`
- **Secret:** Must match the `MOODLE_WEBHOOK_SECRET` in your BD `.env.local`.
- **Events to Subscribe:** `\core\event\course_module_completion_updated`

## 3. Meta WhatsApp API

GFA and BD use WhatsApp for magic links, welcome messages, and inactivity nudges.

### Required Message Templates
You must create and submit the following templates in the Meta Business Suite. All templates must be in the **Utility** category and support both **English (en_US)** and **Zulu (zu)**.

#### GFA Templates
1. **`gfa_driver_magic_link`**
   - **Variables:** `{{1}}` = Driver Name, `{{2}}` = Company Name, `{{3}}` = Programme Name, `{{4}}` = Magic Link
   - **English Copy:** "Hi {{1}}, {{2}} has enrolled you in the {{3}} programme. Tap here to start: {{4}}"

#### BD Templates
1. **`bd_welcome_first_login`**
   - **Variables:** `{{1}}` = Driver Name, `{{2}}` = Programme Name, `{{3}}` = Portal Link
   - **English Copy:** "Welcome back, {{1}}. Your {{2}} programme is ready. Tap the link below to continue your training: {{3}}"
2. **`bd_module_complete`**
   - **Variables:** `{{1}}` = Driver Name, `{{2}}` = Module Number, `{{3}}` = Portal Link
   - **English Copy:** "Great work, {{1}}! You have completed Module {{2}}. Tap the link below to start the next module: {{3}}"
3. **`bd_inactivity_7day`**
   - **Variables:** `{{1}}` = Driver Name, `{{2}}` = Modules Completed, `{{3}}` = Portal Link
   - **English Copy:** "Hi {{1}}, it has been a week since your last session. You have completed {{2}} modules so far. Tap the link below to pick up where you left off: {{3}}"
4. **`bd_inactivity_14day`**
   - **Variables:** `{{1}}` = Driver Name, `{{2}}` = Modules Completed, `{{3}}` = Portal Link
   - **English Copy:** "Hi {{1}}, your training is waiting for you. You have completed {{2}} modules. Tap the link below to continue: {{3}}"
5. **`bd_programme_complete`**
   - **Variables:** `{{1}}` = Driver Name, `{{2}}` = Programme Name, `{{3}}` = Portal Link
   - **English Copy:** "Congratulations, {{1}}! You have successfully completed the {{2}} programme. Tap the link below to view and download your certificate: {{3}}"

## 4. Supabase Database

The ecosystem uses a single Supabase project.
- **RLS:** Row-Level Security must be enabled on all tables. The migration `20260506_enable_rls_all_tables.sql` handles this.
- **Service Role Key:** All server-side API routes use the `service_role` key to bypass RLS safely. Never expose this key to the frontend.
