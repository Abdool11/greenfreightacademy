# Feature Specification Document (FSD)
## TAG Ecosystem — Driver Pre and Post Survey System

> **Status:** Draft
> **Repo(s):** BD / GFA
> **Author:** Manus AI
> **Date:** 2026-05-07
> **Estimated dev time:** 16 hours

---

## 1. Summary

This feature introduces a mandatory pre-course and post-course survey system for drivers on the BetterDriver platform. Before a driver can begin their first Moodle module, they must complete a baseline survey assessing their current knowledge, attitudes, and driving habits. Upon completing all modules and before receiving their certificate, they must complete a post-course survey. The data collected will be aggregated and displayed on the GFA company dashboard to demonstrate the measurable impact and ROI of the training campaign to the client.

---

## 2. User Story

> **As a** driver
> **I want to** complete a quick survey before and after my training
> **So that** I can unlock my course content and my final certificate.

> **As a** GFA company admin
> **I want to** see aggregated pre- and post-survey results for my cohort
> **So that** I can measure the actual shift in driver knowledge and attitude resulting from the training investment.

---

## 3. Acceptance Criteria

1. A driver logging into BetterDriver for the first time cannot access Moodle courses until the pre-survey is submitted.
2. A driver who has completed all Moodle courses cannot download their certificate until the post-survey is submitted.
3. Survey questions and answers must be fully translatable (English and isiZulu).
4. Survey responses must be stored securely in Supabase, linked to the specific `driver_id` and `cohort_id`.
5. The GFA company dashboard must include a new "Impact & ROI" tab that displays aggregated survey results (e.g., average score shift) for completed cohorts.
6. Survey data must be exportable to CSV by GFA admins.

---

## 4. Database Changes

### New Tables

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| `surveys` | Defines the survey structure and questions | `id`, `type` (pre/post), `question_en`, `question_zu`, `options_json` |
| `survey_responses` | Stores individual driver answers | `id`, `driver_id`, `cohort_id`, `survey_id`, `responses_json`, `created_at` |

### Altered Tables (ADD COLUMN)

| Table | Column | Type | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `drivers` | `pre_survey_completed` | `BOOLEAN` | `false` | Gates access to Moodle |
| `drivers` | `post_survey_completed` | `BOOLEAN` | `false` | Gates access to certificate |

### Migration File to Create

```
supabase/migrations/YYYYMMDD_driver_surveys.sql
```

**Rule:** This file MUST be created and appended to `ALL_MIGRATIONS_RUN_ONCE.sql` before any code that uses the new columns is written.

---

## 5. API Routes

| Method | Route | File Path | Purpose | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/portal/surveys` | `app/api/portal/surveys/route.ts` | Fetch survey questions | Driver session |
| `POST` | `/api/portal/surveys/submit` | `app/api/portal/surveys/submit/route.ts` | Submit driver answers | Driver session |
| `GET` | `/api/company/cohorts/[id]/impact` | `app/api/company/cohorts/[id]/impact/route.ts` | Fetch aggregated survey data | GFA Company Admin |

---

## 6. Pages and Components

### New Pages

| Page | File Path | Purpose | Auth Guard |
| :--- | :--- | :--- | :--- |
| BD Pre-Survey | `app/portal/survey/pre/page.tsx` | Driver completes baseline survey | Driver session |
| BD Post-Survey | `app/portal/survey/post/page.tsx` | Driver completes final survey | Driver session |

### Modified Pages

| Page | File Path | What Changes |
| :--- | :--- | :--- |
| BD Dashboard | `app/portal/page-client.tsx` | Add logic to redirect to pre-survey if `pre_survey_completed` is false. |
| BD Certificate | `app/portal/certificate/page-client.tsx` | Add logic to block download and redirect to post-survey if `post_survey_completed` is false. |
| GFA Cohort Detail | `app/dashboard/cohorts/[id]/page.tsx` | Add "Impact & ROI" tab displaying aggregated survey charts. |

### New Components

| Component | File Path | Purpose |
| :--- | :--- | :--- |
| `SurveyForm` | `components/portal/SurveyForm.tsx` | Reusable form component for rendering questions and capturing answers. |
| `ImpactChart` | `components/dashboard/ImpactChart.tsx` | Recharts component for displaying pre vs post score comparisons. |

---

## 7. Environment Variables

None.

---

## 8. Third-Party Integrations

None.

---

## 9. Translation Requirements

| Text / Label | English | isiZulu |
| :--- | :--- | :--- |
| Pre-survey title | "Before We Begin" | "Ngaphambi Kokuba Siqale" |
| Post-survey title | "Course Feedback" | "Impendulo Yezifundo" |
| Submit button | "Submit Answers" | "Thumela Izimpendulo" |

*(Note: Actual survey questions will be stored in the database and must include both EN and ZU fields).*

---

## 10. Files Checklist

### Created
- [ ] `supabase/migrations/YYYYMMDD_driver_surveys.sql`
- [ ] `app/api/portal/surveys/route.ts`
- [ ] `app/api/portal/surveys/submit/route.ts`
- [ ] `app/api/company/cohorts/[id]/impact/route.ts`
- [ ] `app/portal/survey/pre/page.tsx`
- [ ] `app/portal/survey/post/page.tsx`
- [ ] `components/portal/SurveyForm.tsx`
- [ ] `components/dashboard/ImpactChart.tsx`

### Modified
- [ ] `ALL_MIGRATIONS_RUN_ONCE.sql`
- [ ] `app/portal/page-client.tsx`
- [ ] `app/portal/certificate/page-client.tsx`
- [ ] `app/dashboard/cohorts/[id]/page.tsx`

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

- The new `surveys` table will need to be seeded with the actual questions before the feature goes live. A seed script (`seed_surveys.sql`) will be provided alongside the migration.
- Ensure the GFA company dashboard charts render correctly when a cohort has zero responses (handle empty states gracefully).
