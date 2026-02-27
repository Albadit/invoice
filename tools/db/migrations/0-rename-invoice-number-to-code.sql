-- =============================================
-- Migration: Rename invoice_number to invoice_code
-- =============================================
-- This migration renames the column and function for clarity.
-- The column stores a numeric code (no "INV-" prefix).
-- Idempotent: safe to run on fresh DBs where column is already invoice_code.

-- 1. Rename the column (only if old name still exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE invoices RENAME COLUMN invoice_number TO invoice_code;
  END IF;
END $$;

-- 2. Rename indexes (only if old name still exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_invoice_number') THEN
    ALTER INDEX idx_invoices_invoice_number RENAME TO idx_invoices_invoice_code;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_invoice_number_trgm') THEN
    ALTER INDEX idx_invoices_invoice_number_trgm RENAME TO idx_invoices_invoice_code_trgm;
  END IF;
END $$;

-- 2. Drop and recreate the function with new name
CREATE OR REPLACE FUNCTION generate_invoice_code()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    number_exists BOOLEAN;
BEGIN
    LOOP
        new_number := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
        SELECT EXISTS(SELECT 1 FROM invoices WHERE invoice_code = new_number) INTO number_exists;
        IF NOT number_exists THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the column default to use the renamed function
ALTER TABLE invoices ALTER COLUMN invoice_code SET DEFAULT generate_invoice_code();

-- 4. Drop the old function (if it still exists)
DROP FUNCTION IF EXISTS generate_invoice_number();

-- 5. Update the Classic template to use invoice_code
UPDATE templates 
SET styling = REPLACE(styling, 'invoice.invoice_number', 'invoice.invoice_code')
WHERE styling LIKE '%invoice.invoice_number%';
