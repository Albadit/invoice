-- Insert sample companies with settings (only if they don't exist)
INSERT INTO companies (name, email, phone, street, city, zip_code, country, currency_id, template_id, tax_percent, terms)
SELECT
    company_data.name,
    company_data.email,
    company_data.phone,
    company_data.street,
    company_data.city,
    company_data.zip_code,
    company_data.country,
    cur.id,
    t.id,
    company_data.tax_percent,
    company_data.terms
FROM (VALUES
    ('Acme Corporation', 'contact@acme.com', '+1-555-0100', '123 Main Street', 'New York', '10001', 'USA', 'USD', 8.50, 'Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly interest charge. Please include invoice number with payment.'),
    ('TechStart Inc', 'info@techstart.com', '+1-555-0200', '456 Tech Avenue', 'San Francisco', '94102', 'USA', 'USD', 9.00, 'Payment is due within 15 days. We accept all major credit cards and bank transfers.'),
    ('Global Solutions Ltd', 'hello@globalsolutions.com', '+44-20-5550-0300', '789 Business Road', 'London', 'SW1A 1AA', 'UK', 'GBP', 20.00, 'Payment is due within 14 days of invoice date. Please remit payment via bank transfer to the account details provided.')
) AS company_data(name, email, phone, street, city, zip_code, country, currency_code, tax_percent, terms)
CROSS JOIN currencies cur
CROSS JOIN (SELECT id FROM templates LIMIT 1) t
WHERE cur.code = company_data.currency_code
  AND NOT EXISTS (SELECT 1 FROM companies WHERE name = company_data.name);

-- Insert 300,000 test invoices using bulk insert (much faster than row-by-row)
-- This uses generate_series to create all rows in a single statement

-- First, disable statement timeout for this session
SET statement_timeout = 0;

-- Bulk insert invoices
INSERT INTO invoices (
    company_id, 
    currency_id, 
    template_id,
    invoice_number, 
    status, 
    customer_name, 
    customer_street, 
    customer_city, 
    customer_zip_code, 
    customer_country,
    issue_date,
    due_date,
    discount_type,
    discount_amount,
    tax_type,
    tax_amount,
    shipping_type,
    shipping_amount,
    notes,
    terms,
    subtotal_amount,
    total_amount
)
SELECT 
    c.id,
    cur.id,
    t.id,
    'TEST-' || LPAD(i::TEXT, 10, '0'),
    (ARRAY['pending', 'paid', 'overdue', 'cancelled']::status_type[])[1 + (i % 4)],
    (ARRAY['John Smith Enterprises', 'Jane Doe LLC', 'ABC Corp', 'XYZ Industries', 'Tech Solutions', 'Global Trading Co', 'Innovation Labs', 'Digital Services Inc', 'Prime Consulting', 'Elite Solutions'])[1 + (i % 10)],
    (100 + (i % 999))::TEXT || ' Test Street',
    (ARRAY['Boston', 'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas'])[1 + (i % 10)],
    LPAD((10000 + (i % 90000))::TEXT, 5, '0'),
    'USA',
    CURRENT_DATE - ((i % 365) || ' days')::INTERVAL,
    CURRENT_DATE - ((i % 365) || ' days')::INTERVAL + INTERVAL '30 days',
    CASE WHEN i % 3 = 0 THEN 'fixed'::amount_type ELSE 'percent'::amount_type END,
    (5 + (i % 20))::NUMERIC,
    'percent'::amount_type,
    (5 + (i % 15))::NUMERIC,
    CASE WHEN i % 4 = 0 THEN 'fixed'::amount_type ELSE NULL END,
    CASE WHEN i % 4 = 0 THEN (10 + (i % 50))::NUMERIC ELSE NULL END,
    'Test invoice #' || i,
    'Payment due within 30 days.',
    (100 + (i % 900))::NUMERIC,
    (100 + (i % 900) + (i % 50))::NUMERIC
FROM generate_series(1, 300000) AS i
CROSS JOIN (SELECT id FROM companies WHERE name = 'Acme Corporation' LIMIT 1) c
CROSS JOIN (SELECT id FROM currencies WHERE code = 'USD' LIMIT 1) cur
CROSS JOIN (SELECT id FROM templates LIMIT 1) t
ON CONFLICT (invoice_number) DO NOTHING;

-- Bulk insert invoice items (3 items per invoice on average)
INSERT INTO invoice_items (invoice_id, name, quantity, unit_price, total_amount, sort_order)
SELECT 
    inv.id,
    (ARRAY['Web Development Services', 'UI/UX Design', 'API Integration', 'Database Setup', 'Consulting Hours', 'Support Package', 'License Fee', 'Maintenance', 'Training Session', 'Custom Development'])[1 + ((row_number() OVER (PARTITION BY inv.id)) % 10)],
    (1 + (row_number() OVER (PARTITION BY inv.id) * 5))::NUMERIC,
    (25 + (EXTRACT(EPOCH FROM inv.created_at)::INTEGER % 200))::NUMERIC,
    (1 + (row_number() OVER (PARTITION BY inv.id) * 5))::NUMERIC * (25 + (EXTRACT(EPOCH FROM inv.created_at)::INTEGER % 200))::NUMERIC,
    row_number() OVER (PARTITION BY inv.id)
FROM invoices inv
CROSS JOIN generate_series(1, 3) AS item_num
WHERE inv.invoice_number LIKE 'TEST-%'
  AND NOT EXISTS (SELECT 1 FROM invoice_items WHERE invoice_id = inv.id);

-- Reset statement timeout to default
RESET statement_timeout;
