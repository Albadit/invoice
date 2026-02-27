-- Drop reference_code column from invoices and rebuild search_text without it
DROP INDEX IF EXISTS idx_invoices_reference_code;

ALTER TABLE invoices DROP COLUMN IF EXISTS search_text;
ALTER TABLE invoices DROP COLUMN IF EXISTS reference_code;

ALTER TABLE invoices ADD COLUMN search_text text GENERATED ALWAYS AS (
    coalesce(invoice_code, '') || ' ' || 
    coalesce(customer_name, '')
) STORED;

DROP INDEX IF EXISTS idx_invoices_search_text_trgm;
CREATE INDEX IF NOT EXISTS idx_invoices_search_text_trgm ON invoices USING GIN (search_text gin_trgm_ops);
