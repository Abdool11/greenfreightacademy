# Green Freight Academy — Client Dashboard Guide

This guide explains how to use the **GFA Client Dashboard** in plain language. It is written for the person at a client company who adds drivers, buys training seats, sends bulletins, and tracks progress.

---

## 1. Logging in

1. Go to your company dashboard URL (usually `/dashboard`).
2. Enter your company login email and password.
3. Click **Sign in**.

If you were sent a trial activation link, click it and create your password. You will then land on the **Company Dashboard**.

---

## 2. Company Dashboard home

The top of the dashboard shows:

- Your **company name**.
- A **Log out** button.
- A refresh button to reload the latest data.

Two big green buttons sit under the header:

- **Add Drivers** — add one or a few drivers manually.
- **Import from Excel** — upload a spreadsheet with many drivers.

Smaller links below take you to other tools:

- **Driver Bulletins** — send safety / operational bulletins to your drivers.
- **Training Campaigns** — manage focused training pushes.
- **Bulletin Campaigns** — see reports on sent bulletins.
- **CPD Library** — browse topics contributed by the GFA community.
- **Reports** — progress and certificate reports (coming soon).

### Quick stats

Four cards show live numbers:

| Card | What it means |
|------|---------------|
| **Total Drivers** | Drivers you have added to the system. |
| **Link Activated** | Drivers who clicked their training welcome link. |
| **Certified** | Drivers who completed training and received a certificate. |
| **Pending Quotes** | Training seats you have requested but not yet paid for. |

---

## 3. Adding drivers

### Add one or a few drivers manually

1. Click the **Add Drivers** button on the dashboard.
2. For each driver, fill in:
   - First name
   - Last name
   - Mobile number (South African format, e.g. `082 123 4567`)
   - Email (optional)
   - ID number (optional)
3. Click **+ Add another driver** if you need more rows.
4. Click **Submit**.
5. The modal will show who was created, who already existed, and any errors.

### Import many drivers from Excel

1. Click **Import from Excel** or go to `Dashboard → Import`.
2. Click **Download template** to get the correct file format.
3. Fill in the template with your driver list.
4. Drag the file onto the page, or click to browse.
5. Click **Upload**.
6. The results screen shows:
   - **Imported** — drivers added successfully.
   - **Skipped** — rows that were already in the system.
   - **Errors** — rows that failed; read the error message and re-upload after fixing.

---

## 4. The Training Matrix

The Training Matrix is the large table on the dashboard. It lists your drivers down the left and your available programmes across the top.

### Enrol a driver in a programme

1. Find the driver and the programme column.
2. Tick the **Enrol** checkbox in that cell.
3. Repeat for as many drivers and programmes as you need.
4. Click the green **Get Quote (X)** button.

You can also use the **All** buttons:

- **Enrol All** next to a driver's name enrols that driver in every available programme.
- **All** under a programme column enrols every unenrolled driver in that programme.

### Columns in the matrix

| Column | Meaning |
|--------|---------|
| **Enrol** | Select the programme for the driver. |
| **Link Active** | Green tick when the driver clicked the welcome link. |
| **Progress** | How many modules the driver has completed. |
| **Certified** | Purple award icon when the driver finished the course. |
| **Nudge** | Tick to queue a reminder message for that enrolment. |

### Sending reminder nudges

1. Tick the **Nudge** checkbox for each enrolment that needs a reminder.
2. Click **Send Reminders (X)**.
3. The driver receives a WhatsApp and/or email reminder to continue training.

---

## 5. Quotes, payment, and deployment

When you click **Get Quote**, a quote is created for the selected training seats. The quote appears in the **Deployment** section below the matrix.

### Quote statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Waiting for payment. |
| **EFT Awaiting Verification** | You paid by EFT; the GFA team is confirming it. |
| **Paid / Approved** | Payment confirmed. |
| **Deployed** | Drivers have been sent their welcome messages. |

### Pay for a quote

1. Click **Pay Now** on a pending quote.
2. You are taken to Paystack for a secure card payment.
3. Alternatively, pay by EFT using the bank details sent to your email.

### Deploy training

Once payment is confirmed:

1. The **Deploy Training** button appears on the quote.
2. Click it.
3. A **Campaign Setup** modal opens so you can optionally turn the deployment into a timed training campaign.
4. After setup (or if you skip it), WhatsApp and/or email welcome links are sent to your drivers.

### Campaign Setup modal

This modal lets you turn a deployment into a campaign:

- **Campaign name** — give the campaign a clear name.
- **Duration** — choose a preset (e.g. 4 weeks, 8 weeks) or set a custom end date.
- **Invite video** — pick an optional welcome video from the library.
- Click **Create Campaign**.

---

## 6. Training Campaigns

**Menu:** `Dashboard → Training Campaigns`

Campaigns are time-bound training pushes with clear deadlines.

### What you see

- A list of active and closed campaigns.
- Each card shows:
  - Campaign name and dates.
  - **Time progress bar** — how far into the campaign you are.
  - **Completion stats** — enrolled, started, completed, certified.
  - **Average rating** — driver feedback (if any).

### Actions on a campaign

- **Nudge outstanding** — send a reminder to all drivers who have not completed the campaign yet.
- **Close campaign** — end the campaign and refund any unused training credits.
- Click a campaign to see a detailed driver list.

### How to create a campaign

The easiest way is to create one when you click **Deploy Training** from a quote. You can also build a campaign manually from the Training Campaigns page if that option is available.

