-- Migration 009: Add bank_number column to companies table

ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_number TEXT;
