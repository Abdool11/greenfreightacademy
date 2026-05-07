# Feature Specification Document (FSD)
## TAG Ecosystem — Certificate Auto-Generation and PDF Download

> **Status:** Draft
> **Repo(s):** BD
> **Author:** Manus AI
> **Date:** 2026-05-07
> **Estimated dev time:** 8 hours

---

## 1. Summary

This feature completes the driver certification loop. When a driver finishes their final Moodle module, the system will automatically generate a unique certificate record in the database. When the driver clicks "Download PDF" on their portal, the system will dynamically generate a high-quality, printable PDF certificate using a pre-designed template, populate it with their specific details, and serve it for download. The certificate page will also be wired to display live data instead of mock data.

---

## 2. User Story

> **As a** driver who has just completed my training
> **I want to** see my real certificate details on my portal and download a formal PDF version
> **So that** I can prove my professional qualification to my employer or future employers.

---

## 3. Acceptance Criteria

1. The Moodle webhook (`/api/moodle/webhook`) must automatically `INSERT` a new row into the `certifications` table when a driver completes a programme.
2. The certificate number must be auto-generated in the format `BD-YYYY-XXXXX` (e.g., BD-2026-00127).
3. The `/portal/certificate` page must query the `certifications` table and display the driver's actual live data, removing the `MOCK_CERTIFICATE` constant.
4. A new API route (`/api/certificate/download`) must generate a PDF on the fly using `pdf-lib` or `puppeteer`/`playwright` (or similar PDF generation library).
5. The generated PDF must match the provided visual design template, injecting the driver's name, programme name, issue date, and certificate number.
6. The "Download PDF" button on the portal must trigger this download.

---

## 4. Database Changes

None. The `certifications` table already exists with all required columns (`driver_id`, `certificate_number`, `programme`, `issued_at`, `status`, `pdf_url`).

---

## 5. API Routes

| Method | Route | File Path | Purpose | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/moodle/webhook` | `app/api/moodle/webhook/route.ts` | (Modify existing) Add logic to insert into `certifications` table upon programme completion. | Moodle Secret |
| `GET` | `/api/certificate/download` | `app/api/certificate/download/route.ts` | (New) Generate and return the PDF file. | Driver session |

---

## 6. Pages and Components

### Modified Pages

| Page | File Path | What Changes |
| :--- | :--- | :--- |
| BD Certificate | `app/portal/certificate/page.tsx` | Remove mock data. Add Supabase server-side query to fetch the active certification. Wire up the Download button to the new API route. |

---

## 7. Environment Variables

None required for basic PDF generation, unless a third-party PDF API (like PDFShift or DocRaptor) is chosen over a local library.

---

## 8. Third-Party Integrations

None.

---

## 9. Translation Requirements

None — the certificate itself will be issued in English as it is a formal professional credential.

---

## 10. Files Checklist

### Created
- [ ] `app/api/certificate/download/route.ts`
- [ ] `public/templates/certificate-bg.png` (The blank design template)

### Modified
- [ ] `app/api/moodle/webhook/route.ts`
- [ ] `app/portal/certificate/page.tsx`

---

## 11. Pre-Handover Audit

Before marking this feature complete, run the audit script and confirm:

```bash
python3 /home/ubuntu/scripts/tag-ecosystem-audit.py /path/to/repo
```

- [ ] 0 build errors
- [ ] All files in Section 10 are ticked
- [ ] All changes pushed to GitHub `main`

---

## 12. Notes for Asif

- The PDF generation approach is up to you. The simplest method in a Next.js App Router environment is often to use `@react-pdf/renderer` to draw text over a static background image (`certificate-bg.png`).
- Ensure the font used in the PDF supports all characters in South African names.
