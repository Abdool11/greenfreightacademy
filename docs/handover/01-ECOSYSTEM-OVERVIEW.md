# TAG Ecosystem — Overview & Feature Inventory

This document provides a complete map of the Transport Action Group (TAG) ecosystem. It defines what each platform does, how they connect, and lists every feature, page, and API route that has been built.

## 1. The Ecosystem Architecture

The ecosystem consists of three separate Next.js applications that share a single Supabase PostgreSQL database.

### Transport Action Group (TAG)
* **URL:** `transportactiongroup.co.za`
* **Role:** The public face of the initiative. Facilitates DFI visibility, funding, and policy support.
* **Target Audience:** Development Finance Institutions (DFIs), government bodies, large shippers.
* **Key Features:** Public informational pages, contact enquiries, TCO calculator submissions.

### Green Freight Academy (GFA)
* **URL:** `greenfreightacademy.co.za`
* **Role:** The B2B commercial engine. Focuses on reducing risk and increasing profits for road freight companies.
* **Target Audience:** Fleet owners, transport managers, HR directors.
* **Key Features:** Company registration, automated quoting (Paystack integration), driver cohort deployment, trial vouchers, CRM/lead management, campaign broadcasting.

### BetterDriver (BD)
* **URL:** `betterdriver.co.za`
* **Role:** The B2C driver development portal. Optimises the driver's journey for program enrollment, training, and certification.
* **Target Audience:** Truck drivers.
* **Key Features:** Magic link authentication, Moodle LMS integration, WhatsApp notifications, multi-language support (English/isiZulu), CPD tracking, certificate generation.

---

## 2. Shared Infrastructure

### Database (Supabase)
All three platforms connect to the same Supabase project. This allows GFA to deploy drivers directly into the `drivers` table, which BD then reads from when the driver logs in.

### Authentication
* **TAG Admin:** Custom JWT implementation (`tag_admins` table).
* **GFA Admin:** Custom JWT implementation (`gfa_admins` table).
* **GFA Company:** Custom JWT implementation (`companies` table).
* **BD Admin:** Custom JWT implementation (`bd_admins` table).
* **BD Driver:** Passwordless Magic Link via WhatsApp/Email (`driver_invitations` table) resolving to a JWT session.

---

## 3. Feature Inventory: TAG

### Public Pages
* `/` - Home page
* `/about` - About TAG
* `/services` - Services offered
* `/contact` - Contact form (saves to `enquiries` table, sends email via Brevo)
* `/tco-calculator` - Total Cost of Ownership calculator (saves to `tco_submissions` table)

### Admin Portal (`/admin`)
* `/admin/login` - Admin authentication
* `/admin/dashboard` - Overview metrics
* `/admin/enquiries` - View contact submissions
* `/admin/tco-submissions` - View TCO calculator submissions
* `/admin/settings` - Manage site configuration

### API Routes
* `/api/contact` - Handle contact form submissions
* `/api/tco` - Handle TCO calculator submissions
* `/api/admin/auth/login` - Admin login
* `/api/admin/auth/logout` - Admin logout
* `/api/admin/enquiries` - Fetch enquiries
* `/api/admin/tco` - Fetch TCO submissions

---

## 4. Feature Inventory: GFA

### Public Pages
* `/` - Home page
* `/programmes` - Training programmes overview
* `/pricing` - Pricing information
* `/contact` - Contact form
* `/auth/login` - Company login
* `/auth/register` - Company registration
* `/trial/[voucherId]` - Trial voucher redemption

### Company Portal (`/portal`)
* `/portal/dashboard` - Company overview
* `/portal/quote` - Generate a training quote
* `/portal/deploy` - Deploy a cohort of drivers (triggers WhatsApp magic links)
* `/portal/drivers` - View deployed drivers and their progress
* `/portal/certificates` - Download driver certificates
* `/portal/settings` - Company profile settings

### Admin Portal (`/admin`)
* `/admin/login` - Admin authentication
* `/admin/dashboard` - System metrics
* `/admin/companies` - Manage registered companies
* `/admin/cohorts` - Approve and manage driver cohorts
* `/admin/leads` - CRM: Manage prospect leads
* `/admin/vouchers` - Manage trial vouchers
* `/admin/campaigns` - Broadcast campaigns via Email/WhatsApp
* `/admin/bulletins` - Manage industry bulletins
* `/admin/cpd` - Manage CPD library and pushes
* `/admin/settings` - System configuration

### API Routes (Key Endpoints)
* `/api/auth/*` - Company authentication
* `/api/admin/auth/*` - Admin authentication
* `/api/company/quote` - Generate quotes
* `/api/company/deploy` - Process cohort deployments
* `/api/admin/cohorts/approve` - Approve cohorts and dispatch magic links
* `/api/admin/campaigns` - Send broadcast campaigns
* `/api/trial/activate` - Process trial voucher redemption

---

## 5. Feature Inventory: BetterDriver (BD)

### Public Pages
* `/` - Home page
* `/start` - Driver activation entry point
* `/verify/[certId]` - Public certificate verification

### Driver Portal (`/portal`)
* `/portal/language` - Language selection (English/isiZulu)
* `/portal/welcome` - Onboarding video and welcome
* `/portal/dashboard` - Driver overview and progress
* `/portal/tasks` - Pending training tasks
* `/portal/course` - Course modules (deep links to Moodle)
* `/portal/progress` - Detailed progress metrics
* `/portal/certificate` - View and download certificates
* `/portal/cpd` - Continuous Professional Development history
* `/portal/bulletins` - View industry bulletins
* `/portal/profile` - Update CV and personal details
* `/portal/support` - Help and FAQ

### Admin Portal (`/admin`)
* `/admin/login` - Admin authentication
* `/admin/dashboard` - System metrics
* `/admin/drivers` - Manage drivers
* `/admin/bulletins` - Manage bulletins
* `/admin/settings` - System configuration

### API Routes (Key Endpoints)
* `/api/join/[token]` - Resolve magic link and create session
* `/api/activate` - Process driver activation (creates Moodle user)
* `/api/portal/profile` - Update driver profile
* `/api/moodle/webhook` - Receive progress updates from Moodle
* `/api/moodle/poll` - Cron job to poll Moodle for progress
* `/api/moodle/inactivity-check` - Cron job to send WhatsApp nudges
