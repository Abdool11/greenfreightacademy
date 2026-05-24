# Green Freight Academy — Quick Start Card

> Full instructions: `FIRST-TIME-SETUP.md` | Database setup: `ALL_MIGRATIONS_RUN_ONCE.sql`

---

## 1. Deploy

```bash
tar -xzf GFA-greenfreightacademy-v4.tar.gz
mv standalone /home/ubuntu/sites/gfa
cd /home/ubuntu/sites/gfa
cp .env.local.example .env.local
nano .env.local          # fill in all values (see table below)
pm2 start pm2.config.js
pm2 save && pm2 startup
```

---

## 2. Required Environment Variables

| Variable | Where to get it |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `GFA_JWT_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | `https://greenfreightacademy.co.za` |
| `BD_BASE_URL` | `https://betterdriver.co.za` |
| `TAG_BASE_URL` | `https://transportactiongroup.co.za` |
| `RESEND_API_KEY` | resend.com → API Keys |
| `META_WA_API_VERSION` | e.g. `v19.0` |
| `META_WA_PHONE_NUMBER_ID` | Meta Business → WhatsApp → Phone Numbers |
| `META_WA_ACCESS_TOKEN` | Meta Business → WhatsApp → API Setup |
| `SUPPORT_EMAIL` | e.g. `support@greenfreightacademy.co.za` |

---

## 3. Database

Run **once** in Supabase SQL Editor (shared with BD — same Supabase project):

```
ALL_MIGRATIONS_RUN_ONCE.sql
```

---

## 4. Create First GFA Admin

```sql
INSERT INTO gfa_admins (email, name, password_hash, role)
VALUES (
  'admin@greenfreightacademy.co.za',
  'GFA Admin',
  '$2a$10$PASTE_BCRYPT_HASH_HERE',   -- generate at bcrypt-generator.com (10 rounds)
  'super_admin'
);
```

---

## 5. Roles

| Role | Login URL | How created |
| :--- | :--- | :--- |
| Company (HR) | `/auth/login` | Self-register at `/auth/register` |
| GFA Admin | `/admin/login` | SQL insert into `gfa_admins` |
| Super Admin | `/admin/login` | SQL insert with `role = 'super_admin'` |

---

## 6. Verify

```bash
pm2 status
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003
# Expected: 200
```

Open `https://greenfreightacademy.co.za` — the site should load.
