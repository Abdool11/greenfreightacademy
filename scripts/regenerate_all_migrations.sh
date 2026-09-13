#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="${repo_root}/ALL_MIGRATIONS_RUN_ONCE.sql"

tmp_file="$(mktemp)"
trap 'rm -f "${tmp_file}"' EXIT

{
  printf '%s\n' '-- Green Freight Academy — ALL MIGRATIONS RUN ONCE'
  printf '%s\n' '-- Generated from supabase/migrations in filename order.'
  printf '%s\n\n' '-- Review in Preview before applying to any environment.'
  while IFS= read -r migration; do
    name="$(basename "${migration}")"
    printf '%s\n' '-- ============================================================================='
    printf '%s\n' "-- BEGIN supabase/migrations/${name}"
    printf '%s\n' '-- ============================================================================='
    cat "${migration}"
    printf '\n%s\n' '-- ============================================================================='
    printf '%s\n\n' "-- END supabase/migrations/${name}"
  done < <(find "${repo_root}/supabase/migrations" -maxdepth 1 -type f -name '*.sql' -print | sort)
} > "${tmp_file}"

mv "${tmp_file}" "${output}"
trap - EXIT
