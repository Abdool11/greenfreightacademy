# Green Freight Academy — Admin Dashboard Guide

This guide explains how to use the **GFA Admin Dashboard** in plain language. It is written for the person who manages companies, training cohorts, leads, pricing, and platform content.

---

## 1. Logging in

1. Open your browser and go to the admin login page (usually `/admin/login`).
2. Enter your admin email and password.
3. Click **Sign in**.

Once logged in, you are taken to the **Platform Overview** (`/admin/dashboard`).

---

## 2. Home screen — Platform Overview

The first page is the dashboard home. It shows live numbers about the platform.

| Card | What it tells you |
|------|-------------------|
| **Active Companies** | Companies with a full or paid account. |
| **Trial Accounts** | Companies still on a trial voucher. |
| **Registered Drivers** | Total drivers added by all companies. |
| **Active Enrolments** | Drivers currently in training. |
| **Certificates Issued** | Drivers who finished and got a certificate. |
| **Pending Cohorts** | Cohorts waiting for payment or approval. |
| **Pending Payments** | Quotes paid by EFT but not yet confirmed. |

Below the cards you will see:

- **Cohorts Awaiting Approval** — click through to approve them.
- **Recent Companies** — the newest companies that signed up.

The left-hand menu lets you move between all the admin tools.

---

## 3. Managing companies

**Menu:** `Companies`

This page lists every company on the platform.

### What you can do

- See company name, contact person, email, phone, account type, and status.
- See if a company is on a **trial** and when the trial expires.
- Click **View** to open a company's full record.
- Add a new company with the **Add Company** button.

### Adding a company manually

1. Click **Add Company**.
2. Fill in the company name, contact name, email, and phone.
3. Choose the account type: **Trial** or **Full**.
4. Save.

---

## 4. Cohort Approvals

**Menu:** `Cohort Approvals`

A **cohort** is a group of drivers that a company wants to train. Before drivers receive their WhatsApp or email magic links, the cohort must be approved by an admin.

### Cohort workflow

The status bar shows the normal flow:

`Pending Payment → Payment Received → Approved → Live → Completed`

### How to approve a cohort

1. Go to **Cohort Approvals**.
2. Find the cohort marked **Pending Payment** or **Payment Received**.
3. Check the company name, payment method, reference, and amount.
4. Click the action button to move the cohort forward:
   - Confirm payment
   - Approve the cohort
   - Send magic links to drivers

When a cohort is **Approved** or **Live**, drivers automatically receive their welcome messages with a link to start training.

---

## 5. Programmes

**Menu:** `Programmes`

Programmes are the training courses that companies can buy for their drivers.

### What you can do

- View all programmes.
- Add a new programme.
- Edit an existing programme.
- Archive or delete a programme.

### Adding or editing a programme

1. Click **New Programme** or the **Edit** button on an existing one.
2. Fill in the details:
   - **Programme Name** — shown to clients.
   - **Slug** — used in web addresses and integrations.
   - **Description** — short summary.
   - **Price** and **Pricing Model** — per driver per month or once-off.
   - **Number of Modules** and **Duration** in weeks.
   - **CPD Frequency** — monthly, quarterly, or annual.
   - **Target Audience** — drivers, managers, or all staff.
   - **Moodle Course ID** — links the programme to your Moodle course.
   - **Status** — active, in development, or archived.
3. Click **Create Programme** or **Save Changes**.

---

## 6. Trial Vouchers

**Menu:** `Trial Vouchers`

Trial vouchers let a prospective company test the platform with a limited number of drivers for a limited time.

### How to create a trial voucher

1. Go to **Trial Vouchers**.
2. Click **Create voucher**.
3. Choose:
   - **Seats** — how many drivers can be added (1, 3, 5, or 10).
   - **Trial duration** — 14, 30, or 60 days.
4. Add prospect details: company name, contact name, phone, and email.
5. Write a welcome message if you want a personal touch.
6. Choose how to send the voucher: **WhatsApp + Email**, **Email only**, **WhatsApp only**, or **copy the link manually**.
7. Click **Create & send voucher**.

### Converting a trial to a full account

When a prospect is ready to become a paying customer:

1. Find their voucher in the list.
2. Click **Convert to full**.
3. This removes the seat and time limits.

---

## 7. Leads & Campaigns

**Menu:** `Leads & Campaigns`

This is your sales pipeline.

### What you can do

- See all your leads in one table.
- Filter leads by stage.
- Add a lead manually.
- Import leads from an Excel file.
- Send trial campaigns to selected leads.

### Lead stages

| Stage | Meaning |
|-------|---------|
| Imported | New lead added to the system. |
| Voucher Sent | A trial voucher was sent. |
| Activated | The prospect activated the trial. |
| Drivers Deployed | They added drivers and started training. |
| Converted | They became a paying customer. |
| Lost | The lead did not convert. |

### Importing leads

1. Click **Download template** to get the correct Excel format.
2. Fill in your lead list using the template.
3. Click **Import Excel** and select your file.
4. The system tells you how many leads were imported.

### Sending a campaign to leads

1. Tick the checkbox next to each lead you want to contact.
2. Click **Send campaign (X)**.
3. Choose seats, trial duration, welcome message, and send method.
4. Click **Send to X leads**.

