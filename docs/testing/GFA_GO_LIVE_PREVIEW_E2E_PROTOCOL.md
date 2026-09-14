# GFA Go-Live Preview End-to-End Acceptance Protocol

## Purpose

This protocol is the final automated and controlled manual acceptance gate before GFA is handed to QA for its final release pass. It is designed for a **fresh non-production Vercel Preview**, a dedicated synthetic GFA dataset and disabled or mocked outbound services. It must never be pointed at `greenfreightacademy.co.za`, production Supabase data, real customer accounts or live WhatsApp/email delivery.

The protocol covers the integrated Release 13, Release 14A, Release 14B and Release 15 repairs together with the previously released administration, commercial, certificate and driver-deployment safeguards.

> A green build alone is not sufficient. The Preview must demonstrate correct workflow outcomes, authorisation denial, retry safety, audit records and privacy boundaries using recorded evidence.

## Required Preview baseline

| Control | Required state |
|---|---|
| Application build | A unique Vercel Preview deployment of `feature/gfa-go-live-qa-integration`; record URL and commit SHA. |
| Database | Dedicated Preview database or an approved, isolated synthetic namespace. Apply migrations in filename order through Releases 11–15. |
| GFA certificate contract | Configure Preview-only asymmetric keys and handoff secret. Keep the feature disabled until its fixture set and migration are confirmed, then enable it only in this Preview. |
| EFT test | Enable only the Preview EFT reconciliation flag. Seed one disposable pending EFT payment. |
| Outbound delivery | Remove or mock WhatsApp and email delivery credentials. No live notification, attachment or payment callback may be sent. |
| Payment | Use only the Paystack sandbox/test mode. |
| Test accounts | Create temporary, synthetic GFA administrator and client-company accounts. Do not reuse production credentials. |
| Public origin | Set `NEXT_PUBLIC_SITE_URL` to the exact Preview origin, not the production domain, so certificate handoff URLs are testable. |

## Synthetic fixture set

Create the following records only in the isolated Preview environment. The identifiers are supplied as environment variables locally or in the secure CI context; they must never be committed.

| Fixture | Purpose | Required test inputs |
|---|---|---|
| Preview administrator | Admin workflow, audit trail and certificate decision routes. | `GFA_TEST_ADMIN_EMAIL`, `GFA_TEST_ADMIN_PASSWORD` |
| Preview client company | Client dashboard, contact-independent commercial flow and bulletin submission. | `GFA_TEST_CLIENT_EMAIL`, `GFA_TEST_CLIENT_PASSWORD` |
| Drivers A and B | Duplicate validation, single/bulk deployment and cross-driver certificate denial. | Generated inside the approved synthetic company only. |
| Pending quote/payment | EFT confirmation, ledger and reconciliation audit. | `GFA_TEST_EFT_PENDING_PAYMENT_ID`, `GFA_TEST_EFT_BANK_REFERENCE` |
| Certificate records | Pending issue, not-eligible, issued and replacement records for one synthetic driver; a second driver for cross-driver denial. | `GFA_TEST_PENDING_CERTIFICATE_ID`, `GFA_TEST_NOT_ELIGIBLE_CERTIFICATE_ID`, `GFA_TEST_SUPERSEDE_CERTIFICATE_ID`, `GFA_TEST_REPLACEMENT_CERTIFICATE_ID` |
| Signed certificate assertions | Valid completion/status/handoff, invalid signature, expired assertion and Driver B-to-Driver A handoff assertion. | `GFA_TEST_CERTIFICATE_COMPLETION_ASSERTION`, `GFA_TEST_CERTIFICATE_STATUS_ASSERTION`, `GFA_TEST_CERTIFICATE_HANDOFF_ASSERTION`, `GFA_TEST_OTHER_DRIVER_HANDOFF_ASSERTION` |
| Verification certificate | Issued synthetic certificate number only. | `GFA_TEST_CERTIFICATE_NUMBER`, `GFA_TEST_CERTIFICATE_STATUS` |

## Automated Playwright command

Run the full suite from a clean local runner after exporting only Preview variables. The base URL guard blocks the production GFA domain, and tests that require an absent fixture skip rather than falling back to real data.

```bash
npm ci
npm run type-check
npm run build
GFA_TEST_BASE_URL=https://<unique-preview>.vercel.app \
  npx playwright test --project=chromium
```

Retain the console output, HTML report, traces, screenshots/videos for failures, Preview URL, commit SHA, migration confirmation and redacted test fixture manifest. A skipped test is **not evidence of success**: the final QA gate requires every named test below to execute with its required synthetic fixture.

## Mandatory acceptance matrix

