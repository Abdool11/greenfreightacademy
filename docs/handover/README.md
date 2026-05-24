# TAG Ecosystem — Developer Handover Package

Welcome to the TAG Ecosystem Developer Handover Package. This directory contains everything you need to deploy, configure, and test the Transport Action Group (TAG), Green Freight Academy (GFA), and BetterDriver (BD) platforms.

## Reading Order & File Index

Please read and execute these documents in the exact order listed below. Do not skip steps.

### Phase 1: Understanding the Ecosystem
*   **`00-INTRODUCTION-AND-EXECUTIVE-SUMMARY.md`**: Start here. Project vision, your role, and expectations.
*   **`01-ECOSYSTEM-OVERVIEW.md`**: Complete feature inventory across all three platforms.
*   **`01b-INTEGRATION-DEPENDENCY-MAP.md`**: Visual and written dependency map showing what depends on what.
*   **`12-ONGOING-COLLABORATION-AND-ROLE-SEPARATION.md`**: Critical reading. Defines what Manus builds vs what Asif configures, the Moodle Contract Zone protection framework, the complete mock data inventory, and the workflow for all future features.

### Phase 2: Deployment & Configuration
*   **`02-DEPLOYMENT-SEQUENCE.md`**: The exact step-by-step sequence for deploying the platforms, with strict "do not proceed until verified" gates.
*   **`03-CONFIGURATION-REFERENCE.md`**: All configuration requirements - Supabase, Moodle, WhatsApp, DNS, cron.
*   **`04-KNOWN-FAILURE-MODES.md`**: Top failure scenarios with diagnosis and fix instructions.
*   **`04b-ENV-VAR-REFERENCE.md`**: Master environment variable reference for all three platforms.
*   **`15-VERCEL-ENV-IMPORT.md`**: Vercel-formatted env import files for quick setup.
*   **`10-NGINX-CONFIG.conf`**: Pre-written nginx config for all three domains (if self-hosting).

### Phase 3: External Integrations
*   **`09-MOODLE-SETUP.md`**: Moodle integration setup guide.
*   **`17-MOODLE-PLUGIN-CONFIG.md`**: Exact Moodle Outgoing Webhooks plugin configuration values.
*   **`16-WHATSAPP-TEMPLATE-SPEC.md`**: Exact WhatsApp template names, parameters, and body text in EN and ZU.

### Phase 4: Database & Verification
*   **`07-SEED-SCRIPTS.sql`**: SQL seed scripts to create first admin users for all three platforms.
*   **`08-ENV-VALIDATOR.js`**: Node.js script to validate all env vars are set before app starts.
*   **`08b-SUPABASE-VERIFICATION.sql`**: Queries to verify the database is correctly set up.

### Phase 5: Testing & Training
*   **`05-END-TO-END-TESTING.md`**: Comprehensive end-to-end testing checklist.
*   **`11-POSTMAN-COLLECTION.json`**: Pre-built API test collection covering all endpoints.
*   **`06-ADMIN-TRAINING-GUIDE.md`**: Step-by-step admin workflows for GFA, BD, and TAG admins.

## Important Note

The platforms are deeply interconnected. Attempting to test a feature before its underlying dependencies are configured will result in errors that appear to be code bugs but are actually sequencing failures. Follow the `02-DEPLOYMENT-SEQUENCE.md` strictly.

The `12-ONGOING-COLLABORATION-AND-ROLE-SEPARATION.md` document is essential reading before any live data wiring begins. It contains the complete inventory of mock data pages that need to be connected to live Supabase and Moodle data.
