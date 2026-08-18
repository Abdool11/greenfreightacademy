# 03 — Environment and External Configuration

Configure environment values in the **Vercel Project Settings → Environment Variables** area for the correct preview or production environment. Do not commit a real `.env.local` file, tokens or private keys.

## GFA release variables

| Variable | Required for | Initial value | When to enable / use |
|---|---|---|---|
| `BD_EVENT_SECRET` | Signed BetterDriver/Moodle learning-event receiver | Long random shared secret | Set before R6 event testing; configure the same secret at the trusted sender. |
| `CRON_SECRET` | Protected compliance lifecycle endpoint | Long random secret | Set before any lifecycle test. Never place it in a public URL or client code. |
| `ENABLE_R6_EVENT_INGEST` | R6 learning events | `false` | Change to `true` only after a valid signed test event succeeds. |
| `ENABLE_R7_LIFECYCLE_CRON` | Annual RTMS review reminders and stale-quote archive | `false` | Change to `true` only after the protected dry-run/test call has been checked. |
| `ENABLE_EVIDENCE_REPORTS` | Evidence snapshot and controlled PDF workflow | `false` | Change to `true` after a test client can generate and validate a report. |
| `ENABLE_EFT_RECONCILIATION_V2` | Enhanced EFT reconciliation workflow | `false` | Change to `true` only after finance has tested confirm, clarification and rejection. |

Generate each secret locally, then store it in Vercel:

```bash
openssl rand -hex 32
```

## BetterDriver release variables

| Variable | Required for | Initial value | When to enable / use |
|---|---|---|---|
| `VAPID_PUBLIC_KEY` | Server push-notification setup | Generated public VAPID key | Set with the paired private key; never expose the private key. |
| `VAPID_PRIVATE_KEY` | Server push-notification setup | Generated private VAPID key | Store only as a server-side Vercel secret. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser subscription request | Same value as `VAPID_PUBLIC_KEY` | This is the only VAPID value permitted in browser code. |
| `ENABLE_PUSH_NOTIFICATIONS` | Driver opt-in push capability | `false` | Change to `true` after real-device opt-in and fallback verification. |

## External configuration checklist

| System | Required release action | Evidence to record |
|---|---|---|
| Vercel — GFA | Add the GFA variables above to Preview first, then Production only after acceptance. | Screenshot or confirmation of variable names, never their values. |
| Vercel — BetterDriver | Add VAPID values and the push flag to Preview first. | Screenshot or confirmation of names. |
| Meta WhatsApp | Submit/confirm the approved Utility templates `bd_driver_onboarding` and `bd_reaccess_link`. | Meta template status is **Approved**. |
| BetterDriver/Moodle sender | Configure the trusted sender to use the same `BD_EVENT_SECRET` and correct GFA endpoint. | One successful signed test event, then no duplicate after a resend. |
| Lifecycle scheduler | Call the GFA lifecycle endpoint with `x-cron-secret` only after its flag is enabled. Configure the final schedule after test success. | Test response and release-status entry. |
| GFA supplier settings | In the GFA admin UI, enter legal name, address, VAT (if applicable), bank account holder, account type, branch and quote terms. | Formal preview quote checked by finance. |

## Feature-flag rule

> Flags are a release safety brake, not a permanent substitute for testing. Change one flag at a time, redeploy, run its test journey, then record the result before moving to the next capability.

To deactivate an activated capability, change only its flag back to `false` in Vercel, redeploy, and record why in `RELEASE-STATUS.md`. This is the preferred first rollback for R6, R7 and push functionality.
