# BetterDriver Moodle Integration Guide

This guide covers everything required to connect Moodle to BetterDriver (BD) and Green Freight Academy (GFA). It is written specifically for the system administrator (Asif) and covers every setting, plugin, and environment variable needed for a production deployment.

---

## 1. Architecture Overview

Moodle acts as the backend learning engine. BetterDriver acts as the frontend portal.

1. **Driver Creation:** When a driver taps their magic link for the first time, BD automatically creates a Moodle user account for them via the Moodle REST API.
2. **Enrolment:** BD automatically enrols the driver in the correct Moodle course based on their GFA campaign.
3. **SSO Launch:** When the driver clicks "Start Learning" in BD, they are seamlessly logged into Moodle using a secure token.
4. **Progress Sync:** As the driver completes modules in Moodle, Moodle sends a webhook back to BD. BD updates the database and triggers WhatsApp notifications.

---

## 2. Moodle Admin Configuration

You must enable Web Services in Moodle and create a dedicated service account for BetterDriver.

### Step 2.1: Enable Web Services
1. Log in to Moodle as an administrator.
2. Go to **Site administration > Advanced features**.
3. Check **Enable web services** (`enablewebservices`) and save.
4. Go to **Site administration > Plugins > Web services > Manage protocols**.
5. Enable the **REST protocol** and save.

### Step 2.2: Create the Service Account
1. Go to **Site administration > Users > Accounts > Add a new user**.
2. Create a user named `BetterDriver API` (e.g., username: `bd_api_user`).
3. Give this user a strong password.
4. Go to **Site administration > Users > Permissions > Define roles**.
5. Create a new role called `API Access Role` (System context).
6. Assign the `bd_api_user` to this role.

### Step 2.3: Create the External Service
1. Go to **Site administration > Plugins > Web services > External services**.
2. Click **Add**.
3. Name: `BetterDriver Integration`.
4. Check **Enabled** and **Authorized users only**.
5. Click **Add functions** and add exactly these 7 functions:
   - `core_user_create_users`
   - `core_user_get_users_by_field`
   - `enrol_manual_enrol_users`
   - `core_course_get_courses`
   - `core_completion_get_course_completion_status`
   - `core_course_get_contents`
   - `gradereport_user_get_grade_items`
6. Go to **Authorized users** for this service and add the `bd_api_user`.

### Step 2.4: Generate the Token
1. Go to **Site administration > Plugins > Web services > Manage tokens**.
2. Click **Create token**.
3. Select the `bd_api_user` and the `BetterDriver Integration` service.
4. Save changes and **copy the generated token**. You will need this for the `.env.local` file.

---

## 3. Webhook Configuration (Moodle → BD)

Moodle needs to tell BD when a driver completes a module or course.

1. Install a webhook plugin in Moodle (e.g., `local_webhooks` or similar).
2. Configure the plugin to fire on the following events:
   - `\core\event\course_module_completion_updated`
   - `\core\event\course_completed`
3. Set the payload URL to: `https://betterdriver.co.za/api/moodle/webhook`
4. Set the secret/token in the plugin configuration. **Copy this secret** — you will need it for the `.env.local` file.

---

## 4. Environment Variables

Add the following variables to the BetterDriver `.env.local` file:

```env
# The base URL of your Moodle instance (no trailing slash)
MOODLE_URL=https://your-moodle-domain.com

# The token generated in Step 2.4
MOODLE_TOKEN=your_moodle_api_token_here

# The secret configured in the Moodle webhook plugin (Step 3)
MOODLE_WEBHOOK_SECRET=your_webhook_secret_here

# A random string you generate to secure the polling endpoint
# Generate with: openssl rand -hex 32
MOODLE_POLL_SECRET=your_generated_poll_secret_here

# The Moodle Course IDs for the two programmes
MOODLE_DRIVER_PROGRAMME_COURSE_ID=1
MOODLE_ECO_DRIVER_COURSE_ID=2
```

