-- =============================================
-- Migration: Add Client Link to Invoices
-- =============================================
-- Links invoices to clients for record tracking.
-- Keeps existing customer_* fields as address snapshot (historical accuracy).

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
