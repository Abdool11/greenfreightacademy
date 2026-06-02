# TAG Ecosystem — Master Environment Variable Reference

This document is the definitive reference for every environment variable used across the three platforms (TAG, GFA, BD). It is based on a static analysis of the codebase.

## 1. Supabase (Shared across all 3 platforms)

The ecosystem uses a single shared Supabase project. These three variables must be identical across all three `.env.local` files.

| Variable | Where to find it | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | The base URL for the Supabase REST API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | The public key embedded in the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | The secret key used by API routes to bypass RLS |

---

## 2. BetterDriver (BD)

| Variable | Where to find it | Purpose |
| :--- | :--- | :--- |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` | Signs driver session tokens (magic links) |
| `BD_JWT_SECRET` | Same as `JWT_SECRET` | Alias used in some auth routes |
| `MOODLE_URL` | Your Moodle domain (no trailing slash) | Base URL for Moodle API calls |
| `MOODLE_TOKEN` | Moodle → Plugins → Web Services | Token for Moodle API calls |
| `MOODLE_DRIVER_PROGRAMME_COURSE_ID` | Moodle course URL | ID for "Professional Truck Driver" course |
| `MOODLE_ECO_DRIVER_COURSE_ID` | Moodle course URL | ID for "Eco-Driver Training" course |
| `MOODLE_WEBHOOK_SECRET` | Moodle → Local plugins → BD Webhook | Authenticates incoming webhooks from Moodle |
| `MOODLE_POLL_SECRET` | Generate: `openssl rand -hex 32` | Authenticates the cron poll endpoint |
| `WHATSAPP_ACCESS_TOKEN` | Meta Developer Portal | Token for sending WhatsApp messages |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developer Portal | ID of the sending phone number |
| `META_WA_TOKEN` | Same as `WHATSAPP_ACCESS_TOKEN` | Alias used in some routes |
| `META_WA_PHONE_NUMBER_ID` | Same as `WHATSAPP_PHONE_NUMBER_ID` | Alias used in some routes |
| `META_WA_API_VERSION` | Set to `v19.0` | Meta Graph API version |
| `BUNNY_CDN_HOSTNAME` | Bunny.net → Stream → Library | Hostname for serving course videos |
| `NEXT_PUBLIC_BD_URL` | `https://betterdriver.co.za` | Public URL of the BD site |
| `NEXT_PUBLIC_GFA_URL` | `https://www.greenfreightacademy.co.za` | Public URL of the GFA site |
| `NEXT_PUBLIC_TAG_URL` | `https://www.transportactiongroup.com` | Public URL of the TAG site |
| `NEXT_PUBLIC_ZERO_AFRICA_URL` | `https://www.zeroafrica.org` | Public URL of the Zero Africa site |
| `NEXT_PUBLIC_LOGO_URL` | `https://betterdriver.co.za/logo.png` | URL of the BD logo |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@betterdriver.co.za` | Support email address |
| `NEXT_PUBLIC_SUPPORT_PHONE` | `+27 000 000 0000` | Support phone number |
| `PORT` | `3002` | Port for the BD server |

---

## 3. Green Freight Academy (GFA)

| Variable | Where to find it | Purpose |
| :--- | :--- | :--- |
| `ADMIN_JWT_SECRET` | Generate: `openssl rand -hex 32` | Signs admin session tokens |
| `JWT_SECRET` | Same as `ADMIN_JWT_SECRET` | Alias used in some routes |
| `GFA_JWT_SECRET` | Same as `ADMIN_JWT_SECRET` | Alias used in some routes |
| `WHATSAPP_ACCESS_TOKEN` | Meta Developer Portal | Token for sending WhatsApp messages |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developer Portal | ID of the sending phone number |
| `META_WA_TOKEN` | Same as `WHATSAPP_ACCESS_TOKEN` | Alias used in some routes |
| `META_WA_PHONE_NUMBER_ID` | Same as `WHATSAPP_PHONE_NUMBER_ID` | Alias used in some routes |
| `META_WA_API_VERSION` | Set to `v19.0` | Meta Graph API version |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard | Secret key for processing payments |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack Dashboard | Public key for Paystack checkout |
| `BUNNY_API_KEY` | Bunny.net Dashboard | API key for managing videos |
| `BUNNY_LIBRARY_ID` | Bunny.net Dashboard | ID of the video library |
| `BUNNY_STREAM_LIBRARY_ID` | Same as `BUNNY_LIBRARY_ID` | Alias used in some routes |
| `BUNNY_CDN_HOSTNAME` | Bunny.net Dashboard | Hostname for serving videos |
| `BREVO_SMTP_HOST` | `smtp-relay.brevo.com` | Brevo SMTP relay host |
| `BREVO_SMTP_PORT` | `587` | Brevo SMTP relay port |
| `BREVO_SMTP_LOGIN` | Brevo Dashboard → SMTP & API | Brevo SMTP login |
| `BREVO_SMTP_PASSWORD` | Brevo Dashboard → SMTP & API | Brevo SMTP password (Master Password) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.greenfreightacademy.co.za` | Public URL of the GFA site |
| `NEXT_PUBLIC_GFA_URL` | `https://www.greenfreightacademy.co.za` | Public URL of the GFA site |
| `NEXT_PUBLIC_GFA_LOGO_URL` | `https://www.greenfreightacademy.co.za/logo.png` | URL of the GFA logo |
| `NEXT_PUBLIC_BD_URL` | `https://betterdriver.co.za` | Public URL of the BD site |
| `NEXT_PUBLIC_BETTERDRIVER_URL` | `https://betterdriver.co.za` | Public URL of the BD site |
| `NEXT_PUBLIC_TAG_URL` | `https://www.transportactiongroup.com` | Public URL of the TAG site |
| `NEXT_PUBLIC_ZERO_AFRICA_URL` | `https://www.zeroafrica.org` | Public URL of the Zero Africa site |
| `BD_BASE_URL` | `https://betterdriver.co.za` | Used to generate BD magic links |
| `BETTERDRIVER_URL` | `https://betterdriver.co.za` | Used to generate BD magic links |
| `PORT` | `3001` | Port for the GFA server |

