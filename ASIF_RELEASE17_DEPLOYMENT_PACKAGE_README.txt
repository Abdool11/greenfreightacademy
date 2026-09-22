GFA RELEASE 17 INTEGRATED DEPLOYMENT PACKAGE
===============================================

Repository
----------
https://github.com/Abdool11/greenfreightacademy

Published branch and deployment commit
--------------------------------------
Branch: feature/gfa-release2-qa-remediation
Before deployment, resolve and record the exact published branch head:
  git fetch origin --prune
  git rev-parse origin/feature/gfa-release2-qa-remediation
Compare base: main at 0bf959f4a92f659e7e8e2ae517bffe98486e45e5
Pull request: https://github.com/Abdool11/greenfreightacademy/pull/new/feature/gfa-release2-qa-remediation

Status
------
The code is published to GitHub. It has not been deployed to Preview or production by this package. Do not describe automatic certificate issue, the R299 launch catalogue, or the cohort remediation as live until the required Preview acceptance record exists and the controlled production release is approved.

Scope
-----
1. Includes the GFA-only automatic official Professional Truck Driver Certificate issue release from feature/gfa-auto-certification (original head 0bcc1c5).
2. Adds Release 17 QA remediation: EFT-first R299 once-off PTDP launch catalogue, duplicate-safe spreadsheet import, clearer dashboard spacing, finance-gated cohort activation and duplicate invitation protection.
3. Keeps GFA reporting, evidence and future CPD/driver-briefing capabilities. Future programmes remain stored but are unavailable for new public/client sales at launch.
4. Does not change BetterDriver or SafeFreight.

Required migrations
-------------------
For an existing environment already at Releases 1–15, apply in this order:
  1. supabase/migrations/20260916_r16_auto_certificate_issue.sql
  2. supabase/migrations/20260920_r17_release2_qa_remediation.sql

Do not run ALL_MIGRATIONS_RUN_ONCE.sql against an existing database. It is for a new or deliberately rebuilt non-production database only. Take a restricted operational snapshot of the courses configuration before Release 17 because it deliberately changes course visibility/activity for launch.

Runtime configuration
---------------------
Release 17 introduces no new production runtime secret. It relies on the existing certificate keys and feature flag for Release 16:
  - BD_CERTIFICATE_EVENT_PUBLIC_KEY_PEM
  - GFA_CERTIFICATE_RESPONSE_PRIVATE_KEY_PEM
  - GFA_CERTIFICATE_HANDOFF_SECRET
  - GFA_CERTIFICATE_AUDIT_SECRET
  - NEXT_PUBLIC_SITE_URL
  - ENABLE_GFA_CERTIFICATE_CONTRACT_V2

Set NEXT_PUBLIC_SITE_URL to the actual Preview origin in Preview. Enable ENABLE_GFA_CERTIFICATE_CONTRACT_V2 only after the Release 16 migration, existing approved key configuration and signed synthetic fixtures are present. Use Preview only for initial enablement.

The GFA_TEST_* values documented in .env.local.example are test-runner inputs only. They must be synthetic Preview values. Do not add production users, customers, payments, certificate numbers, JWTs or secrets to them.

Validation already completed locally
------------------------------------
- npm run type-check: passed.
- npm run build: passed.
- Local production server public checks: HTTP 200 for /programmes.
- tests/playwright/15-release2-launch-catalogue.spec.ts: 2 public checks passed; 2 authenticated checks skipped because no Preview-only client credentials were supplied.
- tests/playwright/10-certificate-contract-v2.spec.ts: direct legacy-route retirement check passed; 6 contract checks skipped because the required Preview certificate keys, flag and signed synthetic fixtures were intentionally not supplied locally.

Required Preview acceptance before production
---------------------------------------------
1. Build this exact branch at b5fc734 in a non-production Preview.
2. Apply Release 16 and Release 17 in the stated order.
3. Confirm exactly one recognised PTDP course is active/visible/available at R299 once-off and all other courses are hidden/unavailable for new sales.
4. With a synthetic company, verify quote → EFT submission → finance confirmation → training deployment. Confirm a duplicate import row is skipped and a repeated cohort activation does not create another invitation or outbound message.
5. Configure synthetic BetterDriver-signed certificate evidence, run the Version 2 contract suite, and prove qualifying completion creates one canonical certificate number, private PDF and active exact-number registry entry. Prove a replay does not allocate a second number; invalid evidence fails; each fresh BetterDriver handoff supports a new certificate view/download while one code cannot be replayed.
6. Save sanitized Preview evidence. Only then seek the named GFA product, operations and privacy go/no-go decision for production.

BetterDriver boundary
---------------------
This package changes GFA only. BetterDriver must wait for the successful GFA Preview certificate evidence. Its separate branch may then request a fresh, signed GFA handoff for each authenticated View Certificate or Download Certificate action. BetterDriver must not store GFA PDFs, permanent document URLs, certificate numbers, raw GFA identities or GFA credentials.

Rollback
--------
- Disable ENABLE_GFA_CERTIFICATE_CONTRACT_V2 to stop Version 2 automatic issuance behaviour if a certificate-specific rollback is required.
- Revert the application pull request for code rollback. Do not delete certificates, documents, audit records, payments, invitations or courses.
- Release 17 schema changes are additive. Its catalogue data change is intentional; restore any previous course visibility only from the restricted pre-migration snapshot and only with product-owner approval.
