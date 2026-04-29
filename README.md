# Green Freight Academy (GFA)

**Website:** [greenfreightacademy.co.za](https://greenfreightacademy.co.za)

GFA is a B2B training platform that enables transport companies to deploy professional driver training programmes at scale. Companies register, import their drivers, pay via Paystack, and deploy training through the BetterDriver LMS. This repository contains the full source code for the GFA platform.

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
  dashboard/                  # Client dashboard pages
    bulletins/                # CPD bulletin creation and management
    campaigns/                # Bulletin campaign management
    import/                   # Driver CSV import
    reports/                  # Training reports
  programmes/                 # Public programme listing
  pricing/                    # Public pricing page
  publications/               # CPD publications library
  registry/                   # Public driver registry
  login/ register/ trial/     # Auth and onboarding
  about/ contact/ privacy/ terms/ cpd-bulletins/
components/                   # Shared React components
lib/                          # Utilities, constants, Supabase client
public/                       # Static assets
```

---

## Local Development

```bash
git clone https://github.com/Abdool11/greenfreightacademy.git
cd greenfreightacademy
npm install
cp .env.local.example .env.local
# Fill in .env.local values
# Run supabase-setup.sql against your Supabase project
npm run dev
```

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
| `RESEND_API_KEY` | Yes | Resend API key for transactional emails |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Meta Graph API token for WhatsApp nudges |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | WhatsApp Business phone number ID |
| `MOODLE_URL` | Optional | Base URL of the Moodle instance |
| `MOODLE_TOKEN` | Optional | Moodle REST API token |
| `MOODLE_DRIVER_PROGRAMME_COURSE_ID` | Optional | Moodle course ID for Professional Driver programme |
| `MOODLE_ECO_DRIVER_COURSE_ID` | Optional | Moodle course ID for Eco-Driver programme |
| `BD_BASE_URL` | Yes | BetterDriver site URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Full URL of this site in production |

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

### Step-by-Step Workflow

1. Create a branch from `main`: `git checkout -b feature/your-feature-name`
2. Make changes and commit: `git commit -m "feat: describe what changed and why"`
3. Push the branch: `git push origin feature/your-feature-name`
4. Open a Pull Request on GitHub against `main`
5. Review the diff — GitHub flags any conflicts before merge
6. Approve and merge to `main`
7. Delete the feature branch after merging

---

## Deployment

Packaged as a standalone tar.gz including `server.js`, `pm2.config.js`, `nginx.conf`, `deploy.sh`, `QUICK-START-CARD.md`, and `.env.local.example`.

> **Important:** The Nginx config must include a `location /_next/static/` block. Without this the site loads without any styling. This is already included in the provided `nginx.conf`.

---

## Related Repositories

| Site | Repository |
| :--- | :--- |
| Transport Action Group | [Abdool11/transportactiongroup](https://github.com/Abdool11/transportactiongroup) |
| BetterDriver | [Abdool11/betterdriver](https://github.com/Abdool11/betterdriver) |
