# Asif’s Deployment & Testing Guide

## GFA Commercial & Compliance V1 + BetterDriver Driver Experience V1

**Prepared for:** Asif  
**Release date:** August 2026  
**GFA branch:** `release/gfa-commercial-compliance-v1`  
**BetterDriver branch:** `release/betterdriver-driver-experience-v1`  
**Time zone for the release record:** SAST (UTC+2)

## Start here

This guide turns a large set of application improvements into a small number of safe, ordered decisions. You do **not** need to merge each feature branch. You will review one integration branch for GFA and one for BetterDriver, test them in preview, then merge them to production through normal GitHub pull requests.

> **The most important rule:** merge the code first with sensitive capabilities disabled. Enable only one release flag at a time after its matching test passes.

If you are interrupted, return to `RELEASE-STATUS.md`. It is the single source of truth for what is not started, verified in preview, or live in production.

## What you are deploying

| Site | Release branch | Main outcome |
|---|---|---|
| Green Freight Academy | `release/gfa-commercial-compliance-v1` | Formal quotes, EFT controls, governed discounts, client workflow improvements, finance operations, learning-event support and RTMS/evidence reporting. |
| BetterDriver | `release/betterdriver-driver-experience-v1` | Reliable magic-link handover, driver re-access, PWA installation, push-notification foundation and revised WhatsApp onboarding. |

The release maintains these business rules:

| Rule | What to verify |
|---|---|
| Certificate policy | No GFA or BetterDriver certificate shows an expiry date by default. |
| RTMS workflow | Annual review is a reminder to the client for CPD/refresher action, **not** a certificate expiry. |
| Discount authority | Admin may approve up to 20%; super-admin is required above 20%; self-approval is blocked. |
| Driver communications | WhatsApp remains the fallback. Push is opt-in only. |
| Pricing | PTDP launch price is R499 per driver. Other programme default price is R999. |

---

# Part 1 — Before you touch production

## Step 1: Open the release PRs

Open or create these two pull requests:

