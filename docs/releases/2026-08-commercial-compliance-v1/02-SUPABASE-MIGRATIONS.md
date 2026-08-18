# 02 — Supabase Migrations

**SQL Editor:** https://supabase.com/dashboard/project/khzctzixeghppwwnzsdq/sql/new

## Safety first

Run migrations in the shared TAG Supabase project only after the preview branch has compiled successfully. The supplied migrations are written for repeatable deployment; nevertheless, copy the execution result into the release PR or `RELEASE-STATUS.md` before continuing.

> Production database changes are additive. Do not delete tables, columns, certificates, reports, payment records or client data during this release.

## GFA migration sequence

Run these files in the SQL Editor in this exact order. Copy the complete contents of **one file at a time**, press **Run**, and confirm success before moving down the table.

| Order | Migration file | Purpose | Required before |
|---:|---|---|---|
| 1 | `supabase/migrations/20260816_r1_billing_quotes.sql` | Billing profile and quote snapshot structure | Quote-flow tests |
| 2 | `supabase/migrations/20260817_r2_eft_reconciliation.sql` | EFT proof, state and reconciliation audit structure | EFT tests |
| 3 | `supabase/migrations/20260818_r3_discount_governance.sql` | Discount requests and authority records | Discount tests |
| 4 | `supabase/migrations/20260819_r6_learning_events.sql` | Learning-event records and enrolment event metadata | R6 test event |
| 5 | `supabase/migrations/20260821_r7a_compliance_reporting.sql` | RTMS profile, competency review, evidence report and quote lifecycle structure | R7 dashboard, report and lifecycle tests |

## Fresh / new environment shortcut

For a new, empty GFA environment only, the repository also contains:

```text
ALL_MIGRATIONS_RUN_ONCE.sql
```

This is a combined convenience script. For the shared live environment, prefer the individual files above so the SQL Editor output shows exactly where a problem would occur.

## BetterDriver migrations required for the shared release train

Run these in the **same shared Supabase project** before validating their respective BetterDriver workflows.

| Order | Migration file | Purpose |
|---:|---|---|
| 1 | `betterdriver/supabase/migrations/20260820_rbd2_driver_reaccess.sql` | Secure driver re-access audit table |
| 2 | `betterdriver/supabase/migrations/20260822_rbd4_push_notifications.sql` | Driver push-subscription and delivery-audit tables |

## If a migration reports an error

1. Stop. Do not run later migrations or toggle any release flag.
2. Save the exact SQL Editor error text in the release PR.
3. Check whether the error identifies an object that already exists. If it does, inspect the schema rather than deleting anything.
4. Use a corrective, additive migration only after review. Never edit or silently re-run a production migration with destructive SQL.
5. Mark the affected release-status item **Not started** until the correction has been tested in preview.
