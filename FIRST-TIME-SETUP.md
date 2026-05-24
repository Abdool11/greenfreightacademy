# GFA — First-Time Setup Guide

This guide is written for a developer deploying GFA for the first time on a fresh Ubuntu server. Follow every step in order. Do not skip any step.

---

## Prerequisites

- Ubuntu 22.04 server with a public IP address
- Domain `greenfreightacademy.co.za` pointing to your server's IP (DNS A record)
- Root or sudo access
- A Supabase project created at https://supabase.com (free tier is fine)
- The `supabase-setup.sql` file from the delivery package

---

## Step 1 — Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 2 — Extract the Deployment Package

```bash
sudo mkdir -p /home/ubuntu/sites
cd /home/ubuntu/sites

tar -xzf GFA-greenfreightacademy-v4.tar.gz
mv standalone gfa

ls gfa/
# You should see: server.js  node_modules/  .next/  public/  .env.local.example  nginx.conf  pm2.config.js  deploy.sh  QUICK-START-CARD.md
```

---

## Step 3 — Configure Environment Variables

```bash
cd /home/ubuntu/sites/gfa
cp .env.local.example .env.local
nano .env.local
```

Fill in every value:

| Variable | What to put |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `GFA_JWT_SECRET` | Long random string: `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | `https://greenfreightacademy.co.za` |
| `RESEND_API_KEY` | Your Resend.com API key (for quote, deploy, and approval emails) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Your Paystack public key |
| `PAYSTACK_SECRET_KEY` | Your Paystack secret key |
| `BD_BASE_URL` | `https://betterdriver.co.za` (or the BD server URL) |
| `TAG_BASE_URL` | `https://transportactiongroup.co.za` |

Save with `Ctrl+O`, then `Ctrl+X`.

---

## Step 4 — Set Up the Database

1. Log in to your Supabase project
2. Go to **SQL Editor**
3. Paste the entire contents of `supabase-setup.sql` and click **Run**
4. Verify tables were created in **Table Editor** — you should see `gfa_admins`, `companies`, `drivers`, `courses`, `cohorts`, `deployments`, `prospect_leads`, `vouchers`, etc.

---

## Step 5 — Create the First Admin Account

GFA admin accounts are stored in the `gfa_admins` Supabase table with bcrypt-hashed passwords. There is no default account — you must create one.

**Generate a bcrypt hash of your chosen password:**
Go to https://bcrypt-generator.com, enter your password, set rounds to **10**, and click Generate. Copy the hash (it starts with `$2a$10$...`).

**Insert the admin record in Supabase SQL Editor:**

```sql
INSERT INTO gfa_admins (email, name, password_hash, role)
VALUES (
  'admin@greenfreightacademy.co.za',
  'GFA Admin',
  '$2a$10$PASTE_YOUR_BCRYPT_HASH_HERE',
  'super_admin'
);
```

Use `'super_admin'` to get full access including the Sales Funnel and CEO Dashboard.
Use `'admin'` for a standard admin without those views.

You can create multiple admin accounts by running the INSERT multiple times with different emails.

---

## Step 6 — Configure Nginx

```bash
# Update the path in nginx.conf if needed
nano /home/ubuntu/sites/gfa/nginx.conf
# Confirm all alias paths say /home/ubuntu/sites/gfa/...

sudo cp /home/ubuntu/sites/gfa/nginx.conf /etc/nginx/sites-available/greenfreightacademy.co.za
sudo ln -s /etc/nginx/sites-available/greenfreightacademy.co.za \
           /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7 — Get SSL Certificate

```bash
sudo certbot --nginx -d greenfreightacademy.co.za -d www.greenfreightacademy.co.za
```

---

## Step 8 — Start the Application

```bash
cd /home/ubuntu/sites/gfa
pm2 start pm2.config.js
pm2 save
pm2 startup
# Run the command PM2 outputs
```

---

## Step 9 — Verify the Site is Working

```bash
pm2 status
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003
# Should return: 200
```

Open `https://greenfreightacademy.co.za` in your browser. The site should load with full styling.

---

## Roles on GFA

GFA has three roles. Here is how to access and test each one:

### Role 1 — Client (Transport Company)

| Action | URL |
| :--- | :--- |
| Register a new company account | `/register` |
| Log in | `/login` |
| Dashboard (after login) | `/dashboard` |

**To test:** Go to `/register`, create a company account, then log in. From the dashboard you can request a quote, view programmes, manage bulletins, and access the CPD library.

---

### Role 2 — Admin

| Action | URL |
| :--- | :--- |
| Log in | `/admin/login` |
| Admin dashboard | `/admin/dashboard` |

**Credentials:** Use the email and password you inserted into `gfa_admins` in Step 5.

**What admin can do:** Manage companies, approve cohorts, manage programmes, create vouchers, manage the CPD queue, configure email and messaging settings, view impact stats.

---

### Role 3 — Super Admin

Super Admin uses the **same login page** as Admin (`/admin/login`). The difference is the role field in the database record.

**What Super Admin can do (in addition to all Admin features):**
- Sales Funnel (`/admin/funnel`) — full lead pipeline with conversion rates
- CEO Dashboard (`/admin/super`) — revenue, deployment, and impact metrics

If you created your admin account with `role = 'super_admin'` in Step 5, you already have Super Admin access.

---

## WhatsApp Configuration (Post-Deployment)

WhatsApp credentials are configured through the admin panel, not in `.env.local`. After logging in as admin:

1. Go to **Settings > Messaging** (`/admin/settings/messaging`)
2. Enter your WhatsApp Business API credentials:
   - API URL: `https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages`
   - Phone Number ID
   - Access Token (from Meta Business Manager)

---

## Troubleshooting

**Site loads but has no styling**
The `location /_next/static/` block in nginx.conf is not working or the alias path is wrong. Check the path matches your actual deployment directory and run `sudo nginx -t && sudo systemctl reload nginx`.

**Admin login fails with "Invalid credentials"**
The bcrypt hash was not inserted correctly. Go to Supabase SQL Editor and run:
```sql
SELECT email, role FROM gfa_admins;
```
If no rows appear, the INSERT in Step 5 did not run. Try again.

**Company registration fails**
Check `SUPABASE_SERVICE_ROLE_KEY` and `GFA_JWT_SECRET` are set in `.env.local`. Restart the app: `pm2 restart gfa-app`.

**Emails not sending**
Check `RESEND_API_KEY` is set correctly. Verify your Resend domain is verified in the Resend dashboard.
