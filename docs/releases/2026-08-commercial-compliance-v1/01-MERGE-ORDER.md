# 01 — Merge Order

## Objective

Asif should approve and merge **one cumulative release branch**, rather than attempting to merge all feature branches into `main` individually. The branch already contains the approved changes in the sequence below.

| Order | Source branch | Included release capability |
|---:|---|---|
| 1 | `feature/commercial-r1-billing-quotes` | Billing profile and formal quotes |
| 2 | `feature/commercial-r2-eft-reconciliation` | EFT proof and controlled reconciliation |
| 3 | `feature/commercial-r3-discount-governance` | Discount governance and authority enforcement |
| 4 | `feature/commercial-r4-client-workflow` | Client workflow and demo-tour navigation |
| 5 | `feature/commercial-r5-financial-operations` | Daily financial operations reporting |
| 6 | `feature/commercial-r6-learning-events` | Learning-event revenue foundation and receiver |
| 7 | `feature/r7a-compliance-reporting-foundation` | RTMS/compliance data foundation |
| 8 | `feature/r7b-client-compliance-dashboard` | Client compliance dashboard |
| 9 | `feature/r7c-evidence-packs-lifecycle` | Evidence packs, validation and lifecycle foundation |
| 10 | `feature/r7d-evidence-report-enhancements` | RTMS profile settings |
| 11 | `feature/rbd2-driver-whatsapp-onboarding` | Driver WhatsApp welcome copy |

## The integration branch to review

```bash
git fetch origin
git checkout release/gfa-commercial-compliance-v1
git pull --ff-only origin release/gfa-commercial-compliance-v1
npm ci
npm run type-check
npm run build
```

The integration branch starts from the current `main` and then applies the approved feature commits in the order shown above. Do **not** merge the source feature branches into `main` after this release branch has been accepted; that would duplicate the release history.

## Preview approval sequence

1. Open the GitHub pull request from `release/gfa-commercial-compliance-v1` to `main`.
2. Confirm that the **Build Check** workflow is green.
3. Wait for the Vercel preview deployment URL and paste it into the PR template.
4. Complete the migration and environment tasks in this runbook.
5. Run every relevant preview test and mark each item in `RELEASE-STATUS.md`.
6. Apply the labels `release`, `deployment`, `migration`, `env-change`, `external-config`, `cron`, `feature-flag`, `rollback-ready` and `preview-tested` as applicable.
7. Request final approval only when every required item is **Verified in preview**.

## Final merge to production

After preview approval, merge only this release branch to `main` using the GitHub PR. Vercel then creates the production deployment from `main`.

```bash
# Optional local confirmation immediately before approving the PR
git fetch origin
git diff --stat origin/main...origin/release/gfa-commercial-compliance-v1
```

> Never push directly to `main`. The release PR is the production change record and the safe rollback reference.
