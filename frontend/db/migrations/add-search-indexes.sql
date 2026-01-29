-- =============================================
-- Migration: Add pg_trgm indexes for fast text search
-- =============================================
-- This migration enables fast ILIKE pattern matching on large datasets
-- Run this once on your production database

-- Enable pg_trgm extension (required for GIN trigram indexes)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create GIN indexes for fast text search
-- These indexes speed up ILIKE queries from O(n) to O(log n)
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name_trgm 
    ON invoices USING GIN (customer_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_trgm 
    ON invoices USING GIN (invoice_number gin_trgm_ops);

-- Optional: Create a combined search column for even faster searches
-- This creates a computed column that combines searchable fields
-- Uncomment if you want to search across multiple fields with one index

-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS search_text TEXT 
--     GENERATED ALWAYS AS (
--         COALESCE(invoice_number, '') || ' ' || 
--         COALESCE(customer_name, '') || ' ' || 
--         COALESCE(customer_city, '')
--     ) STORED;
-- 
-- CREATE INDEX IF NOT EXISTS idx_invoices_search_text_trgm 
--     ON invoices USING GIN (search_text gin_trgm_ops);

-- =============================================
-- Performance comparison:
-- Without pg_trgm index: Full table scan, ~5-10s for 1M rows
-- With pg_trgm index:    Index scan, ~10-50ms for 1M rows
-- =============================================
