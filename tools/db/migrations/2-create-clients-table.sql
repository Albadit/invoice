-- =============================================
-- Migration: Create Clients Table
-- =============================================
-- Clients represent billable entities (customers, companies, individuals)
-- that invoices can be linked to for record tracking.

CREATE TABLE IF NOT EXISTS clients (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    street      TEXT,
    city        TEXT,
    zip_code    TEXT,
    country     TEXT,
    tax_id      TEXT,          -- VAT number / Tax ID
    notes       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Trigger for updated_at
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
