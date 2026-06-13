# Feature Specification Document (FSD)
## TAG Ecosystem — [Feature Name]

> **Status:** Draft | In Review | Approved | In Development | Complete
> **Repo(s):** TAG / GFA / BD / Shared
> **Author:** [Name]
> **Date:** [YYYY-MM-DD]
> **Estimated dev time:** [X hours / X days]

---

## 1. Summary

A single paragraph describing what this feature does, why it is needed, and which users it affects. Written in plain English — no technical jargon. If you cannot explain it in one paragraph, the feature is not well enough defined to start building.

---

## 2. User Story

> **As a** [role — e.g., GFA admin / company HR user / driver]
> **I want to** [action — e.g., see a list of all drivers who have not started their course]
> **So that** [outcome — e.g., I can send them a WhatsApp reminder]

---

## 3. Acceptance Criteria

A numbered list of conditions that must be true for the feature to be considered complete. Each criterion must be testable — it should be possible to answer "yes" or "no" to whether it is met.

1. [Criterion 1]
2. [Criterion 2]
3. [Criterion 3]

---

## 4. Database Changes

List every change required to the database schema. If none, write "None."

### New Tables

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| `example_table` | Stores X | `id`, `driver_id`, `status`, `created_at` |

### Altered Tables (ADD COLUMN)

| Table | Column | Type | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `drivers` | `licence_class` | `TEXT` | `NULL` | Driver's licence category |
| `enrolments` | `modules_completed` | `INT` | `0` | Count of completed modules |

### Migration File to Create

```
supabase/migrations/YYYYMMDD_description.sql
```

**Rule:** This file MUST be created and appended to `ALL_MIGRATIONS_RUN_ONCE.sql` before any code that uses the new columns is written.

---

## 5. API Routes

List every API route that needs to be created or modified.

| Method | Route | File Path | Purpose | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/drivers` | `app/api/admin/drivers/route.ts` | List all drivers for admin | GFA Admin |
| `POST` | `/api/portal/profile` | `app/api/portal/profile/route.ts` | Update driver profile | Driver session |
| `PATCH` | `/api/admin/drivers/[id]` | `app/api/admin/drivers/[id]/route.ts` | Update driver record | GFA Admin |

---

## 6. Pages and Components

List every page, layout, and component that needs to be created or modified.

### New Pages

| Page | File Path | Purpose | Auth Guard |
| :--- | :--- | :--- | :--- |
| Driver inactivity report | `app/admin/inactivity/page.tsx` | Shows drivers with no activity in 7+ days | GFA Admin session |

### Modified Pages

| Page | File Path | What Changes |
| :--- | :--- | :--- |
| Portal dashboard | `app/portal/page-client.tsx` | Add "days since last login" metric card |

### New Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| `InactivityBadge` | `components/admin/InactivityBadge.tsx` | Displays a red/amber/green badge based on days inactive |
| `TranslatedPageHeader` | `components/portal/TranslatedPageHeader.tsx` | Reusable EN/ZU page heading |

---

## 7. Environment Variables

List every new environment variable this feature requires.

| Variable | Purpose | Where to Get It | Add to `.env.local.example` |
| :--- | :--- | :--- | :--- |
| `MOODLE_URL` | Base URL for Moodle API calls | Moodle admin → Site Admin → Server | Yes |
| `MOODLE_TOKEN` | Auth token for Moodle web services | Moodle admin → Web Services → Manage Tokens | Yes |

If no new env vars are needed, write "None."

---

## 8. Third-Party Integrations

List any external services this feature calls.

| Service | Purpose | API Docs | Credentials Needed |
| :--- | :--- | :--- | :--- |
| Moodle REST API | Enrol driver, poll completion | [Moodle Web Services](https://docs.moodle.org/dev/Web_services) | `MOODLE_URL`, `MOODLE_TOKEN` |
| Meta WhatsApp API | Send activation message | [Meta Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) | `META_WA_ACCESS_TOKEN`, `META_WA_PHONE_NUMBER_ID` |

---

## 9. Translation Requirements

Does this feature add any user-facing text that needs to be in both English and isiZulu?

| Text / Label | English | isiZulu |
| :--- | :--- | :--- |
| Page heading | "My Progress" | "Inqubekela Phambili" |
| Empty state | "No records yet." | "Akukho amarekhodi." |

If no translation is needed (admin-only feature), write "None — admin-facing only."

---

## 10. Files Checklist

This is the complete list of files that will be created or modified. Every item must be ticked before the feature is considered complete and before the pre-handover audit is run.

### Created
- [ ] `supabase/migrations/YYYYMMDD_description.sql`
- [ ] `app/api/[route]/route.ts`
- [ ] `app/[page]/page.tsx`
- [ ] `components/[Component].tsx`

### Modified
- [ ] `ALL_MIGRATIONS_RUN_ONCE.sql` (append new migration)
- [ ] `.env.local.example` (add new vars)
- [ ] `QUICK-START-CARD.md` (if setup steps change)
- [ ] `README.md` (update feature list)

---

## 11. Pre-Handover Audit

Before marking this feature complete, run the audit script and confirm:

```bash
python3 /home/ubuntu/scripts/tag-ecosystem-audit.py /path/to/repo
```

- [ ] 0 missing tables
- [ ] 0 missing columns
- [ ] 0 missing env vars
- [ ] 0 build errors
- [ ] 0 missing deployment files
- [ ] All files in Section 10 are ticked
- [ ] All changes pushed to GitHub `main`

---

## 12. Notes for Asif

Any instructions, warnings, or context Asif needs when deploying this feature. For example:

- "Run the migration before deploying the code — the new columns must exist before the API routes go live."
- "The `MOODLE_URL` env var must not have a trailing slash."
- "The first admin account must be seeded manually using the SQL in `QUICK-START-CARD.md` Step 4."
