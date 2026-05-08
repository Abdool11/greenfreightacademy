#!/usr/bin/env node
/**
 * TAG Ecosystem — Environment Variable Validator
 * ================================================
 * Run this script from the root of any TAG ecosystem repo before starting
 * the application. It will check that all required env vars are present
 * and print a clear pass/fail report.
 *
 * Usage:
 *   node 08-ENV-VALIDATOR.js
 *
 * Copy this file into the root of each repo (TAG, GFA, BD) and run it
 * after filling in .env.local.
 *
 * IMPORTANT — Variable names in this script are the EXACT names used
 * in the application code (verified by grep on 2026-05-07).
 * Do not rename them.
 */

const fs = require('fs');
const path = require('path');

// Detect which platform this is running in
const cwd = process.cwd();
const isBD  = fs.existsSync(path.join(cwd, 'lib/moodle.ts'));
const isGFA = fs.existsSync(path.join(cwd, 'app/api/company')) && !isBD;
const isTAG = !isBD && !isGFA;

const platform = isBD ? 'BetterDriver (BD)' : isGFA ? 'Green Freight Academy (GFA)' : 'Transport Action Group (TAG)';

// ─── Required Variables Per Platform ─────────────────────────────────────────
// These names are the EXACT names used in process.env.XXX calls in the code.
// The .env.local.example files include aliases (both names) where the codebase
// uses more than one name for the same value.

const REQUIRED = {
  TAG: [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    // Admin Auth — TAG uses ADMIN_JWT_SECRET in its auth routes
    'ADMIN_JWT_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    // Email
    'RESEND_API_KEY',
    // Site URLs
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_GFA_URL',
    'NEXT_PUBLIC_BETTERDRIVER_URL',
    'NEXT_PUBLIC_TAG_URL',
  ],
  GFA: [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    // Auth — GFA uses both GFA_JWT_SECRET and JWT_SECRET in different routes
    'GFA_JWT_SECRET',
    'JWT_SECRET',
    // Email
    'RESEND_API_KEY',
    // WhatsApp — GFA code reads META_WA_TOKEN (not WHATSAPP_ACCESS_TOKEN)
    'META_WA_TOKEN',
    'META_WA_PHONE_NUMBER_ID',
    'META_WA_API_VERSION',
    // Payments
    'PAYSTACK_SECRET_KEY',
    // Video CDN
    'BUNNY_API_KEY',
    'BUNNY_STREAM_LIBRARY_ID',
    'BUNNY_CDN_HOSTNAME',
    // BD integration — GFA uses both BD_BASE_URL and BETTERDRIVER_URL
    'BD_BASE_URL',
    'BETTERDRIVER_URL',
    // Site URLs
    'NEXT_PUBLIC_GFA_URL',
    'NEXT_PUBLIC_BETTERDRIVER_URL',
    'NEXT_PUBLIC_TAG_URL',
  ],
  BD: [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    // Auth — BD uses both JWT_SECRET and BD_JWT_SECRET in different routes
    'JWT_SECRET',
    'BD_JWT_SECRET',
    // Moodle — exact names used in lib/moodle.ts and api/moodle routes
    'MOODLE_URL',
    'MOODLE_TOKEN',
    'MOODLE_DRIVER_PROGRAMME_COURSE_ID',
    'MOODLE_ECO_DRIVER_COURSE_ID',
    'MOODLE_WEBHOOK_SECRET',
    'MOODLE_POLL_SECRET',
    // WhatsApp — BD code reads META_WA_TOKEN (not WHATSAPP_ACCESS_TOKEN)
    'META_WA_TOKEN',
    'META_WA_PHONE_NUMBER_ID',
    'META_WA_API_VERSION',
    // Site URLs
    'NEXT_PUBLIC_BD_URL',
    'NEXT_PUBLIC_GFA_URL',
    'NEXT_PUBLIC_TAG_URL',
    // Branding
    'NEXT_PUBLIC_SUPPORT_EMAIL',
  ],
};

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnvFile() {
  const envPath = path.join(cwd, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('\n❌  .env.local not found in', cwd);
    console.error('    Copy .env.local.example to .env.local and fill in the values.\n');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    env[key] = val;
  }
  return env;
}

// ─── Run Validation ───────────────────────────────────────────────────────────

const platformKey = isBD ? 'BD' : isGFA ? 'GFA' : 'TAG';
const required = REQUIRED[platformKey];
const env = loadEnvFile();

console.log('\n══════════════════════════════════════════════════════');
console.log(`  TAG Ecosystem — Env Var Validator`);
console.log(`  Platform: ${platform}`);
console.log('══════════════════════════════════════════════════════\n');

const missing = [];
const placeholder = [];
const present = [];

for (const key of required) {
  const val = env[key] || process.env[key];
  if (!val) {
    missing.push(key);
  } else if (val.includes('REPLACE_ME') || val.includes('your_') || val === '') {
    placeholder.push(key);
  } else {
    present.push(key);
  }
}

// Print results
for (const key of present) {
  console.log(`  ✅  ${key}`);
}
for (const key of placeholder) {
  console.log(`  ⚠️   ${key}  ← still has placeholder value`);
}
for (const key of missing) {
  console.log(`  ❌  ${key}  ← MISSING`);
}

console.log('\n──────────────────────────────────────────────────────');
console.log(`  Present:     ${present.length}/${required.length}`);
console.log(`  Placeholder: ${placeholder.length}/${required.length}`);
console.log(`  Missing:     ${missing.length}/${required.length}`);
console.log('──────────────────────────────────────────────────────\n');

if (missing.length > 0 || placeholder.length > 0) {
  console.error(`❌  VALIDATION FAILED — Do not start the application until all variables are set.\n`);
  process.exit(1);
} else {
  console.log(`✅  All required environment variables are present. Safe to start.\n`);
  process.exit(0);
}