---

## 4. Transport Action Group (TAG)

| Variable | Where to find it | Purpose |
| :--- | :--- | :--- |
| `ADMIN_JWT_SECRET` | Generate: `openssl rand -hex 32` | Signs admin session tokens |
| `ADMIN_EMAIL` | `durbanroadtransport@gmail.com` | Default admin email for first login |
| `ADMIN_PASSWORD` | `changeme` | Default admin password for first login |
| `BREVO_SMTP_HOST` | `smtp-relay.brevo.com` | Brevo SMTP relay host |
| `BREVO_SMTP_PORT` | `587` | Brevo SMTP relay port |
| `BREVO_SMTP_LOGIN` | Brevo Dashboard → SMTP & API | Brevo SMTP login |
| `BREVO_SMTP_PASSWORD` | Brevo Dashboard → SMTP & API | Brevo SMTP password (Master Password) |
| `GFA_PRICING_API_URL` | `https://www.greenfreightacademy.co.za/api/pricing` | Endpoint for fetching live GFA pricing |
| `NEXT_PUBLIC_SITE_URL` | `https://www.transportactiongroup.com` | Public URL of the TAG site |
| `NEXT_PUBLIC_GFA_URL` | `https://www.greenfreightacademy.co.za` | Public URL of the GFA site |
| `NEXT_PUBLIC_BETTERDRIVER_URL` | `https://betterdriver.co.za` | Public URL of the BD site |
| `NEXT_PUBLIC_ZERO_AFRICA_URL` | `https://www.zeroafrica.org` | Public URL of the Zero Africa site |
| `PORT` | `3000` | Port for the TAG server |
