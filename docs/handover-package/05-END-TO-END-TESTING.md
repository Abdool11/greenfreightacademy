# TAG Ecosystem — End-to-End Test Checklist

This document provides a structured testing plan to verify the entire ecosystem is functioning correctly after deployment. Do not consider the deployment complete until every item is checked.

## 1. TAG Public & Admin

### Public Site
- [ ] Navigate to `transportactiongroup.co.za`.
- [ ] Submit the Contact form. Verify success message.
- [ ] Submit the TCO Calculator form. Verify success message.

### Admin Portal
- [ ] Log into `/admin/login` using the seeded admin credentials.
- [ ] Verify the dashboard loads without errors.
- [ ] Navigate to Enquiries. Verify the test contact submission appears.
- [ ] Navigate to TCO Submissions. Verify the test TCO submission appears.

## 2. GFA B2B Workflow

### Company Registration & Quoting
- [ ] Navigate to `greenfreightacademy.co.za/auth/register`. Register a test company.
- [ ] Log into the company portal.
- [ ] Generate a test quote for 5 drivers. Verify the PDF is generated and emailed.
- [ ] (Optional) Complete the Paystack payment flow using test credentials.

### Cohort Deployment
- [ ] In the company portal, navigate to Deploy.
- [ ] Upload a test CSV with 2 drivers (use your own phone numbers/emails for testing).
- [ ] Submit the deployment.

### Admin Approval & Dispatch
- [ ] Log into GFA Admin (`/admin/login`) using seeded credentials.
- [ ] Navigate to Cohorts. Find the pending test cohort.
- [ ] Approve the cohort.
- [ ] **Verify:** Check your test phone/email to confirm the magic link was received.

## 3. BetterDriver B2C Workflow

### Driver Activation
- [ ] Click the magic link received in the previous step.
- [ ] Verify redirection to `betterdriver.co.za/start`.
- [ ] Complete the activation flow (Language selection -> Welcome video).
- [ ] **Verify:** Check Moodle to confirm a new user account was created for the driver.

### Course Interaction
- [ ] In the BD portal, navigate to My Course.
- [ ] Click "Start Course" or a specific module.
- [ ] **Verify:** Seamless redirection/SSO into the Moodle course.
- [ ] Complete a module in Moodle.

### Progress Sync
- [ ] Return to the BD portal dashboard.
- [ ] **Verify:** The progress bar has updated to reflect the completed module. (This tests the Moodle webhook/polling integration).

### Certificate Generation
- [ ] Complete all modules in the Moodle course.
- [ ] Return to the BD portal.
- [ ] Navigate to My Certificate.
- [ ] **Verify:** The certificate is available for download.
- [ ] Download the certificate and scan the QR code (or visit the verification URL).
- [ ] **Verify:** The public verification page (`/verify/[certId]`) loads correctly and displays the driver's details.
