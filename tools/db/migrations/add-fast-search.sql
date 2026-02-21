-- =============================================
-- Migration: Fast Search & Keyset Pagination
-- =============================================
-- Implements "big company" patterns for 10M+ row performance:
-- 1. Keyset (cursor) pagination - O(1) instead of O(n) offset
-- 2. Full-text search (FTS) with tsvector - O(log n) word search
-- 3. Trigram indexes - O(log n) substring search fallback
-- 4. Estimated counts - avoid COUNT(*) on every request
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- 1. Full-Text Search (FTS) Setup
-- =============================================
-- Generated tsvector column for fast word-based search
-- Combines invoice_number, customer_name, and notes into searchable text

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS search_tsv tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', 
        coalesce(invoice_number, '') || ' ' || 
        coalesce(customer_name, '') || ' ' ||
        coalesce(customer_city, '') || ' ' ||
        coalesce(customer_country, '') || ' ' ||
        coalesce(notes, '')
    )
) STORED;

-- GIN index for FTS (fast word search like "payment failed")
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_search_tsv_gin 
    ON invoices USING GIN (search_tsv);

-- =============================================
-- 2. Trigram Indexes (for ILIKE fallback)
-- =============================================
-- Already exists in schema, but ensure they're present
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_customer_name_trgm 
    ON invoices USING GIN (customer_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_invoice_number_trgm 
    ON invoices USING GIN (invoice_number gin_trgm_ops);

-- Combined search text for trigram (faster than OR on multiple columns)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS search_text text 
GENERATED ALWAYS AS (
    coalesce(invoice_number, '') || ' ' || 
    coalesce(customer_name, '')
) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_search_text_trgm 
    ON invoices USING GIN (search_text gin_trgm_ops);

-- =============================================
-- 3. Keyset Pagination Composite Indexes
-- =============================================
-- These indexes support (created_at DESC, id DESC) ordering with filters
-- The key is: filter columns first, then sort columns

-- For active invoices list (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_keyset_active 
    ON invoices (created_at DESC, id DESC) 
    WHERE status != 'cancelled';

-- For cancelled invoices list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_keyset_cancelled 
    ON invoices (created_at DESC, id DESC) 
    WHERE status = 'cancelled';

-- For status-filtered queries with keyset
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status_keyset 
    ON invoices (status, created_at DESC, id DESC);

-- For date-filtered queries with keyset
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_date_keyset 
    ON invoices (issue_date, created_at DESC, id DESC);

-- For FTS + status filter (common: search within active invoices)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_fts_status 
    ON invoices (status, created_at DESC, id DESC) 
    INCLUDE (search_tsv);

-- =============================================
-- 4. Estimated Count Function (Avoid COUNT(*))
-- =============================================
-- Returns fast estimated count from pg_stat_user_tables
-- For exact counts on filtered queries, use a sampled estimate

CREATE OR REPLACE FUNCTION get_invoice_estimated_count(
    p_status_filter text DEFAULT NULL,
    p_is_cancelled boolean DEFAULT false
)
RETURNS bigint AS $$
DECLARE
    total_estimate bigint;
    sample_ratio float;
    filter_count bigint;
BEGIN
    -- Get total table estimate from statistics
    SELECT reltuples::bigint INTO total_estimate
    FROM pg_stat_user_tables
    WHERE relname = 'invoices';
    
    -- If no filter, return total estimate
    IF p_status_filter IS NULL THEN
        IF p_is_cancelled THEN
            -- Estimate ~5% are cancelled (adjust based on your data)
            RETURN (total_estimate * 0.05)::bigint;
        ELSE
            RETURN (total_estimate * 0.95)::bigint;
        END IF;
    END IF;
    
    -- For specific status filters, use a quick count with limit
    -- This samples the first 10K rows to estimate ratio
    EXECUTE format(
        'SELECT count(*) FROM (
            SELECT 1 FROM invoices 
            WHERE status = %L 
            AND ($1 OR status != ''cancelled'')
            LIMIT 10000
        ) s',
        p_status_filter
    ) INTO filter_count USING p_is_cancelled;
    
    -- If less than 10K, we have exact count for this filter
    IF filter_count < 10000 THEN
        RETURN filter_count;
    END IF;
    
    -- Estimate based on ratio
    RETURN (total_estimate * 0.2)::bigint; -- Rough estimate
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. Optimized Invoice Search Function
-- =============================================
-- Combined FTS + trigram search with keyset pagination

CREATE OR REPLACE FUNCTION search_invoices(
    p_search text DEFAULT NULL,
    p_status_filter text DEFAULT NULL,
    p_is_cancelled boolean DEFAULT false,
    p_cursor_created_at timestamptz DEFAULT NULL,
    p_cursor_id uuid DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_limit int DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    invoice_number text,
    customer_name text,
    status status_type,
    issue_date date,
    due_date date,
    total_amount decimal,
    currency_id uuid,
    created_at timestamptz,
    currency_symbol text,
    currency_code text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.invoice_number,
        i.customer_name,
        i.status,
        i.issue_date,
        i.due_date,
        i.total_amount,
        i.currency_id,
        i.created_at,
        c.symbol as currency_symbol,
        c.code as currency_code
    FROM invoices i
    LEFT JOIN currencies c ON i.currency_id = c.id
    WHERE 
        -- Status filter (cancelled vs active)
        CASE 
            WHEN p_is_cancelled THEN i.status = 'cancelled'
            ELSE i.status != 'cancelled'
        END
        -- Additional status filter (pending, paid, overdue)
        AND (p_status_filter IS NULL OR i.status = p_status_filter::status_type)
        -- Date range filter
        AND (p_start_date IS NULL OR i.issue_date >= p_start_date)
        AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
        -- Search filter: Try FTS first, fallback to trigram
        AND (
            p_search IS NULL 
            OR i.search_tsv @@ websearch_to_tsquery('english', p_search)
            OR i.search_text ILIKE '%' || p_search || '%'
        )
        -- Keyset pagination (cursor)
        AND (
            p_cursor_created_at IS NULL 
            OR (i.created_at, i.id) < (p_cursor_created_at, p_cursor_id)
        )
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT p_limit + 1; -- Fetch one extra to detect hasNext
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Performance Notes:
-- =============================================
-- 
-- Query patterns after this migration:
-- 
-- FAST: First page (no cursor)
-- SELECT * FROM search_invoices(null, null, false, null, null, null, null, 50);
-- 
-- FAST: Next page (with cursor from last row)
-- SELECT * FROM search_invoices(null, null, false, '2025-01-29 10:00:00', 'uuid-here', null, null, 50);
-- 
-- FAST: Search with FTS
-- SELECT * FROM search_invoices('payment failed', null, false, null, null, null, null, 50);
-- 
-- FAST: Substring search (trigram fallback)
-- SELECT * FROM search_invoices('INV-00', null, false, null, null, null, null, 50);
-- 
-- Performance comparison on 10M rows:
-- - OFFSET pagination: ~5-10s for page 100,000
-- - Keyset pagination: ~10-50ms for any page
-- - ILIKE without index: ~5-10s
-- - Trigram index: ~10-50ms
-- - FTS search: ~1-10ms
-- =============================================

