# Meta WhatsApp Credentials — Ultra-Detailed Walkthrough

> **Goal:** Get the 3 pieces of information you need from Meta:
> 1. Permanent Access Token
> 2. Phone Number ID
> 3. Configure the Webhook

---

## PART 1: Get Your Permanent Access Token

The **temporary token** you see on the "API Setup" page expires in 24 hours. You need a **permanent** one for production. Here's how.

### Step 1.1: Go to Meta Business Manager (not Developer Portal)

1. Open a new browser tab
2. Go to: **https://business.facebook.com**
3. Log in with the same Facebook/Meta account that owns your WhatsApp app

### Step 1.2: Find "System Users"

1. In Business Manager, look at the **left sidebar**
2. Click **Settings** (it has a gear icon)
3. You are now in "Business Settings"
4. In the left sidebar, look for **Users** → click the arrow to expand
5. Click **System Users**

> **What is a System User?** Think of it as a robot employee that can use your app. It never logs out, so its token never expires.

### Step 1.3: Create a System User

1. Click the blue button **"Add"** (or **"Create System User"**)
2. A popup appears. Fill it in:
   - **Name:** `WhatsApp API User` (or anything you like)
   - **Role:** Select **"Admin"**
3. Click **Create System User**
4. The user now appears in the list

### Step 1.4: Assign Your App to the System User

1. Click on the **new System User** you just created (the row in the table)
2. On the right side, look for a tab or section called **"Assign Assets"**
3. Click **Assign Assets**
4. A popup appears:
   - **Asset type:** Select **"Apps"**
   - **Select your app:** Click the checkbox next to your WhatsApp app name
   - **Task:** Select **"Manage app"** (or the highest permission available)
5. Click **Save Changes**

### Step 1.5: Generate the Permanent Token

1. Still on the System User page, look for a button called **"Generate Token"**
2. Click it
3. A popup appears:
   - **App:** Select your WhatsApp app from the dropdown
   - **Token Expiration:** Select **"Never"**
   - **Permissions:** Tick these:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
4. Click **Generate Token**
5. **COPY THE TOKEN IMMEDIATELY.** It looks like:
   ```
   EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. Paste it into a Notepad file. **You cannot see it again.**

> **IMPORTANT:** This is your `WHATSAPP_ACCESS_TOKEN` and `META_WA_TOKEN`. Use the same value for both.

---

## PART 2: Get Your Phone Number ID

This is much easier. You already have a number registered.

### Step 2.1: Go to the Developer Portal

1. Go to: **https://developers.facebook.com**
2. Make sure you are in **your WhatsApp app**
3. In the left sidebar, click **"WhatsApp"** → **"API Setup"**

### Step 2.2: Copy the Phone Number ID

1. On the API Setup page, look at the section labeled **"From"**
2. You see your phone number, e.g. `+27 72 123 4567`
3. **Below or next to it**, there is a number called **"Phone Number ID"**
4. It looks like a long number: `155512345678901`
5. Click the **copy icon** (or highlight and Ctrl+C)
6. This is your `WHATSAPP_PHONE_NUMBER_ID` and `META_WA_PHONE_NUMBER_ID`

> **Do NOT confuse this with:**
> - The actual phone number (e.g. `+27 72...`)
> - The Business Account ID
> - The App ID
>
> You need the **Phone Number ID** specifically.

---

## PART 3: Create Your Verify Token

This is not from Meta — you make it up yourself.

1. Open Notepad
2. Type any random secret string, for example:
   ```
   tag_whatsapp_verify_2024_secret_xyz789
   ```
3. It can be anything. Just make it hard to guess.
4. This goes into both `.env.local` files as `META_WA_VERIFY_TOKEN`
5. You will also paste this same text into Meta in Step 4.3 below

---

## PART 4: Configure the Webhook in Meta

This tells Meta where to send updates.

### Step 4.1: Go to Webhook Configuration

1. In the Developer Portal, inside your WhatsApp app
2. In the left sidebar, click **"WhatsApp"** → **"Configuration"**
3. Scroll down to the section called **"Webhooks"**
4. Click the **"Edit"** button (or pencil icon)

### Step 4.2: Enter the Callback URL

1. A popup appears with two fields:
   - **Callback URL:** Paste this exact URL:
     ```
     https://www.greenfreightacademy.co.za/api/webhook/whatsapp
     ```
   - **Verify Token:** Paste the secret string you created in Part 3
2. Click **Verify and Save**

### Step 4.3: What Should Happen

- If your GFA site is **live** → Meta sends a test request to your URL → you see a green checkmark ✅
- If your GFA site is **not deployed yet** → you get an error "URL unreachable" → deploy first, then come back

> **If you get "URL unreachable":** Don't worry. Skip this step, deploy your site, then return to this page and click **Verify and Save** again.

### Step 4.4: Subscribe to Webhook Fields

1. After saving, look below the webhook URL
2. You see a table of **"Webhook Fields"**
3. Tick these checkboxes:
   - [ ] `messages` — **TICK THIS**
   - [ ] `message_template_status_update` — **TICK THIS**
   - [ ] `message_delivery_receipts` — **TICK THIS**
4. Click **Save**

---

## PART 5: Paste Everything Into Your Code

Now you have 3 things. Update both `.env.local` files.

### `greenfreightacademy/.env.local`

Replace these lines (keep everything else):

```env
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=155512345678901
META_WA_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_WA_PHONE_NUMBER_ID=155512345678901
META_WA_VERIFY_TOKEN=tag_whatsapp_verify_2024_secret_xyz789
```

### `betterdriver/.env.local`

Replace the **same lines** with the **exact same values**.

---

## Quick Reference Card

| What you need | Where you got it | Goes into |
|--------------|------------------|-----------|
| Permanent Token | Business Manager → System Users → Generate Token | `WHATSAPP_ACCESS_TOKEN` + `META_WA_TOKEN` |
| Phone Number ID | Developer Portal → WhatsApp → API Setup → "From" | `WHATSAPP_PHONE_NUMBER_ID` + `META_WA_PHONE_NUMBER_ID` |
| Verify Token | You made it up yourself | `META_WA_VERIFY_TOKEN` (code + Meta portal) |
| Callback URL | Not from Meta, it's your site | Meta portal webhook config |

---

## Common Mistakes

### "I only see a temporary token"

- You are on the Developer Portal → API Setup page. That token expires in 24h.
- You MUST go to **Business Manager → System Users** to create a permanent one.

### "I can't find System Users"

- Make sure you are on **business.facebook.com** (not developers.facebook.com)
- In the left sidebar, click the **gear/settings icon** → look for "Users" → expand → "System Users"

### "Phone Number ID is not showing"

- In API Setup, the Phone Number ID is **not** the phone number itself.
- Look carefully at the "From" section — there is a label **"Phone Number ID"** with a number below it.

### "Webhook says URL unreachable"

- Your site must be deployed and live on the internet.
- Localhost (`http://localhost:3001`) will NOT work. Meta needs a public HTTPS URL.
- Deploy first, then configure the webhook.

### "I generated the token but lost it"

- Go back to Business Manager → System Users → click the user → click **"Generate Token"** again.
- The old token still works, but now you have a new one too. Use either.

---

## Next Steps After This

1. Go back to: `@c:\Users\Administrator\Documents\TAG Trifactor\greenfreightacademy\docs\handover\18-META-WHATSAPP-SETUP-GUIDE.md`
2. Follow **Step 3** (Create Templates) and **Step 5** (Test the Flow)