| ID | Journey | Automated evidence | Required outcome |
|---|---|---|---|
| G0 | Build and migration package | `npm run type-check`, `npm run build`, `git diff --check` | Build/type success; combined migration package contains Releases 13–15 in order. |
| G1 | Public site and contact | `11-contact-enquiry.spec.ts` plus a marked synthetic UI submission | Invalid submission creates no lead; valid synthetic submission creates exactly one `prospect_leads` record and displays success only after persistence. |
| G2 | Authentication and session isolation | `09-admin-stability.spec.ts`, negative login browser check | Invalid password remains on login; client cannot access admin routes; client sign-out does not end admin session and vice versa. |
| G3 | Client driver lifecycle | `04-client-workflow.spec.ts`, `08-qa-stabilisation.spec.ts` | Valid driver entry succeeds; invalid identity and duplicate mobile are rejected; import uses the authoritative template and errors are actionable. |
| G4 | Quote, purchase and credit integrity | `01-quote-journey.spec.ts`, `08-qa-stabilisation.spec.ts` with sandbox payment | A two-seat synthetic purchase allocates two credits once only; retry/replay does not create extra credits. |
| G5 | EFT finance decision | `02-eft-reconciliation.spec.ts`, `12-eft-reconciliation-audit.spec.ts` | Confirm/reject/clarify path is authorised; confirmed synthetic EFT returns one reconciliation event, one ledger entry and one admin audit record linked to the same payment. |
| G6 | Deployment and notification idempotency | `08-qa-stabilisation.spec.ts` with mocked/no-send delivery adapter | Single and bulk repeated clicks reserve each quote/driver once; rendered payload contains the correct individual driver name; no external message is sent. |
| G7 | Commercial documents | `07-commercial-invoice.spec.ts` and quotation PDF check | Formal quote and immutable invoice render with the approved commercial header, expected buyer/supplier snapshots and no accidental certificate branding. |
| G8 | Certificate decision and PDF | `10-certificate-contract-v2.spec.ts` with all certificate fixtures | Issue, not-eligible, revoke and supersede accept valid UUIDs; each writes lifecycle, evidence-event and administrator audit evidence; PDF title is **Professional Truck Driver Certificate** and uses the approved clean quotation-language design. |
| G9 | Certificate privacy and secure handoff | `09-certificate-registry.spec.ts`, `10-certificate-contract-v2.spec.ts` | Invalid/expired/forged assertions receive `401`; public verification is exact-number only and reveals no learner identity/document URL; one-time handoff expires/replays safely; cross-driver handoff is denied. |
| G10 | GFA CPD queue and Bulletins | `13-cpd-bulletin-e2e.spec.ts` | Synthetic client bulletin retains the correct company ID; CPD queue lists its pending item; admin approve/reject writes correct status and audit ID; no dissemination occurs. |
| G11 | Admin navigation and counts | `09-admin-stability.spec.ts`, visual browser pass | Dashboard counts cannot become negative; Companies list/detail stay authenticated; Programmes and Vouchers breadcrumb labels read Dashboard. |
| G12 | Negative authorisation and resilience | The relevant existing Playwright negative cases plus targeted browser checks | Invalid payloads, malformed IDs, stale/replayed tokens, missing role and unsupported states fail closed with no record mutation. |

## Manual visual and usability pass

Automated browser tests do not replace visual review. QA must use Chromium desktop and a mobile viewport to inspect the following after the automated suite passes: responsive navigation, quoted/invoice PDF layout, the certificate PDF title/field fitting/QR target, form error copy, payment-confirmation persistence and post-action dashboard navigation. Capture a screenshot for each checked journey.

## Go-live stop conditions

Do not hand the build to final QA, merge to `main`, promote a Preview, issue a real certificate, send a real certificate-ready notification or enable BetterDriver My Certificate if any of the following is true:

1. A mandatory matrix test is skipped, failed or uses a real account/data source.
2. Any duplicate credit, deployment reservation, invoice, certificate number, audit event or message-delivery outcome is observed.
3. Any certificate route permits public document access, cross-driver handoff, expired/replayed assertion use or identity enumeration.
4. The contact form can display success without a persisted lead.
5. The CPD queue or Bulletin workflow lacks an associated company, review decision or administrator audit record.
6. The Preview origin, migration version, feature flags, key pair or fixture data cannot be identified from the evidence pack.

## Post-test cleanup

After evidence collection, delete the Preview-only company, drivers, quotes, payments, certificate mappings, handoff sessions, CPD items/bulletins and contact lead created for the run. Retain only redacted evidence outputs and the deployment/migration manifest. Do not reuse the fixture identifiers in a future release.
