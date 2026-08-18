# 05 — Production Cutover

## Go / no-go rule

Proceed only when all mandatory Preview tests are marked **Verified in preview**, the Build Check is green, and the production rollback owner knows how to disable the release flags. If any high-risk test is incomplete, keep its feature flag `false` and release the rest safely.

## Production sequence

### 1. Confirm the release record

- [ ] The PR is from `release/gfa-commercial-compliance-v1` to `main`.
- [ ] The PR description has a Preview URL, migration evidence, configuration notes and rollback plan.
- [ ] The Build Check is green.
- [ ] `RELEASE-STATUS.md` records all preview outcomes.
- [ ] There is no unreviewed direct change to `main`.

### 2. Prepare configuration without activating features

In Vercel Production, set any missing secrets and feature flags from [03-ENVIRONMENT-AND-EXTERNAL-CONFIG.md](03-ENVIRONMENT-AND-EXTERNAL-CONFIG.md). Keep these flags as `false`:

```text
ENABLE_R6_EVENT_INGEST=false
ENABLE_R7_LIFECYCLE_CRON=false
ENABLE_EVIDENCE_REPORTS=false
ENABLE_EFT_RECONCILIATION_V2=false
ENABLE_PUSH_NOTIFICATIONS=false
```

### 3. Merge the GFA release PR

Use the GitHub PR to merge `release/gfa-commercial-compliance-v1` into `main`. Do not merge the component feature branches separately.

- [ ] Confirm the Vercel production deployment has completed.
- [ ] Open https://www.greenfreightacademy.co.za.
- [ ] Verify the existing login, client dashboard, admin dashboard and certificate download baseline.
- [ ] Confirm no certificate expiry is shown by default.

### 4. Merge the BetterDriver release PR

After GFA baseline confirmation, merge `release/betterdriver-driver-experience-v1` into the BetterDriver `main` branch.

- [ ] Confirm the Vercel production deployment has completed.
- [ ] Open https://betterdriver.co.za.
- [ ] Verify an existing driver can continue a training session.
- [ ] Verify the GFA handover still lands on a valid BetterDriver session.

### 5. Activate capabilities one at a time

Turn on **one flag only**, allow deployment to finish, run the small matching production smoke check below, record its result, then move to the next.

| Order | Flag | Production smoke check |
|---:|---|---|
| 1 | `ENABLE_EFT_RECONCILIATION_V2` | Finance reviews one controlled pending payment and confirms no live payment is changed unexpectedly. |
| 2 | `ENABLE_EVIDENCE_REPORTS` | A designated admin generates one controlled report for a consenting test/internal client. |
| 3 | `ENABLE_R6_EVENT_INGEST` | Send one signed test event and confirm an intended test enrolment changes once. |
| 4 | `ENABLE_R7_LIFECYCLE_CRON` | Call the protected endpoint with the secret and confirm no unintended live reminder/archive action. |
| 5 | `ENABLE_PUSH_NOTIFICATIONS` | Only after VAPID setup, a real-device opt-in and a confirmed WhatsApp fallback. |

## Completion record

Mark the feature **Live in production** in `RELEASE-STATUS.md` only after its production smoke check passes. A production merge with a flag still `false` is valid and safe; it means the capability is deployed but intentionally dormant.
