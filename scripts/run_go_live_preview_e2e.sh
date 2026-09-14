#!/usr/bin/env bash
set -euo pipefail

# This runner is intentionally strict. It executes only against a named
# non-production Preview with a complete synthetic fixture set.
if [[ -z "${GFA_TEST_BASE_URL:-}" ]]; then
  echo "Set GFA_TEST_BASE_URL to a unique non-production Preview URL." >&2
  exit 64
fi

if [[ "${GFA_TEST_BASE_URL}" =~ (^|//)(www\.)?greenfreightacademy\.co\.za([/:]|$) ]]; then
  echo "Refusing to run the go-live acceptance suite against the production GFA domain." >&2
  exit 64
fi

required=(
  GFA_TEST_ADMIN_EMAIL
  GFA_TEST_ADMIN_PASSWORD
  GFA_TEST_CLIENT_EMAIL
  GFA_TEST_CLIENT_PASSWORD
  GFA_TEST_ADMIN_COMPANY_ID
  GFA_TEST_QA_DEPLOYED_QUOTE_ID
  GFA_TEST_QA_DEPLOYED_DRIVER_ID
  GFA_TEST_EFT_PENDING_PAYMENT_ID
  GFA_TEST_EFT_BANK_REFERENCE
  GFA_TEST_INVOICE_QUOTE_ID
  GFA_TEST_CERTIFICATE_NUMBER
  GFA_TEST_CERTIFICATE_STATUS
  GFA_TEST_PENDING_CERTIFICATE_ID
  GFA_TEST_NOT_ELIGIBLE_CERTIFICATE_ID
  GFA_TEST_SUPERSEDE_CERTIFICATE_ID
  GFA_TEST_REPLACEMENT_CERTIFICATE_ID
  GFA_TEST_CERTIFICATE_COMPLETION_ASSERTION
  GFA_TEST_CERTIFICATE_STATUS_ASSERTION
  GFA_TEST_CERTIFICATE_HANDOFF_ASSERTION
  GFA_TEST_OTHER_DRIVER_HANDOFF_ASSERTION
  BD_EVENT_SECRET
  CRON_SECRET
)

missing=()
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]] || [[ "${!variable}" == REPLACE_ME* ]]; then
    missing+=("${variable}")
  fi
done

if ((${#missing[@]} > 0)); then
  printf 'Refusing to run with missing or placeholder Preview fixture variables:\n' >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 64
fi

npm run type-check
npm run build
npx playwright test --project=chromium
