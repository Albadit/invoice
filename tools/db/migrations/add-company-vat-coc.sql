-- =============================================
-- Migration: Add VAT number and CoC number to companies
-- =============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS coc_number TEXT;