| Order | Repository | Branch → target | Labels to apply |
|---:|---|---|---|
| 1 | [Green Freight Academy](https://github.com/Abdool11/greenfreightacademy) | `release/gfa-commercial-compliance-v1` → `main` | `release`, `deployment`, `migration`, `env-change`, `external-config`, `cron`, `feature-flag`, `rollback-ready` |
| 2 | [BetterDriver](https://github.com/Abdool11/betterdriver) | `release/betterdriver-driver-experience-v1` → `main` | `release`, `deployment`, `migration`, `env-change`, `external-config`, `feature-flag`, `rollback-ready` |

The pull-request template asks for every deployment decision in one place: the migration, environment variables, external configuration, preview link, tests and rollback. Paste the Vercel Preview URL into each PR once it appears.

## Step 2: Wait for the automatic checks

The **Build Check** must be green on both release branches. It uses Node 20 and runs the following sequence:

```text
npm ci
npm run type-check
npm run build
```

If a build check fails, stop. Do not merge and do not compensate by changing a production environment setting. Record the failure in the PR and correct it on the release branch.

## Step 3: Use preview first

Use Vercel Preview environments before production. Confirm the GFA and BetterDriver Preview URLs show HTTPS and open normally.

| Baseline check | Pass condition |
|---|---|
| GFA client login | Existing client can enter the dashboard. |
| GFA admin login | Existing admin can open the dashboard without data errors. |
| GFA certificate | Existing certificate can be opened/downloaded and has no expiry date. |
| BetterDriver driver link | A current driver can still enter the portal through the existing handover path. |
| BetterDriver existing session | A returning driver can continue the portal without being forced into a broken login loop. |

If the baseline is not correct, use [06-ROLLBACK.md](06-ROLLBACK.md). Do not proceed to a database migration or flag activation.

---

# Part 2 — Database migration: one file at a time

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/khzctzixeghppwwnzsdq/sql/new). Use the shared TAG project: `khzctzixeghppwwnzsdq`.

Copy, paste and run one file at a time. Wait for a successful result before the next file.

| Order | Repository and file | Why it is needed |
|---:|---|---|
| 1 | GFA `supabase/migrations/20260816_r1_billing_quotes.sql` | Client billing profile and formal quote data. |
| 2 | GFA `supabase/migrations/20260817_r2_eft_reconciliation.sql` | EFT proof and reconciliation audit. |
| 3 | GFA `supabase/migrations/20260818_r3_discount_governance.sql` | Discount request and authority records. |
| 4 | GFA `supabase/migrations/20260819_r6_learning_events.sql` | Learning-event and revenue-recognition records. |
| 5 | GFA `supabase/migrations/20260821_r7a_compliance_reporting.sql` | RTMS profile, competency review, evidence reports and quote lifecycle records. |
| 6 | BetterDriver `supabase/migrations/20260820_rbd2_driver_reaccess.sql` | Driver re-access audit records. |
| 7 | BetterDriver `supabase/migrations/20260822_rbd4_push_notifications.sql` | Push-subscription and delivery audit records. |

> **If SQL reports an error:** stop immediately, save the exact error in the PR, and do not run later files. Never delete a table or customer record to clear an error. The release migrations are additive, so the normal solution is a small reviewed corrective migration.

Mark each migration **Verified in preview** in `RELEASE-STATUS.md` when its SQL result is successful.

---

# Part 3 — Configuration: make the deployment safe first

## Step 4: Set environments with flags off

In each Vercel project, go to **Settings → Environment Variables**. Put secrets into Preview first. Use Production only after the Preview tests pass.

### GFA: new values

| Variable | What to enter | Initial setting |
|---|---|---|
| `BD_EVENT_SECRET` | A long random secret shared only with the trusted event sender. Generate with `openssl rand -hex 32`. | Set the secret; keep R6 flag off. |
| `CRON_SECRET` | A long random secret for the lifecycle endpoint. Generate with `openssl rand -hex 32`. | Set the secret; keep R7 lifecycle flag off. |
| `ENABLE_R6_EVENT_INGEST` | `false` | Keep off until a signed test event passes. |
| `ENABLE_R7_LIFECYCLE_CRON` | `false` | Keep off until lifecycle test passes. |
| `ENABLE_EVIDENCE_REPORTS` | `false` | Keep off until controlled evidence-pack test passes. |
| `ENABLE_EFT_RECONCILIATION_V2` | `false` | Keep off until finance signs off the test workflow. |

### BetterDriver: new values

| Variable | What to enter | Initial setting |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Generated VAPID public key. | Set only for the Preview push pilot. |
| `VAPID_PRIVATE_KEY` | Generated VAPID private key. Never expose it in browser code or GitHub. | Set only for the Preview push pilot. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | The same public VAPID key. | Set only for the Preview push pilot. |
| `ENABLE_PUSH_NOTIFICATIONS` | `false` | Keep off until real-device test succeeds. |

### One detail to obtain before final quote approval

The company settings already include Transport Action Group (Pty) Ltd, registration number `2021/807573/07`, and the Umhlanga address. Before using live formal quotes, complete the remaining supplier bank fields in GFA Admin → Formal Quote Settings:

| Still needed | Reason |
|---|---|
| Account holder name | Required on a formal quote/EFT instruction. |
| Account type | Required for the bank instruction. |
| Branch / branch code | Required for a complete finance instruction. |
| VAT number, if registered | Required for correct VAT presentation. |

---

# Part 4 — Preview test journeys

## Step 5: Client quote journey

Use a test client and create a test quote. Do not use a live payment.

1. Complete the client billing profile.
2. Add a programme and driver count.
3. Confirm the quote shows the correct client entity, quotation reference, line items, total and a 14-day validity.
4. Download the PDF/printable quotation.
5. Confirm PTDP is R499 per driver and other default programmes are R999 where pricing is applicable.

**Pass condition:** a client accountant can clearly tie the document to a client, company, programme, quantity, amount and payment instruction.

## Step 6: Finance journey — EFT and discounts

For this preview test only, change `ENABLE_EFT_RECONCILIATION_V2` to `true`, redeploy Preview, then use test data.

| Test | Expected result |
|---|---|
| Test EFT proof appears in queue | Finance sees client, quote reference, expected amount, submitted amount and proof. |
| Request clarification | Client sees the correct pending/clarification state and note. |
| Reject | Payment is not confirmed; the quote returns to payable state. |
| Confirm matching amount | Finance must enter a bank reference; one payment audit event and one credit allocation result. |
| Attempt mismatched amount | Confirmation is blocked. |
| Discount at 20% or less | Admin authority is allowed. |
| Discount above 20% | Admin authority is blocked; super-admin route is required. |
| Self-approval | Always blocked. |

When the journey passes, set the flag back to `false` unless finance gives explicit preview approval. Record the outcome in `RELEASE-STATUS.md`.

## Step 7: Client workflow, finance and reporting

- Confirm the demo tour has **Back**, **Next** and **Exit**.
- Confirm a client can identify the selected driver, select a programme and find the primary action without hunting through the screen.
- Open Daily Operations and confirm the test client data is visible only to the right administrative role.
- Confirm the client account/transaction history shows only that client’s records.

## Step 8: Learning event test (R6)

1. Leave `ENABLE_R6_EVENT_INGEST=false`. Send a correctly signed test event and confirm the endpoint says it is disabled.
2. Set `ENABLE_R6_EVENT_INGEST=true`, redeploy Preview.
3. Send one valid HMAC-signed event for a test enrolment.
4. Confirm only that enrolment changes.
5. Send the exact same event again.
6. Confirm it is recorded as a duplicate and does not change progress twice.
7. Send one invalid-signature event.
8. Confirm it is rejected.
9. Change the flag back to `false` after testing.

## Step 9: RTMS, evidence and lifecycle test (R7)

### RTMS profile and evidence pack

1. Configure a test client as RTMS-enabled and add the nominated safety manager and annual review preference.
2. Confirm the client compliance dashboard shows that company’s cohort only.
3. Set `ENABLE_EVIDENCE_REPORTS=true`, redeploy Preview.
4. Generate one test evidence report.
5. Confirm it has a control number and SHA-256 checksum.
6. Download the controlled PDF and check the contents match the test company only.
7. Use the public validation path to confirm the control number resolves.
8. Confirm no certificate expiry is introduced.
9. Set the flag back to `false` when done.

### Lifecycle automation

1. First make a protected call using `CRON_SECRET` while `ENABLE_R7_LIFECYCLE_CRON=false`; it should report disabled.
2. Create only test annual-review and stale-quote data.
3. Set `ENABLE_R7_LIFECYCLE_CRON=true`, redeploy Preview and call the endpoint once.
4. Confirm the test client receives the correct reminder wording: annual competency review, **not** certificate expiry.
5. Confirm only the test stale quote is archived.
6. Set the flag back to `false` unless the schedule has been approved.

## Step 10: BetterDriver driver journey

1. Send a BetterDriver test link through GFA and open `https://betterdriver.co.za/join/{token}`.
2. Confirm the driver reaches language/welcome/portal correctly.
3. Request re-access for a test driver and confirm the recovery screen does not expose whether another person is registered.
4. On Android Chrome, enter the portal first. Confirm the PWA install prompt appears only **after** portal entry.
5. Install BetterDriver and reopen it from the new home-screen icon.
6. Confirm revised WhatsApp onboarding uses the approved Meta Utility template `bd_driver_onboarding`.
7. Confirm re-access uses the approved `bd_reaccess_link` template.

## Step 11: Push-notification pilot

1. Keep `ENABLE_PUSH_NOTIFICATIONS=false`. The opt-in card must not appear and no notification permission prompt should occur.
2. Add the VAPID values in Preview, set the flag to `true`, and redeploy.
3. Test a conscious opt-in on Android and iPhone where the browser supports it.
4. Confirm the subscription is stored for the signed-in test driver only.
5. Decline browser permission and confirm the driver can still use training and receives WhatsApp fallback messages.
6. Set the flag back to `false` after testing unless a pilot release is explicitly approved.

---

# Part 5 — Production: controlled activation

## Step 12: Merge the release PRs

When every required Preview test is marked **Verified in preview**:

1. Merge the GFA release branch PR to `main`.
2. Wait for the Vercel production deployment.
3. Smoke-test existing GFA login, dashboard and certificate paths.
4. Merge the BetterDriver release branch PR to `main`.
5. Wait for the Vercel production deployment.
6. Smoke-test an existing driver portal session and the GFA handover link.

It is safe and expected for all new feature flags to remain `false` immediately after production merge.

## Step 13: Turn on one capability at a time

Use this order. Change a single Vercel flag, redeploy, do the listed smoke test, then write the result into `RELEASE-STATUS.md` before continuing.

| Order | Flag | Minimum production smoke test |
|---:|---|---|
| 1 | `ENABLE_EFT_RECONCILIATION_V2` | Finance checks one controlled pending payment without changing a real payment unexpectedly. |
| 2 | `ENABLE_EVIDENCE_REPORTS` | Designated admin creates one controlled internal/test-client report. |
| 3 | `ENABLE_R6_EVENT_INGEST` | One signed test event updates one test enrolment exactly once. |
| 4 | `ENABLE_R7_LIFECYCLE_CRON` | One protected test call has no unintended live reminder or archive action. |
| 5 | `ENABLE_PUSH_NOTIFICATIONS` | A real driver/test-device opt-in succeeds and WhatsApp fallback is confirmed. |

---

# Part 6 — If anything goes wrong

## Fastest safe response

| Issue | Immediate response |
|---|---|
| Learning events misbehave | Set `ENABLE_R6_EVENT_INGEST=false`, redeploy. |
| Lifecycle job behaves unexpectedly | Set `ENABLE_R7_LIFECYCLE_CRON=false`, redeploy and pause its schedule. |
| Evidence reports fail or look wrong | Set `ENABLE_EVIDENCE_REPORTS=false`, redeploy. |
| EFT workflow has an unexpected condition | Set `ENABLE_EFT_RECONCILIATION_V2=false`, redeploy; keep payment/audit data intact. |
| Push causes an unwanted prompt or delivery concern | Set `ENABLE_PUSH_NOTIFICATIONS=false`, redeploy; WhatsApp remains the fallback. |
| Core site regression | Use GitHub’s **Revert** action on the release PR. Do not force-push or reset `main`. |

For detailed commands and database rules, use [06-ROLLBACK.md](06-ROLLBACK.md).

## Completion checklist

- [ ] Both Build Checks are green.
- [ ] Both Vercel Preview links were tested.
- [ ] Every required SQL migration has a saved successful result.
- [ ] Preview tests are recorded in `RELEASE-STATUS.md`.
- [ ] GFA and BetterDriver production baseline smoke tests pass.
- [ ] Every activated flag has a recorded production smoke-test result.
- [ ] Meta Utility templates are approved where required.
- [ ] Supplier bank details are completed before a live formal quote is relied upon.
- [ ] The final PR has `rollback-ready` and `preview-tested` labels.

## Reference links

| Resource | Link |
|---|---|
| GFA release summary | [00-RELEASE-SUMMARY.md](00-RELEASE-SUMMARY.md) |
| Migration instructions | [02-SUPABASE-MIGRATIONS.md](02-SUPABASE-MIGRATIONS.md) |
| Configuration checklist | [03-ENVIRONMENT-AND-EXTERNAL-CONFIG.md](03-ENVIRONMENT-AND-EXTERNAL-CONFIG.md) |
| Full preview checklist | [04-PREVIEW-TEST-CHECKLIST.md](04-PREVIEW-TEST-CHECKLIST.md) |
| Production cutover | [05-PRODUCTION-CUTOVER.md](05-PRODUCTION-CUTOVER.md) |
| Rollback runbook | [06-ROLLBACK.md](06-ROLLBACK.md) |
| Release tracker | [RELEASE-STATUS.md](RELEASE-STATUS.md) |
| Supabase SQL Editor | [Open SQL Editor](https://supabase.com/dashboard/project/khzctzixeghppwwnzsdq/sql/new) |
