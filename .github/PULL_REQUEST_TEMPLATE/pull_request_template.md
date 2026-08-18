# Deployment-ready pull request

## 1. Plain-English summary
<!-- Explain the user/business outcome in two or three sentences. -->

## 2. Change classification
- [ ] `feature` — New capability
- [ ] `fix` — Corrects existing behaviour
- [ ] `content` — Copy, images or configuration only
- [ ] `chore` — Tooling, dependency or housekeeping change
- [ ] `hotfix` — Urgent production correction
- [ ] `release` — Cumulative, production-ready integration branch

## 3. What changed
<!-- List the important files, routes, screens and behaviour. Link to related PRs/issues if relevant. -->

## 4. Deployment impact

| Check | Answer / detail |
|---|---|
| SQL migration required? | `No` / `Yes — file path(s):` |
| Combined migration file updated? | `No` / `Yes — path:` |
| New or changed environment variables? | `No` / `Yes — names and where to configure:` |
| External configuration required? | `No` / `Yes — Meta, Vercel, Moodle, Brevo, Paystack, cron or other:` |
| Feature flag affected? | `No` / `Yes — flag name, default and activation condition:` |
| Scheduled job / cron affected? | `No` / `Yes — endpoint, secret and schedule:` |
| Data backfill or manual setup needed? | `No` / `Yes — exact steps:` |

## 5. Preview testing

**Preview URL:** <!-- Paste the Vercel preview URL once available. -->

<!-- Give a short, ordered test journey a reviewer can follow without reading the source. -->
1. 
2. 
3. 

## 6. Rollback plan
<!-- State the exact safe rollback: revert this PR, turn a flag off, revert config, or a specific corrective migration. -->

## 7. Release labels
- [ ] `release`
- [ ] `deployment`
- [ ] `migration` (if SQL is required)
- [ ] `env-change` (if environment configuration is required)
- [ ] `external-config` (if a third-party dashboard must be changed)
- [ ] `cron` (if a scheduled task is affected)
- [ ] `feature-flag` (if controlled activation is used)
- [ ] `rollback-ready`
- [ ] `preview-tested`

## 8. Author verification
- [ ] `npm ci` completed successfully
- [ ] `npm run type-check` completed successfully
- [ ] `npm run build` completed successfully
- [ ] Browser-tested on the preview deployment, where applicable
- [ ] No `.env.local`, credentials, `node_modules/` or `.next/` files committed
- [ ] `.env.local.example` updated for any changed configuration
- [ ] README and release runbook updated where the deployment process changed
- [ ] Migration is idempotent and documented, if applicable

## Screenshots or evidence (if useful)
<!-- Add screenshots, request/response evidence or a short video for reviewer confidence. -->
