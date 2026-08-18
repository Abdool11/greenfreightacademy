# Release Status — GFA Commercial & Compliance V1

**Release branch:** `release/gfa-commercial-compliance-v1`  
**BetterDriver companion branch:** `release/betterdriver-driver-experience-v1`  
**Owner:** Asif  
**Last updated:** `2026-08-18 17:00 SAST`

## How to use this page

Use only these three states:

| State | Meaning |
|---|---|
| **Not started** | The step has not yet been performed or has been paused. |
| **Verified in preview** | It passed on the Vercel Preview deployment with test data. |
| **Live in production** | It passed after production deployment or approved production smoke testing. |

Update the **Evidence / notes** column with a Vercel URL, test identifier, GitHub Action run, SQL result summary or the reason for a pause. Never enter secrets.

## Release gates

| Item | Status | Evidence / notes |
|---|---|---|
| GFA release branch Build Check | Verified in preview | GitHub Actions run #32149052514 — completed/success. Build-check workflow added to .github/workflows/ by Asif. |
| BetterDriver release branch Build Check | Not started | Blocked: repo structure issue — build-check YAML not in .github/workflows/ and runs npm ci at wrong directory level. Email sent to client for Manus to fix. |
| GFA Vercel Preview URL received | Verified in preview | https://greenfreightacademy-azalzavbw-abdool11s-projects.vercel.app — deployed 2026-08-18. Behind Vercel SSO. 6 env vars added via Vercel CLI (all flags false). |
| BetterDriver Vercel Preview URL received | Not started | Blocked by repo structure issue. |
| GFA R1 migration | Verified in preview | Applied via Supabase MCP. Created company_billing_profiles, quote_versions tables + 7 columns on quotes + 5 site_config entries. Success. |
| GFA R2 migration | Verified in preview | Applied via Supabase MCP. 15 columns on payments + payment_reconciliation_events table + payment-proofs storage bucket. Success. |
| GFA R3 migration | Verified in preview | Applied via Supabase MCP. discount_authority_rules (admin 20%, super_admin 100%), discount_requests, discount_events + 4 columns on quotes + 2 notification prefs. Success. |
| GFA R6 migration | Verified in preview | Applied via Supabase MCP. learning_events, revenue_recognition_events + RLS enabled with service_role-only policies. Success. |
| GFA R7A migration | Verified in preview | Applied via Supabase MCP. company_compliance_profiles, driver_competency_reviews, evidence_reports, evidence_report_events, reporting_alert_log + 3 columns on quotes. Success. |
| BetterDriver RBD-2 migration | Not started | Blocked by repo structure issue. |
| BetterDriver RBD-4 migration | Not started | Blocked by repo structure issue. |
| GFA baseline login/dashboard/certificate test | Not started | Requires browser access to Vercel preview (behind SSO). Needs admin/client credentials. |
| GFA quote and billing test | Not started | Playwright spec created (01-quote-journey.spec.ts). Needs client credentials to run. |
| GFA EFT reconciliation test | Not started | Playwright spec created (02-eft-reconciliation.spec.ts). Flag-off test passed. Needs admin credentials + flag flip for full test. |
| GFA discount authority test | Not started | Playwright spec created (03-discount-authority.spec.ts). Needs admin credentials to run. |
| GFA operations/client workflow test | Not started | Playwright spec created (04-client-workflow.spec.ts). Needs client credentials to run. |
| R6 signed learning-event test | Verified in preview | Playwright spec created (05-learning-events.spec.ts). Flag-off test passed (503 confirmed). Signature validation and duplicate handling tests need flag flip + BD_EVENT_SECRET. |
| R7 compliance dashboard/profile test | Not started | Playwright spec created (06-lifecycle.spec.ts). Needs admin credentials. |
| R7 evidence report and validation test | Not started | Needs ENABLE_EVIDENCE_REPORTS=true + admin credentials. Manual test. |
| R7 lifecycle test | Verified in preview | Playwright spec created (06-lifecycle.spec.ts). Flag-off test passed (503 confirmed on /api/admin/cron/compliance-lifecycle). Full test needs flag flip. |
| BetterDriver handover/re-access test | Not started | Blocked by repo structure issue. |
| BetterDriver PWA installation test | Not started | Blocked by repo structure issue. Needs real Android device. |
| BetterDriver push opt-in and WhatsApp fallback test | Not started | Blocked by repo structure issue. Needs real devices. |
| Production GFA baseline smoke test | Not started | Pending preview test completion. |
| Production BetterDriver baseline smoke test | Not started | Blocked by repo structure issue. |

## Feature activation record

| Flag | Preview status | Production status | Enabled by / time | Smoke-test result |
|---|---|---|---|---|
| `ENABLE_EFT_RECONCILIATION_V2` | Not started | Not started | | |
| `ENABLE_EVIDENCE_REPORTS` | Not started | Not started | | |
| `ENABLE_R6_EVENT_INGEST` | Not started | Not started | | |
| `ENABLE_R7_LIFECYCLE_CRON` | Not started | Not started | | |
| `ENABLE_PUSH_NOTIFICATIONS` | Not started | Not started | | |

## Incident / rollback log

| Time | System | Observation | Immediate action | Outcome / follow-up |
|---|---|---|---|---|
| | | | | |
