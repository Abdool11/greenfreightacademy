# R7C — Controlled Evidence Packs, RTMS Alerts and Dashboard Lifecycle

## Scope

R7C builds on the R7A evidence-report data foundation and the R7B client Compliance & Safety dashboard. It adds controlled report generation and lifecycle automation without altering certificate expiry rules.

## Deliverables

| Deliverable | Behaviour |
|---|---|
| Evidence pack generator | Creates immutable PDF and CSV snapshots for training cohorts, safety briefings, certification registers and monthly compliance summaries. |
| Control number and validation | Assigns a unique control number and SHA-256 checksum to each generated report; QR/public validation must reveal only report metadata and integrity state. |
| Client report archive | Lets authorised company users download their own generated reports; no cross-company access. |
| Annual competency review reminders | Alerts the nominated company RTMS/safety contact at 30, 14, 7 and 1 days before the review due date. This is not certificate expiry. |
| Quote lifecycle | Warns at day 23 and expires unpaid quotes at day 30; expired/closed quotes leave the action dashboard but remain auditable. |

## Non-goals

- Do not add an expiry date to GFA/BetterDriver certificates by default.
- Do not expose driver names, mobile numbers, certificate numbers or report snapshots on public validation pages.
- Do not delete old quotes, payment records, reports or audit history.

## Required deployment controls

1. Add required PDF/report generation dependencies only after license and server-runtime review.
2. Store report files in private storage; public validation uses an API, not a public file URL.
3. Protect scheduled reminder/lifecycle routes with `CRON_SECRET`.
4. Test report checksum, revocation, cross-company access denial, reminder deduplication and quote expiration before deployment.
5. Provide a rollback path that disables scheduled jobs first; retain generated audit records and report snapshots.
