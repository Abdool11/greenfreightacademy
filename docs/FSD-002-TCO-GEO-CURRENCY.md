# Feature Specification Document (FSD)
## TAG Ecosystem — TCO Calculator Enhancements: Geo-IP Currency, Fleet Multiplier, and CO₂ Metric

> **Status:** Implemented (09 May 2026)
> **Repo(s):** TAG
> **Author:** Manus AI
> **Date:** 2026-05-07 (updated 2026-05-09)
> **Estimated dev time:** 6 hours (completed)
> **Implemented by:** Manus

---

## 1. Summary

This FSD covers three enhancements implemented together on 09 May 2026 in `TCOCalculatorPageClient.tsx`.

**Enhancement 1 — Geo-IP Currency Auto-Detection:** Automatically detects the user's country via a client-side call to `ipapi.co` and defaults the currency dropdown to their local currency. This removes friction for users outside South Africa (e.g., Kenya, Tanzania, Europe) by immediately presenting the financial model in a format they understand, while still allowing them to manually override the selection. Note: implemented as a client-side fetch (not Vercel headers) to support VPS deployment.

**Enhancement 2 — Fleet Size Multiplier:** A stepper control (−/+, default 1, max 500) in the TCO Summary card allows users to specify their fleet size. The lifetime cost saving and CO₂ saving figures are multiplied by this fleet size, giving fleet managers an immediate whole-fleet impact figure without changing any per-truck calculation logic.

**Enhancement 3 — CO₂ Savings Metric:** An Environmental Impact panel in the TCO Summary card displays the tailpipe CO₂ saved by switching the fleet from diesel to electric, calculated as: `diesel litres consumed (lifetime) × 3.48 kg CO₂e/L`. This figure scales with the fleet size multiplier.

---

## 2. User Stories

> **As a** fleet operator visiting the TAG website from Kenya,
> **I want to** see the TCO calculator default to Kenyan Shillings (KES),
> **So that** I do not have to manually search for my currency before starting my calculation.

> **As a** fleet manager with 45 trucks,
> **I want to** enter my fleet size and see the total cost saving and CO₂ impact for my whole fleet,
> **So that** I can present a compelling business case for electrification to my board.

---

## 3. Acceptance Criteria

1. On page load, the system fetches the user's country code from `ipapi.co/json/`.
2. If the detected country matches a supported currency, the dropdown defaults to that currency and all default input values are converted.
3. If detection fails or times out (4s timeout), the page silently falls back to ZAR — no error shown.
4. The user can manually change the currency via the dropdown at any time.
5. The fleet size stepper defaults to 1 and accepts values from 1 to 500.
6. The cost saving banner displays the fleet-total saving when fleet > 1, with the truck count shown in parentheses.
7. The CO₂ metric displays the fleet-total CO₂ saved when fleet > 1.
8. The per-truck TCO boxes (Diesel TCO / Electric TCO) are never multiplied — they always show per-truck figures.

---

## 4. Database Changes

None. This is a purely frontend feature.

---

## 5. API Routes

None. The geo-IP detection uses a direct client-side fetch to `ipapi.co/json/`.

---

## 6. Pages and Components Modified

| File | What Changed |
| :--- | :--- |
| `app/tco-calculator/TCOCalculatorPageClient.tsx` | Added `COUNTRY_CURRENCY` map, `fleetSize` state, `co2SavedMt` derived value, geo-IP `useEffect`, fleet stepper JSX, CO₂ panel JSX, fleet-scaled saving banner |

---

## 7. Environment Variables

None.

---

## 8. CO₂ Calculation Methodology

The CO₂ saving is calculated as the total diesel fuel that would have been consumed by the diesel truck over its full vehicle life, multiplied by the IPCC Tier 1 emission factor for diesel combustion:

```
dieselTotalLitres = (monthlyKm × 12 × vehicleLifeYears / 100) × fuelConsumption (L/100km)
co2SavedKg = dieselTotalLitres × 3.48
co2SavedMt = co2SavedKg / 1,000,000
```

The factor `3.48 kg CO₂e/L` is the well-to-wheel emission factor for diesel fuel (IPCC AR6, 2021). This is a conservative estimate — actual savings may be higher depending on the electricity grid carbon intensity.

---

## 9. Files Checklist

### Modified
- [x] `app/tco-calculator/TCOCalculatorPageClient.tsx`

---

## 10. Notes for Asif

- The geo-IP detection uses `ipapi.co/json/` with a 4-second timeout. This service allows 1,000 free requests per day. At current traffic levels this is more than sufficient. If traffic grows significantly, consider caching the country code in `localStorage` with a 24-hour TTL.
- The fleet multiplier only scales the **summary display** — it does not affect the year-by-year table or the cumulative chart, which remain per-truck. This is intentional.
- The CO₂ factor (3.48 kg CO₂e/L) is hardcoded. If you need to update this, it is on line ~531 of `TCOCalculatorPageClient.tsx`.
