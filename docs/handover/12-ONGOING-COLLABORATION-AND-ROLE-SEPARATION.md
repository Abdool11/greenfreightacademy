# TAG Ecosystem — Ongoing Collaboration and Role Separation

This document defines the working relationship between Manus (the AI developer) and Asif (the human systems integrator and deployer). It outlines the strict separation of roles, the "Contract Zone" protection framework, the inventory of mock data that requires live wiring, and the workflow for future feature development.

## 1. The Division of Responsibility

To ensure stability and prevent deployment bottlenecks, we have established a strict division of labor.

### What Manus Builds (The Frontend & Database)
Manus is responsible for the codebase and the database schema. This includes:
*   Writing all Next.js React components, layouts, and UI logic.
*   Writing all Supabase SQL migrations, including Row-Level Security (RLS) policies.
*   Writing the API routes that interact with the database.
*   Writing the "Contract Zone" bridge files that format payloads for external services.
*   Ensuring the codebase passes the automated pre-handover audit (`tag-ecosystem-audit.py`).

### What Asif Configures (The Integrations & Deployment)
Asif is responsible for the live environment and external service configuration. This includes:
*   Provisioning the Ubuntu servers, Nginx, and SSL certificates.
*   Running the SQL migrations in the live Supabase project.
*   Configuring the Moodle LMS (creating the API user, assigning roles, generating tokens, and setting up the Outgoing Webhooks plugin).
*   Configuring the Meta WhatsApp Business account (submitting templates for approval and generating system tokens).
*   Populating the `.env.local` files with live production secrets.
*   Wiring the live data endpoints to replace the mock data placeholders (detailed below).

## 2. The Moodle "Contract Zone" Protection Framework

The Moodle integration is the most fragile part of the ecosystem. To prevent future UI updates from breaking the live integration, we have isolated the Moodle logic into a "Contract Zone."

### The Safe Zone
All UI components, layouts, and standard Supabase database reads are in the Safe Zone. Manus can modify these freely without risking the Moodle integration.

### The Contract Zone
The following files form the bridge between BetterDriver and Moodle. **They must not be modified without a High-Risk Feature Specification Document (FSD):**
1.  `lib/moodle.ts`: The core engine containing the API calls to Moodle's web services.
2.  `app/api/moodle/webhook/route.ts`: The endpoint that receives progress updates from Moodle.
3.  `app/api/moodle/poll/route.ts`: The cron job that actively polls Moodle for progress.
4.  `app/api/join/[token]/route.ts`: The magic link resolution route that triggers Moodle user creation.

If Manus modifies any of these files, the pre-handover audit script will flag a warning, and Asif must be notified to update the corresponding Moodle configuration.

## 3. Mock Data Inventory and Live Wiring Tasks

During the initial build phase, Manus utilized mock data to build the UI before the live Moodle and Supabase data structures were finalized. Asif is responsible for replacing these mock data blocks with live API fetches.

### BetterDriver (BD) Mock Data Pages
The following pages in the BD portal currently display mock data and contain `TODO: Asif` markers:
*   `app/portal/tasks/page.tsx`: Replace `MOCK_TASKS` with a live Supabase query.
*   `app/portal/course/page.tsx`: Replace `MOCK_ENROLMENT` and `MOCK_MODULES` with live Supabase and Moodle data.
*   `app/portal/progress/page.tsx`: Replace mock data with a fetch to `/api/portal/progress`.
*   `app/portal/certificate/page.tsx`: Replace mock data with a fetch to `/api/portal/certificate`.
*   `app/portal/cpd/page.tsx`: Replace mock data with a fetch to `/api/portal/cpd`.
*   `app/portal/profile/page-client.tsx`: Replace mock data with a live Supabase driver profile query and Server Action for updates.

*Note: Manus has provided a complete Feature Specification Document (`FSD-BD-Live-Data-Wiring.md`) in the BD repository detailing exactly how to wire these pages to the database.*

### Green Freight Academy (GFA) Incomplete Pages
The following pages in GFA contain `TODO: Asif` markers for external integrations:
*   `app/contact/ContactPageClient.tsx`: Replace the stub with a Server Action or fetch to `/api/submit-enquiry`.
*   `app/dashboard/cpd-submission/page.tsx`: Implement the Paystack payment flow and edge function trigger.
*   `app/dashboard/reports/page.tsx`: Implement data fetching for the reports dashboard.
*   `app/registry/RegistryPageClient.tsx`: Replace `MOCK_RESULT` with a live call to the Moodle REST API (detailed instructions are provided in the file comments).

## 4. The Workflow for Future Features

To maintain stability, all future development must follow this strict workflow:

1.  **Write the FSD:** Before writing any code, Manus must write a Feature Specification Document (FSD) using the provided template (`TAG-FSD-TEMPLATE.md`). This document must detail all database changes, API routes, and environment variables.
2.  **Develop on a Feature Branch:** Manus will write the code on a dedicated feature branch in GitHub.
3.  **Run the Pre-Handover Audit:** Manus must run `tag-ecosystem-audit.py` and ensure zero missing tables, columns, or environment variables.
4.  **Generate the Run-Once SQL:** If database changes are required, Manus will generate an idempotent `ALL_MIGRATIONS_RUN_ONCE.sql` file.
5.  **Handover to Asif:** Manus will push the branch to GitHub and provide Asif with a summary table detailing the required SQL migrations and new environment variables.
6.  **Deploy and Verify:** Asif will pull the branch, run the SQL migration, update the `.env.local` file, and deploy the changes.