---

## 8. Pricing Management

**Menu:** `Pricing`

This page controls the price of each programme shown on the public website.

### How to change a price

1. Find the programme you want to update.
2. Type the new **Corporate price** and/or **Individual price**.
3. Click the **Save changes** button on that card.

The system automatically adds 15% VAT when an invoice is created.

### Hiding or showing a programme

- Click the **Visible / Hidden** toggle on a programme card.
- Hidden programmes are not shown on public pages.

### Urgent Bulletin Fee

At the bottom of the page you can set the fee clients pay when they send an **urgent driver bulletin** without sharing it with the community CPD library.

---

## 9. CPD Queue

**Menu:** `CPD Queue`

When a client submits a bulletin or incident for the shared CPD library, it appears here for review.

### How to review a submission

1. Open the **CPD Library Queue**.
2. The **Pending Review** tab is selected by default.
3. Click a card to expand it and read the full description, images, and mitigation message.
4. Add admin notes if needed.
5. Click **Approve for CPD Library** or **Reject**.

You can also switch to the **Approved** or **Rejected** tabs to see past decisions.

---

## 10. Messaging Settings

**Menu:** `Messaging`

This is where you customise the messages sent to drivers and prospects.

### What you can change

- **Default Delivery Channel** — WhatsApp + Email, WhatsApp only, or Email only.
- **Message templates** for:
  - Driver welcome / activation
  - Training reminders
  - Driver bulletins
  - CPD modules
  - Certificate issued
  - Trial voucher invitation

### How to edit a template

1. Click into the template text area.
2. Use the `{{variable}}` chips to insert dynamic fields such as driver name or company name.
3. Click **Save Changes**.
4. You can click **Preview** to see how the message will look.

---

## 11. Email Settings

**Menu:** `Email Settings`

This page lets you set the addresses used for system emails:

- **From name** — the name emails appear to come from.
- **Booking email** — where quote and booking notifications are sent.
- **Company email** — the main contact email.

Update the fields and save.

---

## 12. Impact Stats & Contact

**Menu:** `Impact Stats & Contact`

These numbers appear on the public website as "bragging strips".

### What you can control

- Companies
- Training seats booked
- Certifications completed
- Workshops delivered
- Contact email for public forms

For each stat, choose:

- **Static** — you type the number manually.
- **Live DB** — the number is pulled automatically from the database.

Click **Save all settings** when you are done.

---

## 13. Video Library

**Menu:** `Video Library`

Upload and manage videos used for invitations, marketing, walkthroughs, and training modules.

### How to upload a video

1. Click **Upload Video**.
2. Enter the title and description.
3. Choose the **Video Type**:
   - Campaign Invite
   - Marketing Teaser
   - Portal Walkthrough
   - Training Module
4. Choose the language.
5. Select the programme if the video belongs to one.
6. Choose whether it is **Public**.
7. Select an MP4 or MOV file.
8. Click **Upload**.

The video is uploaded to Bunny.net. The status shows **pending**, **processing**, or **ready**.

---

## 14. Data Management

**Menu:** `Data Management`

Use this page with care. It lets you delete test data and individual records.

### Purging test data

1. Click **Purge test data**.
2. Confirm by clicking **Yes, purge**.
3. The system deletes companies whose names contain words like `test`, `sample`, `demo`, `dummy`, or `example`, plus all related drivers and records.

### Deleting specific companies or drivers

1. Tick the checkboxes next to the records you want to remove.
2. Click **Delete X selected**.
3. Confirm the deletion.

> **Warning:** Deletions are permanent and cannot be undone.

---

## 15. Sales Funnel & CEO Dashboard (Super Admin only)

If you are a **Super Admin**, two extra menu items appear:

- **Sales Funnel** — a high-level view of the sales pipeline.
- **CEO Dashboard** — executive summary numbers and charts.

Regular admin users do not see these.

---

## Quick reference: what each menu item does

| Menu item | Purpose |
|-----------|---------|
| **Dashboard** | Live platform overview. |
| **Companies** | View and manage client companies. |
| **Cohort Approvals** | Approve training cohorts and send driver links. |
| **Programmes** | Create and edit training programmes. |
| **Trial Vouchers** | Generate and manage trial access codes. |
| **Leads & Campaigns** | Sales pipeline and bulk voucher campaigns. |
| **Messaging** | Edit WhatsApp/email templates. |
| **Email Settings** | Configure system email addresses. |
| **Pricing** | Set programme prices and bulletin fee. |
| **CPD Queue** | Review community CPD submissions. |
| **Impact Stats & Contact** | Control public stats and contact email. |
| **Data Management** | Delete test data or records. |
| **Video Library** | Upload and manage videos. |
| **Sales Funnel** *(Super Admin)* | Sales pipeline view. |
| **CEO Dashboard** *(Super Admin)* | Executive summary. |

---

## Tips

- Use the **left sidebar** to move between pages.
- Look for green buttons to create or save, red buttons to delete, and amber warnings for actions that need attention.
- If a page is loading, a green spinner appears; wait for it to finish before clicking again.
- When in doubt, start from the **Dashboard** and work outward.
