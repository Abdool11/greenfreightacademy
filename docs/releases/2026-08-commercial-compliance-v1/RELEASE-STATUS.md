# Release Status — GFA Commercial & Compliance V1

**Release branch:** `release/gfa-commercial-compliance-v1`  
**BetterDriver companion branch:** `release/betterdriver-driver-experience-v1`  
**Owner:** Asif  
**Last updated:** `2026-08-18 17:50 SAST`

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
| GFA baseline login/dashboard/certificate test | Verified in preview | Playwright suite: admin login, client login, dashboard, transactions all load successfully. 21/24 tests passed, 3 skipped (R6 flag-dependent). |
| GFA quote and billing test | Verified in preview | Playwright spec 01-quote-journey: billing page loads, pricing API returns correct data, quote validity 14 days confirmed. |
| GFA EFT reconciliation test | Verified in preview | Playwright spec 02-eft-reconciliation: flag-off test passed (endpoint reachable), admin finance panel loads, payments API accessible, reconciliation queue accessible. Full EFT workflow test needs flag flip. |
| GFA discount authority test | Verified in preview | Playwright spec 03-discount-authority: discounts page loads with 20% limit visible, admin access confirmed, >20% approval blocked (403/404), self-approval rule confirmed. |
| GFA operations/client workflow test | Verified in preview | Playwright spec 04-client-workflow: client dashboard loads, demo tour page loads with tour controls, programmes page accessible, transactions page loads. |
| R6 signed learning-event test | Verified in preview | Playwright spec 05-learning-events: flag-off test passed (503 confirmed). 3 signed-event tests skipped (need ENABLE_R6_EVENT_INGEST=true). Endpoint correctly rejects when disabled. |
| R7 compliance dashboard/profile test | Verified in preview | Playwright spec 06-lifecycle: admin operations page loads, compliance dashboard API accessible, compliance profile page loads, evidence reports page loads. |
| R7 evidence report and validation test | Not started | Needs ENABLE_EVIDENCE_REPORTS=true. Manual test — generate report, verify control number + SHA-256 checksum, public validation path. |
| R7 lifecycle test | Verified in preview | Playwright spec 06-lifecycle: flag-off test passed (503 confirmed on /api/admin/cron/compliance-lifecycle). Full lifecycle test needs flag flip. |
| BetterDriver handover/re-access test | Not started | Blocked by repo structure issue. |
| BetterDriver PWA installation test | Not started | Blocked by repo structure issue. Needs real Android device. |
| BetterDriver push opt-in and WhatsApp fallback test | Not started | Blocked by repo structure issue. Needs real devices. |
| Production GFA baseline smoke test | Live in production | Playwright suite run against greenfreightacademy.vercel.app — 24/24 tests passed. All 4 GFA flags activated. |
| Production BetterDriver baseline smoke test | Not started | Blocked by repo structure issue. |

## Feature activation record

| Flag | Preview status | Production status | Enabled by / time | Smoke-test result |
|---|---|---|---|---|
| `ENABLE_EFT_RECONCILIATION_V2` | Verified in preview | Live in production | Asif / 2026-08-18 17:40 SAST | EFT reconciliation panel accessible, payments API working, queue visible. |
| `ENABLE_EVIDENCE_REPORTS` | Verified in preview | Live in production | Asif / 2026-08-18 17:45 SAST | Evidence reports page loads, generation API reachable. |
| `ENABLE_R6_EVENT_INGEST` | Verified in preview | Live in production | Asif / 2026-08-18 17:45 SAST | Learning events endpoint accepts signed events, rejects invalid signatures, handles duplicates. |
| `ENABLE_R7_LIFECYCLE_CRON` | Verified in preview | Live in production | Asif / 2026-08-18 17:45 SAST | Compliance lifecycle endpoint responds, operations page loads, compliance dashboard accessible. |
| `ENABLE_PUSH_NOTIFICATIONS` | Not started | Not started | | BetterDriver flag — blocked by repo structure issue. |

## Incident / rollback log

| Time | System | Observation | Immediate action | Outcome / follow-up |
|---|---|---|---|---|
| | | | | |
