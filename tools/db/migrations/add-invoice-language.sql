-- Add language column to invoices table
-- Stores the locale code (e.g., 'en', 'al', 'mk', 'nl') for the invoice
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
