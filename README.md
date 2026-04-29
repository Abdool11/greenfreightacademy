# GreenFreightAcademy — Frontend Package

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui  
**Role in ecosystem:** Enterprise capability and performance engine for road freight operators  
**Audience:** Fleet operators, transport company owners, HR and training managers, procurement teams  
**Handoff to:** Asif (backend, API layer, Supabase, Moodle middleware, Vercel deployment)

---

## Quick Start

```bash
cp .env.example .env.local
# Fill in .env.local values
npm install
npm run dev
```

---

## File Structure

```
app/                          → Page routes (App Router)
  page.tsx                    → Homepage (12 sections)
  layout.tsx                  → Root layout with Navigation + Footer
  loading.tsx                 → Root loading state
  error.tsx                   → Root error boundary
  not-found.tsx               → 404 page
  about/                      → About GFA
  programmes/                 → Programme catalogue (6 programmes)
  pricing/                    → Pricing page
  contact/                    → Enquiry form
  registry/                   → Public driver registry (stub)
  login/                      → Company login (stub)
  register/                   → Company registration (stub)
  dashboard/
    page.tsx                  → Company dashboard — metrics + enrolment grid
    import/                   → CSV employee import
    career-planner/           → Career path planner
    cpd-submission/           → CPD incident submission form
    reports/                  → Reports download (stub)

components/
  layout/
    Navigation.tsx            → Top navigation with logo, links, auth state
    Footer.tsx                → Footer with ecosystem links

lib/
  constants.ts                → All static data — programmes, pricing, mock employees, nav links

types/
  index.ts                    → All TypeScript interfaces

.env.example                  → All required environment variables
```

---

## Component Inventory

| Component | File | Props | Data source |
|---|---|---|---|
| Navigation | `components/layout/Navigation.tsx` | `user?: User` | TODO: Supabase session |
| Footer | `components/layout/Footer.tsx` | none | Static — `FOOTER_LINKS` |
| Homepage | `app/page.tsx` | none | `DEMO_METRICS` (TODO: `/api/metrics`) |
| Programmes | `app/programmes/page.tsx` | none | Static — `PROGRAMMES` |
| Pricing | `app/pricing/page.tsx` | none | Static — `PROGRAMMES` |
| Contact form | `app/contact/page.tsx` | URL params: `?type=`, `?programme=` | TODO: `/api/submit-enquiry` |
| Dashboard | `app/dashboard/page.tsx` | none | `MOCK_EMPLOYEES` (TODO: `/api/company/*`) |
| Import | `app/dashboard/import/page.tsx` | none | TODO: `/api/company/import-employees` |
| Career planner | `app/dashboard/career-planner/page.tsx` | none | Static — `CAREER_PATHWAYS` |
| CPD submission | `app/dashboard/cpd-submission/page.tsx` | none | TODO: `/api/cpd-submission` + Paystack |

---

## Data Flow

### Academy Impact Strip (Homepage)
```
Frontend (client-side fetch)
  → GET /api/metrics
  → Returns: { seatsBooked, certificationsCompleted, companiesEnrolled, lastUpdated, dataSource }
  → Falls back to DEMO_METRICS if fetch fails or dataSource === "demo"
```

### Enquiry Form
```
Contact page form submit
  → Server Action → POST /api/submit-enquiry
  → Payload: { type, organisationName, organisationRole, name, email, mobile, fleetSize?, message }
  → Supabase: INSERT into enquiry_submissions
  → Edge function: send email notification to admin
```

### Employee Import
```
Dashboard import page
  → GET /api/company/template → CSV download
  → POST /api/company/import-employees (multipart/form-data)
  → Supabase: INSERT employees into company_employees table
  → Returns: { imported: number, errors: ImportError[] }
```

### Bulk Enrolment
```
Dashboard enrolment grid
  → User selects employees + programme → clicks "Enrol selected"
  → POST /api/bulk-enroll
  → Payload: { employeeIds: string[], programmeId: string }
  → Moodle middleware: create enrolments
  → Supabase: log enrolment records
  → Paystack: initiate payment if applicable
```

### CPD Submission
```
CPD submission form
  → POST /api/cpd-submission
  → Payload: { companyId, incidentTitle, incidentDescription, mitigation, visibility, dispatch }
  → Supabase: INSERT into cpd_submissions
  → If dispatch === "urgent": redirect to Paystack for URGENT_CPD_FEE_ZAR
  → On payment success: mark urgent_fee_paid = true, notify admin
  → Edge function: email notification to admin
```

---

## Supabase Schema (Required Tables)

### enquiry_submissions
```sql
CREATE TABLE enquiry_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- fleet-company | individual-learner | partnership | general
  organisation_name TEXT NOT NULL,
  organisation_role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  fleet_size TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### company_employees
```sql
CREATE TABLE company_employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  mobile TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### enrolments
```sql
CREATE TABLE enrolments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES company_employees(id),
  programme_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enrolled', -- enrolled | in-progress | certified
  progress_percent INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  cpd_completions INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### cpd_submissions
```sql
CREATE TABLE cpd_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  incident_title TEXT NOT NULL,
  incident_description TEXT NOT NULL,
  mitigation TEXT NOT NULL,
  visibility TEXT NOT NULL, -- anonymous | confidential
  dispatch TEXT NOT NULL, -- urgent | standard
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted | under_review | accepted | in_development | published
  urgent_fee_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Moodle API Endpoints Required

Asif to request access to or document these endpoints:

| Endpoint | Purpose |
|---|---|
| `core_course_get_courses` | Fetch course catalogue |
| `enrol_manual_enrol_users` | Enrol a user in a course |
| `core_completion_get_course_completion_status` | Get completion status for a user |
| `core_user_create_users` | Create a Moodle user account |
| `gradereport_user_get_grade_items` | Get grades/assessment results |

---

## Authentication Flow (Supabase Auth)

1. Company registers at `/register` → Supabase creates user + company record
2. Company logs in at `/login` → Supabase session cookie set
3. Dashboard routes check for session → redirect to `/login` if none
4. `ctx.user.companyId` available in all authenticated routes
5. Company self-service: import employees, select programmes, make payment, view reports

---

## Mock Data

All mock data is in `lib/constants.ts` and clearly marked with `// TODO: Asif to replace`.

- `DEMO_METRICS`: 152 seats booked, 127 certifications (84% completion) — derived from AutoCarriers (89) + KDG (63) driver registers
- `MOCK_EMPLOYEES`: 5 employees with varied enrolment states for dashboard UI demonstration

---

## TODO: Asif Integration Checklist

- [ ] Implement Supabase Auth (company registration, login, session)
- [ ] Protect dashboard routes with auth middleware
- [ ] Build `/api/metrics` endpoint with Supabase query + caching
- [ ] Build `/api/submit-enquiry` with Supabase insert + email notification
- [ ] Build `/api/company/employees` — fetch employees for authenticated company
- [ ] Build `/api/company/import-employees` — CSV parse + Supabase insert
- [ ] Build `/api/bulk-enroll` — Moodle enrolment + Supabase audit log
- [ ] Build `/api/cpd-submission` — Supabase insert + Paystack redirect for urgent
- [ ] Build `/api/reports` — aggregated progress data, downloadable CSV/PDF
- [ ] Build Moodle middleware layer (sanitize, cache, log)
- [ ] Wire Navigation auth state to Supabase session
- [ ] Implement Paystack payment for urgent CPD fee and programme enrolments
- [ ] Build driver registry search at `/registry`
- [ ] Set `NEXT_PUBLIC_DATA_SOURCE=live` when all endpoints are connected
