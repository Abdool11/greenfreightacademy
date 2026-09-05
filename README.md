# Green Freight Academy (GFA)

**Website:** [greenfreightacademy.co.za](https://greenfreightacademy.co.za)

GFA is a B2B training platform that enables transport companies to deploy professional driver training programmes at scale. Companies register, import their drivers, pay via Paystack, and deploy training through the BetterDriver LMS. This repository contains the full source code for the GFA platform.

Key platform capabilities include:
- **Training Campaign Lifecycle** — companies set a target duration (1 week, 2 weeks, 1 month, or custom) when deploying training; campaigns track completion progress, outstanding candidates, and escalation nudges with WhatsApp deadline reminders
- **Campaign Reporting** — per-campaign stats (enrolled, not started, in progress, completed) with a time progress bar and days-remaining countdown
- **Escalation Nudges** — bulk or selective WhatsApp nudges to outstanding candidates, with campaign name and deadline embedded in the message
- **Campaign Closure & Credit Refunds** — closing a campaign expires outstanding enrolments and refunds fees as platform credits (100% for non-starters, 50% for in-progress drivers)
- **HR Feedback (Self-Evaluation)** — a 3-question 5-star widget completed by drivers after course completion: (1) I understand the material, (2) I enjoyed the learning experience, (3) I want to learn more; aggregate scores are visible per campaign
- **GFA Video Library** — admin-managed Bunny.net-backed video library for invite videos, teaser videos, portal walkthrough videos, and module content; videos are tagged by type, language (EN/ZU), and programme; invite videos are selectable when creating a training campaign and are delivered to drivers on first magic link tap
- **WhatsApp Bulletin Notification Fields** — when creating a driver bulletin, the operator selects which fields to include in the WhatsApp message (topic, urgency level, category, driver action, mitigation message, portal link); a live preview shows exactly what each driver will receive before dissemination
- **Billing Profiles & Formal Quotes** — companies complete a secure billing profile before issuing their first quotation; buyer and supplier details, payment terms, validity date and procurement references are copied into immutable quote snapshots
- **Admin Commercial Document Settings** — authorised admins configure the legal supplier identity, optional VAT registration number, VAT percentage, EFT instructions, quotation terms and invoice terms without hard-coding sensitive commercial information into the application
- **Commercial Invoices** — authorised admins issue one immutable invoice from an eligible quote; the invoice retains supplier/buyer snapshots, a safe annual invoice number, commercial totals, payment allocation events and a matching GFA letterhead-aligned PDF
- **Import Reliability** — the driver import screen downloads the same server-generated `.xlsx` template accepted by the primary import parser
- **EFT Reconciliation Inbox** — clients submit an EFT reference, amount, date and optional private proof of payment; finance reviews the expected-versus-claimed amount, bank reference, variance and evidence before confirming, requesting clarification or rejecting
- **Private Payment Evidence** — proof files are stored in a private Supabase Storage bucket and are accessed only through short-lived, admin-authenticated URLs
- **Governed Discounts** — staff request concessions against unpaid quotes with a required commercial reason; an independent authorised approver creates a revised quote version, writes an immutable event trail, records the concession in the ledger, and notifies the client/accounts contact
- **Guided Client Enrolment** — the client dashboard now leads the user through Add Drivers → Select Programme → Quote & Pay → Deploy, filters the training matrix by programme, shows the selected driver count and estimated VAT-inclusive total, and keeps the formal-quote action visible while selecting
- **Resilient Demo Tour** — all 14 simulated dashboard steps remain inside `/demo`; explicit Back, Forward and Exit controls can no longer redirect a visitor into an authenticated real dashboard mid-tour
- **Daily Operations** — an admin daily management report combines confirmed platform receipts, card/EFT split, quotes, discounts, drivers added, training starts, completions, certificates and an actionable finance queue; the detailed cashbook exports to CSV
- **Learning Event Foundation** — idempotent BetterDriver/Moodle event and per-enrolment revenue-recognition tables provide the protected central ledger required before wiring signed training-start, progress and certificate events
- **Compliance & Evidence Reporting** — client RTMS profile, competency-review preferences, compliance dashboard, controlled on-demand evidence snapshots/PDFs, privacy-preserving validation metadata and protected lifecycle automation are available behind safe release flags. Evidence-pack PDFs use the committed GFA letterhead, present driver training/completion/certification status, include summary counts, and retain a control number plus integrity checksum.
- **Deployment Experience** — GitHub build checks, a deployment-ready PR template, release labels and a versioned integration runbook reduce production release risk

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 14 (App Router, standalone output) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Payments | Paystack |
| Email | Resend |
| Messaging | WhatsApp Business API (Meta Graph API) |
| LMS | Moodle (via REST API) |
| Auth | JWT (custom auth for clients and admins) |
| Deployment | Node.js standalone + Nginx + PM2 |

---

## User Roles

| Role | Access | Description |
| :--- | :--- | :--- |
| Client | Company dashboard | Transport company managing drivers, quotes, payments, bulletins |
| Admin | Admin dashboard | GFA staff managing companies, cohorts, vouchers, CPD queue |
| Super Admin | CEO dashboard and Sales Funnel | Full platform visibility and lead management |

---

## Project Structure

```
app/
  api/                        # Backend API routes
    admin/                    # Admin-only routes (JWT protected)
    auth/                     # Login, logout, register
    bulletins/                # CPD bulletin creation and dissemination
    company/                  # Driver import, quoting, deployment
      training-campaigns/     # Campaign CRUD, close (credit refund), escalation nudge
    driver/                   # Driver-facing endpoints (HR feedback)
    paystack/                 # Payment initialisation, verification, webhook
    trial/                    # Trial voucher activation
  admin/                      # Admin pages
    dashboard/                # Admin overview
    companies/                # Company management
    cohorts/                  # Cohort approval workflow
    leads/                    # Lead management
    vouchers/                 # Trial voucher management
    cpd-queue/                # CPD bulletin approval queue
    funnel/                   # Sales funnel (super admin only)
    super/                    # CEO dashboard (super admin only)
    pricing/                  # Programme pricing management
    stats/                    # Impact statistics
    email-settings/           # Email template settings
    settings/messaging/       # WhatsApp message template settings
    settings/quote-profile/   # Supplier, VAT, EFT, quotation and invoice-term settings
    finance/                  # Ledger, reconciliation inbox and per-client account view
    invoices/                 # Authorised invoice issue/list workflow
    discounts/                # Governed discount requests, approvals and audit status
    operations/               # Daily cashbook, delivery metrics and operational exception queue
    video-library/            # GFA Video Library (Bunny.net upload, manage, assign)
  dashboard/                  # Client dashboard pages, guided enrolment workflow and payment/deployment actions
    bulletins/                # CPD bulletin creation and management
    campaigns/                # Bulletin campaign management
    training-campaigns/       # Training campaign lifecycle management (progress, nudges, close, HR feedback)
    import/                   # Driver Excel import using the authoritative server-generated template
    billing/                  # Client billing profile for formal quotations
    eft/                      # Client EFT instructions, proof upload and verification notice
    reports/                  # Training reports
  programmes/                 # Public programme listing
  pricing/                    # Public pricing page
  publications/               # CPD publications library
  registry/                   # Public driver registry
  login/ register/ trial/     # Auth and onboarding
  about/ contact/ privacy/ terms/ cpd-bulletins/
components/                   # Shared React components
  CampaignSetupModal.tsx      # Duration picker + invite video selector shown after Deploy Training
  HRFeedbackWidget.tsx        # 3-question star-rating self-evaluation widget
  BulletinWhatsAppFieldSelector.tsx  # Selectable WhatsApp notification fields for bulletin dissemination
lib/                          # Utilities, constants, Supabase client
public/                       # Static assets
  branding/                   # Committed Green Freight Academy report-letterhead asset
supabase/migrations/          # SQL migration files (apply via Supabase SQL editor)
```

---

## Local Development

```bash
git clone https://github.com/Abdool11/greenfreightacademy.git
cd greenfreightacademy
npm install
cp .env.local.example .env.local
# Fill in .env.local values
# For a fresh deployment — run the combined file in one paste:
#   ALL_MIGRATIONS_RUN_ONCE.sql  (repo root)
#
# Or apply individually in this order:
#   supabase/migrations/20260501_base_schema.sql              <- RUN FIRST
#   supabase/migrations/20260502_training_campaigns.sql
#   supabase/migrations/20260502_video_library_bulletin_fields.sql
#   ... apply the remaining migrations in filename order, including:
#   supabase/migrations/20260816_r1_billing_quotes.sql
#   supabase/migrations/20260817_r2_eft_reconciliation.sql
#   supabase/migrations/20260818_r3_discount_governance.sql
#   supabase/migrations/20260819_r6_learning_events.sql
#   supabase/migrations/20260821_r7a_compliance_reporting.sql
#   supabase/migrations/20260903_r8_invoices_vat_commercial_documents.sql
npm run dev
```

> **Database migrations:** Each file in `supabase/migrations/` is a standalone SQL script. Apply them in filename order via the Supabase dashboard SQL editor or the Supabase CLI (`supabase db push`). All statements are idempotent — safe to re-run.
>
> **Fresh deployment shortcut:** Use `ALL_MIGRATIONS_RUN_ONCE.sql` in the repo root — all migrations concatenated in the correct order, ready to paste into the Supabase SQL editor in one go.
>
> **GFA → BD magic link:** The deploy route (`app/api/company/deploy/route.ts`) generates a BD invitation token per driver and sends a WhatsApp message containing the magic link (`{BD_BASE_URL}/join/{token}`). Set `BD_BASE_URL=https://betterdriver.co.za` in `.env.local`.
>
> **Release 1 setup:** After applying `20260816_r1_billing_quotes.sql`, an admin must complete **Admin → Formal Quote Settings** before issuing formal client quotations. This supplies the legal supplier identity, VAT, EFT and payment-term details that are copied into each quote snapshot.
>
> **Release 2 setup:** Apply `20260817_r2_eft_reconciliation.sql` after Release 1. It creates the private `payment-proofs` storage bucket and the immutable EFT reconciliation audit trail. Review pending EFTs under **Admin → Finance & Ledger → Reconciliation**; never approve an EFT outside this controlled workflow.
>
> **Release 3 setup:** Apply `20260818_r3_discount_governance.sql` after Releases 1–2. An `admin` may approve a discount of **20% or less**; only a `super_admin` may approve a larger discount; and self-approval is always blocked. Change these policy values only after formal commercial approval.
>
> **Commercial & Compliance V1:** Follow [`docs/releases/2026-08-commercial-compliance-v1/00-RELEASE-SUMMARY.md`](docs/releases/2026-08-commercial-compliance-v1/00-RELEASE-SUMMARY.md) for the one-branch integration process, ordered migrations, Vercel configuration, preview tests, feature activation and rollback.
>
> **Commercial invoices and configurable VAT:** Apply `supabase/migrations/20260903_r8_invoices_vat_commercial_documents.sql` after the preceding commercial migrations. Then complete **Admin → Formal Commercial Document Settings** with the supplier legal entity, VAT number only when registered, VAT percentage, bank details, quotation terms, invoice due days and invoice terms. The values are copied into new document snapshots; historic documents are not retroactively changed. Use **Admin → Commercial Invoices** to issue exactly one invoice from an eligible quote. Confirm VAT registration, rate and tax-invoice wording with an appropriately qualified tax or accounting professional before issuing external documents.

---

## Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `GFA_JWT_SECRET` | Yes | Secret for signing client JWT tokens |
| `ADMIN_JWT_SECRET` | Yes | Secret for signing admin JWT tokens |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key |
| `BREVO_API_KEY` | Yes | Brevo API key for transactional emails |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Meta Graph API token for WhatsApp nudges |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | WhatsApp Business phone number ID |
| `MOODLE_URL` | Optional | Base URL of the Moodle instance |
| `MOODLE_TOKEN` | Optional | Moodle REST API token |
| `MOODLE_DRIVER_PROGRAMME_COURSE_ID` | Optional | Moodle course ID for Professional Driver programme |
| `MOODLE_ECO_DRIVER_COURSE_ID` | Optional | Moodle course ID for Eco-Driver programme |
| `BUNNY_API_KEY` | Optional | Bunny.net API key for video library uploads |
| `BUNNY_LIBRARY_ID` | Optional | Bunny.net video library ID |
| `BUNNY_CDN_HOSTNAME` | Optional | Bunny.net CDN hostname for playback URLs |
| `BD_BASE_URL` | Yes | BetterDriver site URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Full URL of this site in production |
| `BD_EVENT_SECRET` | R6 only | Shared HMAC secret for trusted BetterDriver/Moodle learning events |
| `CRON_SECRET` | R7 lifecycle only | Secret required by the compliance lifecycle endpoint |
| `ENABLE_R6_EVENT_INGEST` | Release controlled | Leave `false` until signed-event preview test passes |
| `ENABLE_R7_LIFECYCLE_CRON` | Release controlled | Leave `false` until lifecycle preview test passes |
| `ENABLE_EVIDENCE_REPORTS` | Release controlled | Leave `false` until evidence report/validation preview test passes |
| `ENABLE_EFT_RECONCILIATION_V2` | Release controlled | Leave `false` until finance preview test passes |

No new deployment environment variable is required for commercial invoices or VAT settings. VAT and invoice-term configuration is stored in the protected `site_config` settings flow, not in `.env.local`.

---

## Branching and Version Control Workflow

All changes go through a branch and Pull Request — nothing is pushed directly to `main`.

### Branch Naming Convention

| Type | Pattern | Example |
| :--- | :--- | :--- |
| New feature | `feature/short-description` | `feature/bulk-driver-import` |
| Bug fix | `fix/short-description` | `fix/paystack-webhook-signature` |
| Content update | `content/short-description` | `content/update-pricing-page` |
| Hotfix (urgent) | `hotfix/short-description` | `hotfix/login-redirect-broken` |
| Integration release | `release/short-description` | `release/gfa-commercial-compliance-v1` |

### Step-by-Step Workflow

1. Create a branch from `main`: `git checkout -b feature/your-feature-name`
2. Make changes and commit: `git commit -m "feat: describe what changed and why"`
3. Run `npm ci`, `npm run type-check` and `npm run build`.
4. Push the branch: `git push origin feature/your-feature-name`.
5. Complete the deployment-ready PR template, including migration, environment, feature-flag and rollback details.
6. Wait for the GitHub **Build Check** and a Vercel Preview deployment.
7. For a cumulative release, merge feature commits into a `release/...` branch, complete its versioned runbook, then open one final PR to `main`.
8. Approve and merge only after the preview checklist passes; delete the source branch after the release is stable.

---

## Deployment

Vercel deploys `main` to production. Feature and release branches should be reviewed on their Vercel Preview deployment before a PR is merged. The required deployment record is the PR template plus the relevant versioned folder under `docs/releases/`.

> **Important:** Do not push directly to `main`. Use a release PR, preserve the preview URL and use feature flags to activate high-risk functionality one capability at a time.

---

## Related Repositories

| Site | Repository |
| :--- | :--- |
| Transport Action Group | [Abdool11/transportactiongroup](https://github.com/Abdool11/transportactiongroup) |
| BetterDriver | [Abdool11/betterdriver](https://github.com/Abdool11/betterdriver) |


### Release 9 — QA Stabilisation: Payment Integrity and Public Pricing

Apply `supabase/migrations/20260905_r9_payment_credit_idempotency.sql` after Release 8. It creates the durable `payment_credit_allocations` ledger and the protected `allocate_quote_credits_once` function. Paystack browser verification, Paystack webhooks and confirmed EFT reconciliation use this one path to allocate purchased seats exactly once per payment/quote. No new environment variables are required.

The public `/pricing` page now reads available course prices from the database-backed `courses` catalogue, the same controlled source used by the public pricing API and administrative pricing management. Before promoting this release, validate one two-seat synthetic Paystack payment through both redirect and webhook paths and verify that the company receives exactly two credits. Review any historic company balance that exceeds the seats purchased; Release 9 prevents new duplicate allocations and does not automatically reverse historic balances.


### Release 10 — QA Stabilisation: Driver Identity and Deployment Controls

Apply `supabase/migrations/20260905_r10_driver_deployment_idempotency.sql` after Release 9. It creates a durable quote-driver deployment ledger and an atomic credit-reservation function. Both individual and bulk deployment paths reserve each quote/driver pairing once before creating an invitation or sending WhatsApp, preventing repeated clicks or concurrent requests from creating duplicate magic links or deducting credits more than once.

Driver entry, standard import and paid-quote driver capture now require an ID number or passport number. South African IDs are checksum-validated; passport values support 6–20 alphanumeric characters. The standard driver-import workbook has a blank **Drivers** sheet and a separate non-personal **Instructions** sheet, so generated templates never contain illustrative or previously entered driver details. Before deployment, test a synthetic duplicate mobile, duplicate identity, invalid identity, blank template download and repeated individual/bulk deployment attempt in Preview.


### QA Stabilisation — Registration and Responsive Client Experience

The company-registration flow now shows a clear success confirmation and requires the client to choose **Continue to dashboard**; it no longer redirects automatically after account creation. Shared dark-form autofill styling preserves readable text in Chromium-managed email/password fills, and narrow-viewport heading safeguards reduce the risk of title overlap. The dashboard guided-tour entry now returns a client to `/dashboard` when it was launched there; public tour entry continues to return to pricing. Validate registration and tour exit at desktop and mobile widths in Preview before promotion.
