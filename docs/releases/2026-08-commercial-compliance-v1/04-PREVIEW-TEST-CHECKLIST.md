# 04 — Preview Test Checklist

Use a Vercel Preview deployment from the release branch. Test with clearly labelled test clients, test drivers and test payments only. Record the result of each section in `RELEASE-STATUS.md`.

## A. Release baseline

- [ ] The GitHub **Build Check** completed successfully.
- [ ] The Vercel Preview URL opens over HTTPS.
- [ ] Existing admin login, client login and driver handover still work.
- [ ] Existing certificate view/download works and does not display a certificate expiry date.
- [ ] All new feature flags are present and remain `false` before their specific test begins.

## B. Client quote and billing journey

1. Create or select a test client with complete company and billing details.
2. Prepare a quote with a programme price. Confirm PTDP launch pricing is R499 per driver and the default programme price is R999 where applicable.
3. Generate/download the quote and verify legal supplier/client details, quote reference, totals, line items and 14-day validity.
4. Confirm that no real payment has been requested or captured.

**Pass:** The formal quote is understandable to a client accountant and can be matched to its client, company, amount and reference.

## C. EFT reconciliation journey

1. Enable `ENABLE_EFT_RECONCILIATION_V2=true` only in the preview environment.
2. Use a test quote and submit an EFT proof with a recognizable test reference.
3. Open the admin reconciliation item. Verify company name, quote reference, expected amount, submitted amount and proof are visible.
4. Test **Request clarification** with a note and confirm the test client sees the correct status.
5. Test **Reject** with a note and confirm the quote returns to a payable state.
6. Create a fresh test payment and test **Confirm** using a matching amount and bank reference.
7. Confirm the payment audit event and credit allocation are present only once.
8. Return `ENABLE_EFT_RECONCILIATION_V2` to `false` after test completion unless finance authorizes preview activation.

**Pass:** A mismatched amount cannot be confirmed; all three decisions are auditable; no payment can be reconciled twice.

## D. Discount governance journey

1. Create a test discount request at 20% or less and verify an admin can approve it.
2. Create a test request above 20% and verify admin approval is blocked.
3. Verify a super-admin can approve the high-value request.
4. Attempt self-approval and confirm it is blocked.
5. Confirm the audit trail records the request, decision, approver and reason.

**Pass:** The authority rules hold even if a user manually attempts the wrong action.

## E. Client enrolment, operations and reporting

- [ ] The demo tour has **Back**, **Next** and **Exit** controls.
- [ ] A client can identify a driver, choose a programme and see the primary action without ambiguity.
- [ ] The operations report loads with test data and does not expose data from another company.
- [ ] The client transaction/history view offers the expected records for the test company only.

## F. R6 signed learning event

1. Confirm `BD_EVENT_SECRET` is set in Preview but `ENABLE_R6_EVENT_INGEST=false`.
2. Send a correctly signed test event and confirm it is rejected as disabled.
3. Set `ENABLE_R6_EVENT_INGEST=true`, redeploy, then send a valid test event for one test enrolment.
4. Confirm that only the intended enrolment is updated.
5. Send the identical event again. Confirm the response treats it as a duplicate and no second state change occurs.
6. Send an invalid-signature request. Confirm it is rejected.
7. Return the flag to `false` after testing unless integration approval is recorded.

**Pass:** Valid events are idempotent; invalid events are rejected; no event changes the wrong enrolment.

## G. R7 compliance and evidence reports

1. Confirm the test client can save RTMS status, safety-manager contact and annual review preferences.
2. Confirm the compliance dashboard displays only that test client’s cohort metrics.
3. Set `ENABLE_EVIDENCE_REPORTS=true`, redeploy, and create a test evidence report.
4. Confirm it receives a control number and SHA-256 checksum.
5. Generate/download the PDF. Confirm it reflects test-client data only.
6. Use the public validation path with the control number. Confirm validation metadata matches the report without exposing personal data unnecessarily.
7. Confirm there is no certificate expiry date in the report/certificate flow.
8. Return the flag to `false` after testing unless release approval is recorded.

**Pass:** The evidence pack is controlled, traceable and company-isolated.

## H. Lifecycle reminders and quote archive

1. Keep `ENABLE_R7_LIFECYCLE_CRON=false`; make a protected call using the correct secret and confirm the response reports the feature is disabled.
2. Create only controlled test data for an annual review due date and a stale test quote.
3. Set `ENABLE_R7_LIFECYCLE_CRON=true`, redeploy, and make one protected test call.
4. Confirm the expected reminder/audit log and stale-quote archival result only for test data.
5. Confirm the reminder wording states that this is **not a certificate expiry**.
6. Return the flag to `false` immediately after the test unless schedule activation is approved.

**Pass:** The endpoint cannot run without its secret; it affects only data meeting the exact criteria.

## I. BetterDriver driver experience

1. Use the GFA-to-BetterDriver test handover and confirm the canonical `/join/[token]` route works.
2. Request secure re-access for a test driver. Confirm the recovery screen provides the expected next step without exposing account details.
3. On Android Chrome, enter the driver portal, then confirm the install prompt appears only after entry—not before it.
4. Install the PWA and use the icon to reopen the driver portal.
5. Verify the revised WhatsApp onboarding message uses the approved `bd_driver_onboarding` template and offers a safe return path.

## J. BetterDriver push opt-in

1. Confirm `ENABLE_PUSH_NOTIFICATIONS=false`. The driver must not be asked for browser notification permission.
2. Set the VAPID values in Preview and set `ENABLE_PUSH_NOTIFICATIONS=true`.
3. Redeploy and test a deliberate opt-in on Android and iPhone where supported.
4. Confirm a subscription is stored only for the signed-in test driver.
5. Confirm declining browser permission leaves WhatsApp as the fallback and does not block training.
6. Turn the flag back to `false` after testing unless pilot approval is recorded.

**Pass:** Push is explicit opt-in only, and the driver can continue through WhatsApp when it is unavailable.
