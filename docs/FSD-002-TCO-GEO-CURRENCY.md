# Feature Specification Document (FSD)
## TAG Ecosystem — TCO Calculator Geo-IP Currency Auto-Detection

> **Status:** Draft
> **Repo(s):** TAG
> **Author:** Manus AI
> **Date:** 2026-05-07
> **Estimated dev time:** 6 hours

---

## 1. Summary

This feature enhances the Total Cost of Ownership (TCO) calculator on the TAG website by automatically detecting the user's country via their IP address and defaulting the currency dropdown to their local currency. This removes friction for users outside South Africa (e.g., Kenya, Tanzania, Europe) by immediately presenting the financial model in a format they understand, while still allowing them to manually override the selection if desired.

---

## 2. User Story

> **As a** fleet operator visiting the TAG website from Kenya
> **I want to** see the TCO calculator default to Kenyan Shillings (KES)
> **So that** I do not have to manually search for my currency before starting my calculation.

---

## 3. Acceptance Criteria

1. When a user loads the `/tco-calculator` page, the system must detect their country code via IP address.
2. If the detected country matches a supported currency (ZAR, KES, TZS, ETB, EUR, USD), the dropdown must default to that currency.
3. If the detected country does not match a supported currency, the dropdown must default to USD.
4. The user must still be able to manually change the currency via the dropdown.
5. The auto-detection must happen server-side (via Vercel headers) or instantly on the client to prevent a visible "flicker" of the currency changing after load.

---

## 4. Database Changes

None. This is a purely frontend and edge-compute feature.

---

## 5. API Routes

| Method | Route | File Path | Purpose | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/geo` | `app/api/geo/route.ts` | Returns the user's country code based on the `x-vercel-ip-country` header. | None |

---

## 6. Pages and Components

### Modified Pages

| Page | File Path | What Changes |
| :--- | :--- | :--- |
| TCO Calculator Client | `app/tco-calculator/TCOCalculatorPageClient.tsx` | Add a `useEffect` hook to fetch the geo-location on mount and set the initial `currency` state. |

---

## 7. Environment Variables

None.

---

## 8. Third-Party Integrations

| Service | Purpose | API Docs | Credentials Needed |
| :--- | :--- | :--- | :--- |
| Vercel Edge Network | IP Geolocation | [Vercel Headers](https://vercel.com/docs/edge-network/headers) | None (built into Vercel hosting) |

---

## 9. Translation Requirements

None — admin-facing only.

---

## 10. Files Checklist

### Created
- [ ] `app/api/geo/route.ts`

### Modified
- [ ] `app/tco-calculator/TCOCalculatorPageClient.tsx`

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

- This feature relies on the `x-vercel-ip-country` header. If the TAG site is ever moved off Vercel to a standard Ubuntu VPS with Nginx, this header will not exist. In that scenario, Nginx must be configured with the GeoIP2 module to inject the header, or the API route must be rewritten to use a third-party service like `ipapi.co`.
