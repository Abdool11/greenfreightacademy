# TAG Ecosystem — Deployment Sequence & Gates

This document outlines the exact sequence Asif must follow to deploy the TAG ecosystem from zero to live. 

**CRITICAL:** The three platforms share a database and depend on each other. Deploying in the wrong order will produce confusing errors that look like code bugs but are actually sequencing problems. Do not proceed past a "GATE" until all checks pass.

---

## Phase 1: Infrastructure & Database

### 1. Supabase Setup
1. Create a single Supabase project.
2. Obtain the `URL`, `anon key`, and `service_role key`.
3. Run the base schema migration (`supabase-setup.sql` or `ALL_MIGRATIONS_RUN_ONCE.sql`).
4. Run the RLS fix migration (`20260506_enable_rls_all_tables.sql`).

### 2. Seed Admin Users
Run the provided seed SQL scripts (see `07-EXECUTABLES`) to create the first admin user for each platform. Without this, you cannot log into any admin panel.

### 3. Server Preparation
1. Provision an Ubuntu 22.04 server.
2. Install Node.js 22, PM2, Nginx, and Certbot.
3. Configure DNS A records for all three domains pointing to the server IP.

---
**GATE 1: INFRASTRUCTURE CHECK**
- [ ] Supabase project is live.
- [ ] All 31 tables exist in the `public` schema.
- [ ] RLS is enabled on all tables (verify with provided SQL query).
- [ ] Admin users exist in `tag_admins`, `gfa_admins`, and `bd_admins`.
- [ ] DNS resolves correctly for all three domains.
---

## Phase 2: External Integrations Configuration

### 1. Moodle LMS
1. Deploy Moodle on a subdomain (e.g., `moodle.betterdriver.co.za`).
2. Enable Web Services and REST protocol.
3. Create a service token for BD.
4. Install and configure the Outgoing Webhooks plugin (use provided config export).
5. Create the two required courses and note their IDs.

### 2. Meta WhatsApp API
1. Set up a Meta Business App.
2. Add WhatsApp product and configure a phone number.
3. Generate a permanent System User access token.
4. Submit all required message templates (see `03-CONFIGURATION-REFERENCE.md`) and wait for approval.

### 3. Brevo (Email)
1. Create a Brevo account.
2. Verify the sending domains.
3. Generate API keys.

---
**GATE 2: INTEGRATION CHECK**
- [ ] Moodle token generated and tested via Postman.
- [ ] Moodle webhook endpoint configured.
- [ ] WhatsApp templates approved in Meta Business Manager.
- [ ] Brevo domains verified.
---

## Phase 3: Application Deployment

### 1. Environment Variables
1. Extract the deployment packages for TAG, GFA, and BD into `/home/ubuntu/sites/`.
2. Copy `.env.local.example` to `.env.local` in each directory.
3. Fill in all values using the Master Env Var Reference.
4. Run the Env Var Validator script (see `07-EXECUTABLES`) in each directory.

### 2. Start Applications
1. Start TAG: `pm2 start pm2.config.js` in the TAG directory.
2. Start GFA: `pm2 start pm2.config.js` in the GFA directory.
3. Start BD: `pm2 start pm2.config.js` in the BD directory.
4. Save PM2 state: `pm2 save` and `pm2 startup`.

### 3. Nginx & SSL
1. Copy the provided Nginx configuration (see `07-EXECUTABLES`) to `/etc/nginx/sites-available/`.
2. Enable the sites and restart Nginx.
3. Run Certbot to provision SSL certificates for all domains.

---
**GATE 3: APPLICATION CHECK**
- [ ] Env Var Validator script passes with zero missing variables on all three platforms.
- [ ] PM2 shows all three applications online without restarting.
- [ ] All three domains load over HTTPS in a browser.
- [ ] Admin login works on all three platforms using the seeded credentials.
---

## Phase 4: Cron Jobs & Background Tasks

### 1. Configure Vercel Cron (or Server Crontab)
If hosting on Vercel, the `vercel.json` files are already configured. If hosting on a standard Linux server, add the following to the crontab:

```bash
# BD: Poll Moodle for progress every 30 minutes
*/30 * * * * curl -X POST https://betterdriver.co.za/api/moodle/poll -H "Authorization: Bearer YOUR_CRON_SECRET"

# BD: Inactivity check daily at 09:00 SAST
0 7 * * * curl -X POST https://betterdriver.co.za/api/moodle/inactivity-check -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---
**GATE 4: FINAL DEPLOYMENT CHECK**
- [ ] Cron jobs are scheduled and executing without errors.
- [ ] Proceed to End-to-End Testing (Document 05).
---
