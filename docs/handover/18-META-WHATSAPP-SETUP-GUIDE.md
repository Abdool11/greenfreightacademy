# Meta WhatsApp Setup — Step-by-Step Guide

> **What this covers:** Getting your Meta WhatsApp Business API fully connected so GFA can send magic links to drivers and BD can send training notifications.
> **Time needed:** ~20 minutes
> **Difficulty:** Easy (just copy-paste)

---

## What I Have Already Done For You (Code Side)

The following is already built and ready — you just need to configure Meta:

- **WhatsApp webhook endpoint** created at `app/api/webhook/whatsapp/route.ts`
  - Handles Meta verification challenge (GET)
  - Receives delivery status updates and inbound messages (POST)
  - Handles "STOP" opt-out from drivers
- **GFA deploy route** (`app/api/company/deploy/route.ts`) — sends magic links via WhatsApp when a company deploys training
- **BD inactivity cron** (`app/api/moodle/inactivity-check/route.ts`) — sends reminder WhatsApps to idle drivers
- **Environment variables** updated in both `.env.local` files with clear instructions

---

## Step 1: Get Your Meta Credentials

Go to the [Meta Developer Portal](https://developers.facebook.com/) → Your App → **WhatsApp** → **API Setup**

You need to copy **3 things**:

| Field | What to copy | Where in Meta |
|-------|-------------|---------------|
| **Permanent Access Token** | A long string like `EAA...` | API Setup → "Access Tokens" section |
| **Phone Number ID** | Digits only, e.g. `15551234567` | API Setup → "From" number |
| **App Secret** | Used for webhook signature verification (optional) | App Settings → Basic |

**IMPORTANT:** Use the **Permanent Token** (System User token), not the temporary "Test Token". Temporary tokens expire in 24 hours.

---

## Step 2: Fill In Your `.env.local` Files

You have **two** files to update. Use the **same values** in both.

### File 1: `greenfreightacademy/.env.local`

Replace these 5 lines (keep the other settings):

```env
WHATSAPP_ACCESS_TOKEN=PASTE_YOUR_PERMANENT_TOKEN_HERE
WHATSAPP_PHONE_NUMBER_ID=PASTE_YOUR_PHONE_NUMBER_ID_HERE
META_WA_TOKEN=PASTE_YOUR_PERMANENT_TOKEN_HERE
META_WA_PHONE_NUMBER_ID=PASTE_YOUR_PHONE_NUMBER_ID_HERE
META_WA_VERIFY_TOKEN=create_any_random_secret_text_here
```

### File 2: `betterdriver/.env.local`

Replace the **same 5 lines** with the **exact same values**.

> **Tip:** `META_WA_VERIFY_TOKEN` can be anything you want (e.g. `tag_whatsapp_2024_xyz123`). Just remember it — you need it in Step 4.

---

## Step 3: Create WhatsApp Message Templates in Meta

You **must** create and get Meta to approve these templates before the system can send messages. Copy-paste the text exactly — Meta is very strict.

Go to: Meta Business Manager → **WhatsApp Manager** → Your Number → **Templates** → **Create Template**

### Template 1: `gfa_driver_magic_link` (CRITICAL — send this first)

- **Category:** Utility
- **Language:** English (en)
- **Header:** None
- **Body:**

```
Account update for {{1}}:
{{2}} has enrolled you in the {{3}} programme.

Your unique access link is:
https://betterdriver.co.za/join/{{4}}

This link provides direct access to your account. Do not share it.
Reply STOP to opt out of future messages.
```

- **Footer:** None
- **Buttons:** None
- **Parameters:**
  - `{{1}}` = Driver's First Name
  - `{{2}}` = Company Name
  - `{{3}}` = Programme Name
  - `{{4}}` = Magic Link Token

> **Meta Compliance Note:** Do NOT change the text to say "Welcome", "Congratulations", or "Click here". Meta rejects promotional language in Utility templates. Keep it exactly as above.

### Templates 2–6 (BD notifications)

These are also required. Full text is in: `docs/handover/16-WHATSAPP-TEMPLATE-SPEC.md`

| Template Name | Purpose | Language(s) |
|---------------|---------|-----------|
| `bd_welcome_first_login` | Driver finishes onboarding | en, zu |
| `bd_module_complete` | Driver finishes a module | en, zu |
| `bd_inactivity_7day` | 7-day reminder | en, zu |
| `bd_inactivity_14day` | 14-day reminder | en, zu |
| `bd_programme_complete` | Driver graduates | en, zu |

**Approval time:** Usually 5–30 minutes for Utility templates. Check the "Status" column in WhatsApp Manager.

---

## Step 4: Configure the Webhook in Meta

This tells Meta where to send delivery updates and inbound messages.

1. In Meta Developer Portal → Your App → **WhatsApp** → **Configuration**
2. Scroll to **Webhooks** → Click **Edit**
3. Fill in:

| Field | Value |
|-------|-------|
| **Callback URL** | `https://www.greenfreightacademy.co.za/api/webhook/whatsapp` |
| **Verify Token** | The exact same text you put in `META_WA_VERIFY_TOKEN` |

4. Click **Verify and Save**
5. Then subscribe to these fields (tick the checkboxes):
   - `messages` — inbound messages from drivers
   - `message_template_status_update` — template approval status
   - `message_delivery_receipts` — delivery/read tracking

> **Note:** Your GFA site must be live for Meta to reach the webhook URL. If you get "URL unreachable", deploy first then come back to this step.

---

## Step 5: Test the Flow

Once templates are approved and env vars are set:

1. Register a company on GFA (use a real email + your own WhatsApp number as a test driver)
2. Create a quote → Pay (use Paystack test mode if needed)
3. Click **Deploy**
4. Check your phone — you should receive the magic link WhatsApp
5. Tap the link → should land on `betterdriver.co.za/join/{token}` → BD portal

---

## Troubleshooting

### "Message failed to send" in GFA deploy

| Cause | Fix |
|-------|-----|
| Template not approved yet | Wait for Meta approval (check WhatsApp Manager) |
| Wrong Access Token | Use **Permanent** token, not temporary test token |
| Phone Number ID wrong | Copy from "From" field in API Setup (digits only) |
| Number not registered | Complete the phone number verification in Meta |

### Webhook verification failed

| Cause | Fix |
|-------|-----|
| Site not deployed | Deploy GFA so Meta can reach the URL |
| Wrong verify token | Must match `META_WA_VERIFY_TOKEN` exactly |
| HTTPS issue | Meta requires HTTPS. Use the live domain, not localhost. |

### Drivers don't receive messages

| Cause | Fix |
|-------|-----|
| Mobile number format | The code auto-normalises `072...` → `2772...`, but double-check |
| Driver opted out | Check the `whatsapp_opted_out` flag in Supabase |
| Wrong template name | In Supabase `configs` table, set `whatsapp_magic_link_template` to `gfa_driver_magic_link` |

---

## Files You May Need to Reference

- `docs/handover/16-WHATSAPP-TEMPLATE-SPEC.md` — Full template text for all 6 templates
- `app/api/webhook/whatsapp/route.ts` — Webhook endpoint code
- `app/api/company/deploy/route.ts` — Where the magic link WhatsApp is sent
- `.env.local` (both GFA and BD) — Where you paste your credentials

---

## Quick Checklist

- [ ] Permanent Access Token copied from Meta
- [ ] Phone Number ID copied from Meta
- [ ] `greenfreightacademy/.env.local` updated (5 WhatsApp lines)
- [ ] `betterdriver/.env.local` updated (5 WhatsApp lines)
- [ ] `gfa_driver_magic_link` template created in Meta
- [ ] Template approved (status = "Active" in WhatsApp Manager)
- [ ] Webhook URL configured in Meta
- [ ] Webhook fields subscribed (messages, delivery receipts)
- [ ] GFA site deployed and live
- [ ] Test deploy sent to your own phone
