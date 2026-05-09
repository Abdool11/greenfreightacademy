# TAG Ecosystem — WhatsApp Template Specification

This document provides the exact specifications for every WhatsApp template required by the TAG ecosystem. Asif must create and approve these templates in the Meta Business Manager before the system can send messages.

## General Requirements

*   **Category:** Utility
*   **Languages:** English (en) and isiZulu (zu) where specified.
*   **Header:** None (unless specified).
*   **Footer:** None (unless specified).
*   **Buttons:** None (unless specified).

**CRITICAL COMPLIANCE NOTE:** Meta's Utility category is extremely strict. Do not add promotional language ("Welcome", "Congratulations", "Good luck") or persuasive calls to action ("Don't forget", "Click here"). The base URL must be hardcoded in the template body, with only the unique token passed as a variable.

---

## Template 1: Driver Magic Link (GFA)

**Purpose:** Sent by GFA when a company deploys a course to a driver. Contains the unique magic link for passwordless login.

*   **Template Name:** `gfa_driver_magic_link`
*   **Language:** English (`en`)
*   **Body:**
    ```text
    Account update for {{1}}:
    {{2}} has enrolled you in the {{3}} programme.
    
    Your unique access link is:
    https://betterdriver.co.za/join/{{4}}
    
    This link provides direct access to your account. Do not share it.
    Reply STOP to opt out of future messages.
    ```
*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Company Name
    *   `{{3}}`: Programme Name
    *   `{{4}}`: Magic Link Token (e.g., `a1b2c3d4...`)

---

## Template 2: Driver Welcome (BD)

**Purpose:** Sent by BD after the driver clicks the magic link and completes the initial onboarding (language selection).

*   **Template Name:** `bd_welcome_first_login`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Account update for {{1}}:
Your BetterDriver profile is now active for the {{2}} programme.

You can access your account at:
https://betterdriver.co.za/portal

Reply STOP to opt out of future messages.
```

**isiZulu (`zu`) Body:**
```text
Isibuyekezo se-akhawunti sika-{{1}}:
Iphrofayela yakho ye-BetterDriver isiyasebenza ohlelweni lwe-{{2}}.

Ungafinyelela i-akhawunti yakho ku:
https://betterdriver.co.za/portal

Phendula ngokuthi STOP ukuze uyeke ukuthola imilayezo.
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Programme Name

---

## Template 3: Module Complete (BD)

**Purpose:** Sent by BD when a driver completes a module.

*   **Template Name:** `bd_module_complete`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Account update for {{1}}:
You have completed module {{2}}.

Your progress has been recorded. Access your account at:
https://betterdriver.co.za/portal
```

**isiZulu (`zu`) Body:**
```text
Isibuyekezo se-akhawunti sika-{{1}}:
Uqedele imojula {{2}}.

Inqubekelaphambili yakho irekhodiwe. Finyelela i-akhawunti yakho ku:
https://betterdriver.co.za/portal
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Module Number

---

## Template 4: Inactivity Reminder - 7 Days (BD)

**Purpose:** Sent by BD cron job if a driver has not logged in for 7 days.

*   **Template Name:** `bd_inactivity_7day`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Account status for {{1}}:
Your training account has been inactive for 7 days. You have completed {{2}} modules.

Access your account at:
https://betterdriver.co.za/portal
```

**isiZulu (`zu`) Body:**
```text
Isimo se-akhawunti sika-{{1}}:
I-akhawunti yakho yokuqeqeshwa inezinsuku eziyi-7 ingasebenzi. Uqedele amamojula ayi-{{2}}.

Finyelela i-akhawunti yakho ku:
https://betterdriver.co.za/portal
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Modules Completed

---

## Template 5: Inactivity Reminder - 14 Days (BD)

**Purpose:** Sent by BD cron job if a driver has not logged in for 14 days.

*   **Template Name:** `bd_inactivity_14day`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Account status for {{1}}:
Your training account has been inactive for 14 days. You have completed {{2}} modules.

Access your account at:
https://betterdriver.co.za/portal
```

**isiZulu (`zu`) Body:**
```text
Isimo se-akhawunti sika-{{1}}:
I-akhawunti yakho yokuqeqeshwa inezinsuku eziyi-14 ingasebenzi. Uqedele amamojula ayi-{{2}}.

Finyelela i-akhawunti yakho ku:
https://betterdriver.co.za/portal
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Modules Completed

---

## Template 6: Programme Complete (BD)

**Purpose:** Sent by BD when a driver completes all modules in a programme.

*   **Template Name:** `bd_programme_complete`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Account update for {{1}}:
You have completed the {{2}} programme.

Your certificate is now available. Access your account at:
https://betterdriver.co.za/portal
```

**isiZulu (`zu`) Body:**
```text
Isibuyekezo se-akhawunti sika-{{1}}:
Uqedele uhlelo lwe-{{2}}.

Isitifiketi sakho sesiyatholakala. Finyelela i-akhawunti yakho ku:
https://betterdriver.co.za/portal
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Programme Name
