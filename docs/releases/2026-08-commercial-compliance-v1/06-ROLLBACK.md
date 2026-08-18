# 06 — Rollback

## First principle

> Stop, preserve evidence, and choose the smallest reversible action. Do not delete production records or run destructive SQL to make an error disappear.

This release is designed so that its highest-risk features can be disabled without removing the rest of the deployment.

## Decision guide

| Symptom | First action | Next action if unresolved |
|---|---|---|
| Learning events behave unexpectedly | Set `ENABLE_R6_EVENT_INGEST=false` and redeploy. | Revert the GFA release PR if the baseline itself is affected. |
| Reminder/quote lifecycle changes unexpected data | Set `ENABLE_R7_LIFECYCLE_CRON=false` and redeploy. | Preserve IDs/logs; pause scheduler; prepare corrective additive migration. |
| Evidence reports fail or expose wrong scope | Set `ENABLE_EVIDENCE_REPORTS=false` and redeploy. | Revert the release PR only if issue affects other pages. |
| EFT queue/reconciliation issue | Set `ENABLE_EFT_RECONCILIATION_V2=false` and redeploy. | Leave payment records intact; investigate audit events before any correction. |
| Push issue, unwanted permission prompt or delivery problem | Set `ENABLE_PUSH_NOTIFICATIONS=false` and redeploy. | Clear only affected test subscriptions after review; WhatsApp remains the fallback. |
| General GFA/BetterDriver regression | Revert the release PR in GitHub. | Re-deploy the last known-good `main` commit and investigate in a new branch. |

## Flag rollback procedure

1. In the relevant Vercel project, open **Settings → Environment Variables**.
2. Change the relevant `ENABLE_*` value to `false` for the affected environment.
3. Redeploy the latest production commit.
4. Confirm the affected endpoint/interface now reports the capability as disabled.
5. Add the incident time, flag and result to `RELEASE-STATUS.md` and the release PR.

## Code rollback procedure

Use the GitHub UI to create a revert PR from the release PR. This creates the clearest audit record. If a command-line rollback is needed, first identify the merge commit.

```bash
git checkout main
git pull --ff-only origin main
git log --oneline -10
# Use the merge commit hash from the GFA or BetterDriver release PR.
git revert -m 1 <merge_commit_hash>
git push origin main
```

Do not use `git reset --hard` or force-push on `main`.

## Database rollback posture

The release migrations are additive and may be safely left in place after a code rollback. Tables and audit records should not be dropped. If a data correction is needed, create a narrowly scoped, reviewed corrective migration or use an audited admin operation.

## Communications and record keeping

If a live issue affects a client or driver journey, record:

- the time observed;
- the relevant client, driver, quote, payment, report or event ID where applicable;
- the flag or code rollback action taken;
- the expected and actual result; and
- the follow-up owner and next test time.

Never paste secrets, VAPID private keys, access tokens or full customer personal information into GitHub issues or pull requests.
