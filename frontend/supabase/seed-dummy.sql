-- Insert sample companies with settings
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
ON CONFLICT DO NOTHING;

-- Insert sample invoice
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
    terms
)
SELECT 
    c.id,
    cur.id,
    t.id,
    '1234567890',
    'pending'::status_type,
    'John Smith Enterprises',
    '321 Customer Lane',
    'Boston',
    '02101',
    'USA',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'fixed'::amount_type,
    10.00,
    'percent'::amount_type,
    8.50,
    NULL,
    NULL,
    'Thank you for your business! We appreciate your prompt payment.',
    'Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly interest charge.'
FROM companies c
CROSS JOIN currencies cur
CROSS JOIN (SELECT id FROM templates LIMIT 1) t
WHERE c.name = 'Acme Corporation'
  AND cur.code = 'USD'
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert invoice items for the sample invoice
INSERT INTO invoice_items (invoice_id, name, quantity, unit_price, sort_order)
SELECT 
    i.id,
    item.name,
    item.quantity,
    item.unit_price,
    item.sort_order
FROM (
    SELECT id FROM invoices WHERE invoice_number = '1234567890' LIMIT 1
) i,
(VALUES
    ('Web Development Services', 40.00, 75.00, 1),
    ('UI/UX Design', 20.00, 85.00, 2),
    ('API Integration', 10.00, 55.00, 3),
    ('Database Setup & Configuration', 1.00, 1000.00, 4)
) AS item(name, quantity, unit_price, sort_order)
ON CONFLICT DO NOTHING;
