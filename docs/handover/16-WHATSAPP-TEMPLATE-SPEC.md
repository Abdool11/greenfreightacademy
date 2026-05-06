# TAG Ecosystem — WhatsApp Template Specification

This document provides the exact specifications for every WhatsApp template required by the TAG ecosystem. Asif must create and approve these templates in the Meta Business Manager before the system can send messages.

## General Requirements

*   **Category:** Utility
*   **Languages:** English (en) and isiZulu (zu) where specified.
*   **Header:** None (unless specified).
*   **Footer:** None (unless specified).
*   **Buttons:** None (unless specified).

## Template 1: Driver Magic Link (GFA)

**Purpose:** Sent by GFA when a company deploys a course to a driver. Contains the unique magic link for passwordless login.

*   **Template Name:** `gfa_driver_magic_link`
*   **Language:** English (`en`)
*   **Body:**
    ```text
    Hello {{1}},

    Your company has enrolled you in the {{2}} course on BetterDriver.

    Click the link below to access your training portal. This link is unique to you, please do not share it.

    {{3}}

    Regards,
    The BetterDriver Team
    ```
*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Course Name
    *   `{{3}}`: Magic Link URL

## Template 2: Driver Welcome (BD)

**Purpose:** Sent by BD after the driver clicks the magic link and completes the initial onboarding (language selection).

*   **Template Name:** `bd_driver_welcome`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Welcome to BetterDriver, {{1}}!

Your training portal is now active. You can access your courses, track your progress, and download your certificates here:

{{2}}

Good luck with your training!
```

**isiZulu (`zu`) Body:**
```text
Siyakwamukela ku-BetterDriver, {{1}}!

Iphothali yakho yokuqeqeshwa isiyasebenza. Ungafinyelela izifundo zakho, ulandelele inqubekelaphambili yakho, futhi ulande izitifiketi zakho lapha:

{{2}}

Sikufisela inhlanhla ngokuqeqeshwa kwakho!
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Portal URL

## Template 3: Inactivity Reminder - 7 Days (BD)

**Purpose:** Sent by BD cron job if a driver has not logged in for 7 days.

*   **Template Name:** `bd_inactivity_7day`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Hi {{1}},

We noticed you haven't logged into BetterDriver recently. Don't forget to complete your {{2}} course!

Click here to continue your training: {{3}}
```

**isiZulu (`zu`) Body:**
```text
Sawubona {{1}},

Siqaphele ukuthi awukangeni ku-BetterDriver muva nje. Ungakhohlwa ukuqeda isifundo sakho se-{{2}}!

Chofoza lapha ukuze uqhubeke nokuqeqeshwa kwakho: {{3}}
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Course Name
    *   `{{3}}`: Portal URL

## Template 4: Inactivity Reminder - 14 Days (BD)

**Purpose:** Sent by BD cron job if a driver has not logged in for 14 days.

*   **Template Name:** `bd_inactivity_14day`
*   **Languages:** English (`en`), isiZulu (`zu`)

**English (`en`) Body:**
```text
Hi {{1}},

It's been a while since you last trained on BetterDriver. Your {{2}} course is waiting for you.

Please log in and continue your progress: {{3}}
```

**isiZulu (`zu`) Body:**
```text
Sawubona {{1}},

Sekuyisikhathi kusukela waqeqeshwa okokugcina ku-BetterDriver. Isifundo sakho se-{{2}} sikulindile.

Sicela ungene ngemvume futhi uqhubeke nenqubekelaphambili yakho: {{3}}
```

*   **Parameters:**
    *   `{{1}}`: Driver's First Name
    *   `{{2}}`: Course Name
    *   `{{3}}`: Portal URL
