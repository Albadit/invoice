-- =============================================
-- Migration: Fix SECURITY DEFINER views and mutable search_path
-- =============================================
-- Fixes:
--   1. Set search_path on all functions (prevent mutable search_path)
--   2. Convert views from SECURITY DEFINER to SECURITY INVOKER
-- =============================================

-- =============================================
-- 1. Set search_path on all functions
-- =============================================

-- generate_invoice_code
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
$$ LANGUAGE plpgsql SET search_path = public;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- calculate_invoice_item_total
CREATE OR REPLACE FUNCTION calculate_invoice_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- calculate_invoice_totals
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
    IF TG_TABLE_NAME = 'invoice_items' THEN
        v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    ELSE
        v_invoice_id := NEW.id;
    END IF;
    
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_subtotal
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
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
    
    IF v_discount_type = 'percent' THEN
        v_discount_amount := v_subtotal * (v_discount_amount / 100);
    END IF;
    
    IF v_tax_type = 'percent' THEN
        v_tax_amount := (v_subtotal - v_discount_amount) * (v_tax_amount / 100);
    END IF;
    
    IF v_shipping_type = 'percent' THEN
        v_shipping_amount := v_subtotal * (v_shipping_amount / 100);
    END IF;
    
    v_total := v_subtotal - v_discount_amount + v_tax_amount + v_shipping_amount;
    
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
$$ LANGUAGE plpgsql SET search_path = public;

-- update_invoice_status
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 2. Recreate views with SECURITY INVOKER
-- =============================================

CREATE OR REPLACE VIEW invoice_summary
WITH (security_invoker = true) AS
SELECT 
    i.id,
    i.invoice_code,
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

CREATE OR REPLACE VIEW company_invoice_stats
WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW overdue_invoices
WITH (security_invoker = true) AS
SELECT 
    i.id,
    i.invoice_code,
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