---

## 5. Cron Jobs (Polling & Inactivity)

BD has two endpoints that must be called regularly to ensure data stays in sync if a webhook fails, and to send inactivity nudges.

If you are hosting on a standard Linux server, add these to your crontab:

```bash
# Run the progress poll every 30 minutes
*/30 * * * * curl -X POST https://betterdriver.co.za/api/moodle/poll -H "Authorization: Bearer YOUR_MOODLE_POLL_SECRET"

# Run the inactivity check daily at 09:00 SAST (07:00 UTC)
0 7 * * * curl -X POST https://betterdriver.co.za/api/moodle/inactivity-check -H "Authorization: Bearer YOUR_MOODLE_POLL_SECRET"
```

---

## 6. Course Structure Requirements

For the integration to work correctly, the Moodle courses must be structured as follows:

1. **Course Completion:** Must be enabled in the course settings.
2. **Activity Completion:** Must be enabled for all modules/quizzes that count towards progress.
3. **Module Naming:** The BD frontend expects 7 modules for the Professional Truck Driver programme. Ensure the Moodle course is divided into 7 distinct sections or topics.

---

## 7. Meta WhatsApp Setup

BD sends automated WhatsApp messages for welcome, module completion, and inactivity nudges. These use the Meta Graph API (same as GFA).

### A. Environment Variables
Add these to your BD `.env.local`:
```env
META_WA_TOKEN=your_permanent_system_user_token
META_WA_PHONE_NUMBER_ID=your_phone_number_id
META_WA_API_VERSION=v19.0
```

### B. Message Templates to Submit
You must create and submit the following 5 templates in the **Meta Business Suite > WhatsApp Manager > Message Templates**.
**Category:** Utility
**Languages:** English (en_US) and Zulu (zu)

#### 1. bd_welcome_first_login
**Variables:** `{{1}}` = Driver Name, `{{2}}` = Programme Name, `{{3}}` = Portal Link
**English Copy:**
> Welcome back, {{1}}. Your {{2}} programme is ready. Tap the link below to continue your training:
> {{3}}

#### 2. bd_module_complete
**Variables:** `{{1}}` = Driver Name, `{{2}}` = Module Number, `{{3}}` = Portal Link
**English Copy:**
> Great work, {{1}}! You have completed Module {{2}}. Tap the link below to start the next module:
> {{3}}

#### 3. bd_inactivity_7day
**Variables:** `{{1}}` = Driver Name, `{{2}}` = Modules Completed, `{{3}}` = Portal Link
**English Copy:**
> Hi {{1}}, it has been a week since your last session. You have completed {{2}} modules so far. Tap the link below to pick up where you left off:
> {{3}}

#### 4. bd_inactivity_14day
**Variables:** `{{1}}` = Driver Name, `{{2}}` = Modules Completed, `{{3}}` = Portal Link
**English Copy:**
> Hi {{1}}, your training is waiting for you. You have completed {{2}} modules. Tap the link below to continue:
> {{3}}

#### 5. bd_programme_complete
**Variables:** `{{1}}` = Driver Name, `{{2}}` = Programme Name, `{{3}}` = Portal Link
**English Copy:**
> Congratulations, {{1}}! You have successfully completed the {{2}} programme. Tap the link below to view and download your certificate:
> {{3}}

*(Note: Ensure you submit the Zulu translations for each of these templates as well, using the exact same variable structure.)*

---

## 8. Troubleshooting

- **Drivers cannot access Moodle:** Check that `MOODLE_TOKEN` is correct and the `bd_api_user` has the `enrol_manual_enrol_users` capability.
- **Progress is not updating in BD:** Check the Moodle webhook logs. If webhooks are failing, ensure the cron polling job is running.
- **WhatsApp messages are not sending:** Verify the Meta Graph API credentials in `.env.local` and ensure the message templates are approved in the Meta Business Suite.
