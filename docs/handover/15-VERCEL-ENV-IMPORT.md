# TAG Ecosystem — Vercel Environment Variable Import Files

This document provides the `.env` file contents formatted specifically for Vercel's bulk import feature. Asif can copy these blocks, save them as `.env` files locally, fill in the actual values, and then drag-and-drop them into the Vercel dashboard for each project.

## 1. TAG Platform (`tag-vercel-import.env`)

```env
# TAG Platform - Vercel Import
# Replace placeholder values before importing

# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Admin Authentication
ADMIN_JWT_SECRET=[GENERATE_WITH: openssl rand -base64 32]
ADMIN_EMAIL=admin@transportactiongroup.co.za
ADMIN_PASSWORD=[SET_SECURE_PASSWORD]

# Ecosystem URLs
NEXT_PUBLIC_TAG_URL=https://transportactiongroup.co.za
NEXT_PUBLIC_GFA_URL=https://greenfreightacademy.co.za
NEXT_PUBLIC_BD_URL=https://betterdriver.co.za

# External APIs
GFA_PRICING_API_URL=https://greenfreightacademy.co.za/api/pricing
```

## 2. GFA Platform (`gfa-vercel-import.env`)

```env
# GFA Platform - Vercel Import
# Replace placeholder values before importing

# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Authentication
JWT_SECRET=[GENERATE_WITH: openssl rand -base64 32]
ADMIN_JWT_SECRET=[SAME_AS_JWT_SECRET]

# WhatsApp Integration
META_WA_ACCESS_TOKEN=[YOUR_META_ACCESS_TOKEN]
META_WA_PHONE_NUMBER_ID=[YOUR_PHONE_NUMBER_ID]
META_WA_BUSINESS_ACCOUNT_ID=[YOUR_BUSINESS_ACCOUNT_ID]
META_WA_API_VERSION=v18.0

# Ecosystem URLs
NEXT_PUBLIC_TAG_URL=https://transportactiongroup.co.za
NEXT_PUBLIC_GFA_URL=https://greenfreightacademy.co.za
NEXT_PUBLIC_BD_URL=https://betterdriver.co.za
```

## 3. BD Platform (`bd-vercel-import.env`)

```env
# BD Platform - Vercel Import
# Replace placeholder values before importing

# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Authentication
BD_JWT_SECRET=[GENERATE_WITH: openssl rand -base64 32]
JWT_SECRET=[SAME_AS_BD_JWT_SECRET]

# Moodle Integration
MOODLE_URL=https://[YOUR_MOODLE_DOMAIN]
MOODLE_TOKEN=[YOUR_MOODLE_WEBSERVICE_TOKEN]
MOODLE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]

# WhatsApp Integration
META_WA_ACCESS_TOKEN=[YOUR_META_ACCESS_TOKEN]
META_WA_PHONE_NUMBER_ID=[YOUR_PHONE_NUMBER_ID]
META_WA_BUSINESS_ACCOUNT_ID=[YOUR_BUSINESS_ACCOUNT_ID]
META_WA_API_VERSION=v18.0

# Ecosystem URLs
NEXT_PUBLIC_TAG_URL=https://transportactiongroup.co.za
NEXT_PUBLIC_GFA_URL=https://greenfreightacademy.co.za
NEXT_PUBLIC_BD_URL=https://betterdriver.co.za

# CDN
NEXT_PUBLIC_BUNNY_CDN_HOSTNAME=[YOUR_BUNNY_CDN_HOSTNAME]
```
