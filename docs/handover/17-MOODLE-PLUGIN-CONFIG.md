# TAG Ecosystem — Moodle Plugin Configuration Reference

This document provides the exact configuration values required for the Moodle Outgoing Webhooks plugin. Asif must configure this plugin in Moodle to ensure progress syncs back to the BetterDriver (BD) platform.

## Plugin Installation

1.  Log in to Moodle as an Administrator.
2.  Navigate to **Site administration > Plugins > Install plugins**.
3.  Install the **Outgoing Webhooks** plugin (if not already installed).

## Webhook Configuration

Navigate to **Site administration > Plugins > Local plugins > Outgoing webhooks** and create a new webhook with the following settings:

### General Settings

*   **Name:** BetterDriver Progress Sync
*   **Status:** Enabled
*   **URL:** `https://betterdriver.co.za/api/moodle/webhook` (Replace with the actual BD domain if different)
*   **Secret:** `[Generate a strong random string, e.g., using openssl rand -hex 32]`
    *   *Note: This exact secret must be set as `MOODLE_WEBHOOK_SECRET` in the BD `.env.local` file.*

### Event Subscriptions

You must subscribe to the following specific events. Do not subscribe to all events, as this will overwhelm the BD server.

1.  **\core\event\course_module_completion_updated**
    *   *Purpose:* Triggers when a driver completes a specific module within a course.
2.  **\core\event\course_completed**
    *   *Purpose:* Triggers when a driver completes the entire course.

### Payload Settings

*   **Payload format:** JSON
*   **Include event data:** Yes
*   **Include user data:** Yes (Required to identify the driver)
*   **Include course data:** Yes (Required to identify the course)

## Verification

After configuring the webhook in Moodle and setting the `MOODLE_WEBHOOK_SECRET` in BD, you can verify the connection using the Postman collection provided in this handover package.

1.  Open the Postman collection.
2.  Run the **Moodle Webhook (Simulate Progress Update)** request.
3.  Ensure the `X-Moodle-Signature` header matches the HMAC SHA256 signature of the payload using your secret.
4.  Verify that the BD database (`moodle_webhook_log` and `enrolments` tables) updates correctly.
