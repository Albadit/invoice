-- =============================================
-- Database Schema for Invoice Management System
-- =============================================
-- This schema is designed to be idempotent (safe to run multiple times)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- Enums
-- =============================================

-- Invoice status enumeration
DO $$ BEGIN
    CREATE TYPE status_type AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Amount type enumeration (for discounts, taxes, shipping)
DO $$ BEGIN
    CREATE TYPE amount_type AS ENUM ('percent', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- Functions
-- =============================================

-- Function to generate random invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    number_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 10-digit number
        new_number := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
        
        -- Check if this number already exists
        SELECT EXISTS(SELECT 1 FROM invoices WHERE invoice_number = new_number) INTO number_exists;
        
        -- If it doesn't exist, return it
        IF NOT number_exists THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice item total
CREATE OR REPLACE FUNCTION calculate_invoice_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Tables
-- =============================================

-- Currencies table
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    styling TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    street TEXT,
    city TEXT,
    zip_code TEXT,
    country TEXT,
    logo_url TEXT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
    tax_percent DECIMAL(5, 2),
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL DEFAULT generate_invoice_number(),
    status status_type NOT NULL DEFAULT 'pending',
    customer_name TEXT NOT NULL,
    customer_street TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    customer_zip_code TEXT NOT NULL,
    customer_country TEXT NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE DEFAULT CURRENT_DATE,
    discount_type amount_type,
    discount_amount DECIMAL(12, 2),
    discount_total_amount DECIMAL(12, 2),
    tax_type amount_type,
    tax_amount DECIMAL(12, 2),
    tax_total_amount DECIMAL(12, 2),
    shipping_type amount_type,
    shipping_amount DECIMAL(12, 2),
    shipping_total_amount DECIMAL(12, 2),
    notes TEXT,
    terms TEXT,
    subtotal_amount DECIMAL(12, 2),
    total_amount DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2),
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_currency_id ON invoices(currency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_template_id ON invoices(template_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- =============================================
-- Views
-- =============================================

-- Invoice summary view with company and customer details
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.status,
    i.issue_date,
    i.due_date,
    i.subtotal_amount,
    i.total_amount,
    i.customer_name,
    i.customer_city,
    i.customer_country,
    c.name AS company_name,
    cur.code AS currency_code,
    cur.symbol AS currency_symbol,
    i.created_at,
    i.updated_at
FROM invoices i
LEFT JOIN companies c ON i.company_id = c.id
LEFT JOIN currencies cur ON i.currency_id = cur.id;

-- Company invoice statistics
CREATE OR REPLACE VIEW company_invoice_stats AS
SELECT 
    c.id,
    c.name,
    COUNT(i.id) AS total_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN 1 ELSE 0 END), 0) AS overdue_invoices,
    COALESCE(SUM(i.total_amount), 0) AS total_amount,
    MAX(i.issue_date) AS last_invoice_date
FROM companies c
LEFT JOIN invoices i ON c.id = i.company_id
GROUP BY c.id, c.name;

-- Overdue invoices view
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT 
    i.id,
    i.invoice_number,
    i.company_id,
    c.name AS company_name,
    i.customer_name,
    i.issue_date,
    i.due_date,
    i.total_amount,
    (CURRENT_DATE - i.due_date) AS days_overdue
FROM invoices i
LEFT JOIN companies c ON i.company_id = c.id
WHERE i.status = 'overdue'
  AND i.due_date < CURRENT_DATE;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal DECIMAL(12, 2);
    v_discount_amount DECIMAL(12, 2);
    v_discount_type amount_type;
    v_tax_amount DECIMAL(12, 2);
    v_tax_type amount_type;
    v_shipping_amount DECIMAL(12, 2);
    v_shipping_type amount_type;
    v_total DECIMAL(12, 2);
BEGIN
    -- Determine invoice_id based on trigger source
    IF TG_TABLE_NAME = 'invoice_items' THEN
        v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    ELSE
        v_invoice_id := NEW.id;
    END IF;
    
    -- Calculate subtotal from invoice items
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_subtotal
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Get the invoice discount, tax, and shipping settings
    SELECT 
        COALESCE(discount_amount, 0),
        discount_type,
        COALESCE(tax_amount, 0),
        tax_type,
        COALESCE(shipping_amount, 0),
        shipping_type
    INTO v_discount_amount, v_discount_type, v_tax_amount, v_tax_type, v_shipping_amount, v_shipping_type
    FROM invoices
    WHERE id = v_invoice_id;
    
    -- Calculate discount amount
    IF v_discount_type = 'percent' THEN
        v_discount_amount := v_subtotal * (v_discount_amount / 100);
    END IF;
    
    -- Calculate tax amount (applied after discount)
    IF v_tax_type = 'percent' THEN
        v_tax_amount := (v_subtotal - v_discount_amount) * (v_tax_amount / 100);
    END IF;
    
    -- Calculate shipping amount
    IF v_shipping_type = 'percent' THEN
        v_shipping_amount := v_subtotal * (v_shipping_amount / 100);
    END IF;
    
    -- Calculate total
    v_total := v_subtotal - v_discount_amount + v_tax_amount + v_shipping_amount;
    
    -- Update invoice totals (set to NULL if 0)
    UPDATE invoices
    SET 
        subtotal_amount = v_subtotal,
        discount_total_amount = CASE WHEN v_discount_amount = 0 THEN NULL ELSE v_discount_amount END,
        tax_total_amount = CASE WHEN v_tax_amount = 0 THEN NULL ELSE v_tax_amount END,
        shipping_total_amount = CASE WHEN v_shipping_amount = 0 THEN NULL ELSE v_shipping_amount END,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = v_invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice status based on due date
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Triggers
-- =============================================

-- Triggers for updated_at columns
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to recalculate invoice totals when items change
-- Trigger to calculate invoice item total
DO $$ BEGIN
    DROP TRIGGER IF EXISTS calculate_item_total ON invoice_items;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER calculate_item_total
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_item_total();

-- Trigger to recalculate invoice totals when items change
DO $$ BEGIN
    DROP TRIGGER IF EXISTS recalculate_invoice_totals_from_items ON invoice_items;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER recalculate_invoice_totals_from_items
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Trigger to calculate invoice totals when invoice is created or updated
DO $$ BEGIN
    DROP TRIGGER IF EXISTS calculate_invoice_totals_on_change ON invoices;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER calculate_invoice_totals_on_change
    AFTER INSERT OR UPDATE OF discount_type, discount_amount, tax_type, tax_amount, shipping_type, shipping_amount ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- =============================================
-- Row Level Security (RLS) - Optional
-- =============================================
-- Uncomment and customize based on your authentication setup

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Example policy (customize based on your auth)
-- CREATE POLICY "Users can view their company data" ON invoices
--     FOR SELECT USING (company_id = (SELECT company_id FROM user_sessions WHERE user_id = auth.uid()));
