# GFA Commercial & Compliance V1 — Release Summary

**Release branch:** `release/gfa-commercial-compliance-v1`  
**Target:** `main` after preview acceptance  
**Primary deployment owner:** Asif  
**Production site:** https://www.greenfreightacademy.co.za  
**Supabase project:** `khzctzixeghppwwnzsdq`

## What this release delivers

This is a cumulative, integration-ready release that combines the commercial, finance, client workflow and compliance-reporting improvements already reviewed in isolated feature branches. It does **not** change existing certificate policy: certificates do not receive expiry dates by default. RTMS annual review is a client reminder for suitable CPD or refresher action, not a certificate-expiry mechanism.

| Release area | Outcome for users and operations |
|---|---|
| R1 — Billing and quotes | Client billing details and accountant-ready formal quotations with a 14-day default validity period. |
| R2 — EFT reconciliation | Proof upload, payment queue, approval/clarification/rejection controls and audit events. |
| R3 — Discount governance | Admin approval up to 20%, super-admin authority for larger discounts, and self-approval prevention. |
| R4 — Client workflow | Clearer enrolment flow and working forward, back and exit controls in the demo tour. |
| R5 — Financial operations | Daily operational cashbook and management reporting views. |
| R6 — Learning events | Signed, idempotent BetterDriver/Moodle learning-event receiver. |
| R7A–R7D — Compliance reporting | RTMS client profile, cohort safety dashboard, controlled evidence snapshots/PDFs, validation metadata, lifecycle reminders and client configuration. |
| Driver onboarding | Revised WhatsApp welcome wording for drivers. |

## Release safety model

The release is safe to merge into a **preview deployment** before sensitive functionality is activated. The following capabilities are deployed disabled and must remain disabled until their individual test gate has passed.

| Capability | Environment flag | Default | Activation gate |
|---|---|---:|---|
| Signed learning-event ingestion | `ENABLE_R6_EVENT_INGEST` | `false` | A test event has a valid HMAC signature and updates only the intended enrolment. |
| Lifecycle reminders and stale-quote archive | `ENABLE_R7_LIFECYCLE_CRON` | `false` | `CRON_SECRET` is configured and a test request produces no unintended reminder/archive action. |
| Controlled evidence-report creation | `ENABLE_EVIDENCE_REPORTS` | `false` | A test-client snapshot, PDF and validation lookup succeed. |
| Enhanced EFT reconciliation | `ENABLE_EFT_RECONCILIATION_V2` | `false` | Finance verifies a test proof can be confirmed, queried and rejected safely. |

## Release rules

> Do not activate a feature flag simply because the code is live. Enable each flag only after the matching preview checklist is complete and recorded in `RELEASE-STATUS.md`.

The exact merge sequence is in [01-MERGE-ORDER.md](01-MERGE-ORDER.md). Migration, configuration, test, cutover and rollback instructions are intentionally separated into the numbered files in this folder so that deployment can be paused and resumed without guesswork.

## Quick start for Asif

1. Open [RELEASE-STATUS.md](RELEASE-STATUS.md) and mark the start time.
2. Follow [01-MERGE-ORDER.md](01-MERGE-ORDER.md) to confirm the release branch and open its preview deployment.
3. Follow [02-SUPABASE-MIGRATIONS.md](02-SUPABASE-MIGRATIONS.md) before testing any new data-dependent journey.
4. Complete [03-ENVIRONMENT-AND-EXTERNAL-CONFIG.md](03-ENVIRONMENT-AND-EXTERNAL-CONFIG.md), leaving all flags `false` initially.
5. Run [04-PREVIEW-TEST-CHECKLIST.md](04-PREVIEW-TEST-CHECKLIST.md).
6. Only after all required preview gates pass, use [05-PRODUCTION-CUTOVER.md](05-PRODUCTION-CUTOVER.md).
7. If anything is unexpected, stop and use [06-ROLLBACK.md](06-ROLLBACK.md).