---

## 7. Driver Bulletins (CPD / safety notices)

**Menu:** `Dashboard → Driver Bulletins`

Driver bulletins let you share an incident, safety issue, or operational update with your drivers.

### The bulletin wizard

The form has three steps:

1. **Issue details**
2. **Urgency & audience**
3. **Review & submit**

### Step 1 — Issue details

Fill in:

- **Issue title** — short and clear.
- **Category** — safety, quality, process, operational, compliance, behaviour, or other.
- **Date observed** — when the issue happened.
- **Description** — what happened.
- **Why this matters** — the risk or impact.
- **Mitigation message** — what drivers must know or do.
- **Desired driver action** — the outcome you want.
- **Understanding questions** (optional, max 3) — multiple-choice questions to check drivers understood the bulletin.
- **Supporting images** (optional, max 3, up to 5 MB each).

### Step 2 — Urgency & audience

Choose the bulletin type:

| Type | What happens | Cost |
|------|--------------|------|
| **Standard bulletin** | Sent to your drivers and automatically contributed to the GFA CPD library for future quarterly modules. | Free |
| **Urgent bulletin** | Sent privately to your drivers with daily reminders until acknowledged. SLA: within 40 hours. | Fee (waived if you opt to share it with the CPD library). |

Choose who receives it:

- **All drivers**
- **Specific branch**
- **Custom selection**

Set whether the submission is **confidential**.

### Step 3 — Review & submit

Check the preview, then click **Submit**. If the bulletin needs payment, choose:

- **Pay now by card** (Paystack).
- **Add to monthly invoice**.

After payment, click **Disseminate to drivers now** to send it.

---

## 8. Bulletin Campaigns

**Menu:** `Dashboard → Bulletin Campaigns`

This page lists every bulletin you have sent and its results.

Each card shows:

- Bulletin title, category, and urgency.
- When it was disseminated.
- **Targeted** — how many drivers were supposed to receive it.
- **Delivered** — how many received it.
- **Acknowledged** — how many opened/read it.
- **Check done** — how many completed the understanding questions.

Click a card to expand and see progress bars and average understanding score. Click the download icon to save a CSV report.

---

## 9. CPD Library

**Menu:** `Dashboard → CPD Library`

The CPD Library is a shared collection of real-world operational topics contributed by GFA client companies.

### What you can do

- Browse topics by category (safety, quality, process, etc.).
- See the description and why the topic matters.
- See who contributed it (or "Anonymous").
- See the status:
  - Submitted
  - Under review
  - Selected for CPD
  - Developed into module
  - Archived

To contribute a topic, create a **Standard bulletin** from `Dashboard → Driver Bulletins`. Standard bulletins are automatically added to the library for future module development.

---

## 10. Career Planner

**Menu:** `Dashboard → Career Planner`

This page shows career pathways and recommended training for different roles in your organisation, such as:

- Driver
- Fleet Manager
- Procurement Officer
- Operations Manager
- Compliance Manager
- Workshop Manager

For each role you can see:

- **Recommended programmes** — the core training needed.
- **Optional programmes** — additional useful training.
- The **CTA** button to enrol a cohort or contact GFA to discuss a plan.

This is a planning page — you cannot enrol directly here, but you can use it to decide which programmes to buy on the dashboard.

---

## 11. Payment result page

**Menu:** This page appears automatically after Paystack payment.

After you pay for a quote or an urgent bulletin via Paystack, you are redirected to `/dashboard/payment`.

The page shows:

- **Loading** while the payment is verified.
- **Success** with a green checkmark, then redirects you back to the dashboard.
- **Error** if something went wrong, with the reason and a button to return.

If you see an error, contact GFA support with your quote or payment reference.

---

## 12. CPD Submission (alternate route)

There is also a simpler **CPD Submission** form at `/dashboard/cpd-submission`. It lets you submit an incident or mitigation with:

- Title and category.
- Description and mitigation.
- Visibility (anonymous / confidential).
- Dispatch timing (standard or urgent).

If you choose **urgent**, the same Paystack payment flow applies. In most cases, the newer **Driver Bulletins** wizard is the recommended way to create bulletins.

---

## Quick reference: client dashboard pages

| Page | Purpose |
|------|---------|
| **Dashboard** | Home, training matrix, quotes, deploy. |
| **Import** | Bulk upload drivers from Excel. |
| **Training Campaigns** | Manage timed training campaigns. |
| **Driver Bulletins** | Create and send bulletins to drivers. |
| **Bulletin Campaigns** | View bulletin reach and download reports. |
| **CPD Library** | Browse community CPD topics. |
| **Career Planner** | See recommended training by role. |
| **Reports** | Progress and certificate reports (coming soon). |
| **Payment** | Paystack result page. |
| **CPD Submission** | Simple incident/bulletin form. |

---

## Tips

- Use the **Add Drivers** or **Import** buttons first — you cannot enrol drivers that are not in the system.
- Tick **Enrol** cells in the matrix, then click **Get Quote** to purchase seats.
- Wait for payment confirmation, then **Deploy Training** to send driver links.
- A **Campaign Setup** modal pops up after deploy; use it to add a deadline and an invite video.
- Use **Training Campaigns** to track progress and nudge drivers who are falling behind.
- Standard bulletins are free and shared with the CPD library; urgent bulletins are private but cost a fee (unless you waive the fee by sharing).
