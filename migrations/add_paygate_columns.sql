-- Migration: Add Paygate payment columns to quotes table
-- Run this in the Supabase SQL Editor or via psql

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS pay_request_id text,
  ADD COLUMN IF NOT EXISTS paygate_transaction_id text,
  ADD COLUMN IF NOT EXISTS paygate_auth_code text;

-- Add paygate-related columns to payments table if it exists
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS paygate_transaction_id text,
  ADD COLUMN IF NOT EXISTS paygate_auth_code text;
