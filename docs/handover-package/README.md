# TAG Ecosystem — Developer Handover Package

Welcome to the TAG Ecosystem Developer Handover Package. This directory contains everything required to deploy, configure, test, and maintain the Transport Action Group (TAG), Green Freight Academy (GFA), and BetterDriver (BD) platforms.

## Documentation

1. **[01-ECOSYSTEM-OVERVIEW.md](01-ECOSYSTEM-OVERVIEW.md)**: A complete map of the ecosystem, defining what each platform does, how they connect, and listing every feature, page, and API route.
2. **[02-DEPLOYMENT-SEQUENCE.md](02-DEPLOYMENT-SEQUENCE.md)**: The exact sequence to follow to deploy the ecosystem from zero to live, including critical gates.
3. **[03-CONFIGURATION-REFERENCE.md](03-CONFIGURATION-REFERENCE.md)**: Definitive configuration details for all external integrations (Moodle, WhatsApp, Supabase).
4. **[04-KNOWN-FAILURE-MODES.md](04-KNOWN-FAILURE-MODES.md)**: A guide to the most common predictable issues during deployment and integration, with diagnosis and fixes.
5. **[05-END-TO-END-TESTING.md](05-END-TO-END-TESTING.md)**: A structured testing plan to verify the entire ecosystem is functioning correctly after deployment.
6. **[06-ADMIN-TRAINING-GUIDE.md](06-ADMIN-TRAINING-GUIDE.md)**: Step-by-step instructions for the most common administrative tasks across the three platforms.

## Executables & Scripts

7. **[07-SEED-SCRIPTS.sql](07-SEED-SCRIPTS.sql)**: SQL scripts to seed the initial admin users and default configuration in Supabase.
8. **[08-ENV-VALIDATOR.js](08-ENV-VALIDATOR.js)**: A Node.js script to validate that all required environment variables are present before starting the applications.
9. **[09-SUPABASE-VERIFICATION.sql](09-SUPABASE-VERIFICATION.sql)**: SQL queries to verify the Supabase schema, RLS, and seeded data.
10. **[10-NGINX-CONFIG.conf](10-NGINX-CONFIG.conf)**: Nginx reverse proxy configuration for all three platforms.
11. **[11-POSTMAN-COLLECTION.json](11-POSTMAN-COLLECTION.json)**: Pre-built API tests for all three platforms.

Please follow the **02-DEPLOYMENT-SEQUENCE.md** strictly to ensure a smooth deployment.
