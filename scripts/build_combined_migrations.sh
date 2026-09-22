#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="${repo_root}/ALL_MIGRATIONS_RUN_ONCE.sql"

{
  printf '%s\n' '-- ============================================================================='
  printf '%s\n' '-- Green Freight Academy — Combined migrations'
  printf '%s\n' '-- Generated from supabase/migrations in filename order.'
  printf '%s\n' '-- Use only for a new or intentionally rebuilt non-production database.'
  printf '%s\n' '-- For an existing environment, apply only migrations not yet recorded, in order.'
  printf '%s\n' '-- ============================================================================='
  printf '\n'

  first_migration=1
  while IFS= read -r migration; do
    if [ "${first_migration}" -eq 0 ]; then
      printf '\n'
    fi
    relative_path="${migration#${repo_root}/}"
    printf '%s\n' '-- ============================================================================='
    printf '%s\n' "-- BEGIN ${relative_path}"
    printf '%s\n' '-- ============================================================================='
    cat "${migration}"
    printf '%s\n' '-- ============================================================================='
    printf '%s\n' "-- END ${relative_path}"
    printf '%s\n' '-- ============================================================================='
    first_migration=0
  done < <(find "${repo_root}/supabase/migrations" -maxdepth 1 -type f -name '*.sql' -print | sort)
} > "${output}"
