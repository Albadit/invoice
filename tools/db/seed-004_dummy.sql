-- =============================================
-- Seed Dummy Users
-- =============================================

-- Create Admin user (admin role)
INSERT INTO auth.users (
    id, instance_id, role, aud, email,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, encrypted_password,
    created_at, updated_at, last_sign_in_at,
    email_confirmed_at, confirmation_sent_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'manager@test.com',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, crypt('Manager@123', gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(), NOW(),
    '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@test.com');

INSERT INTO auth.identities (id, provider_id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at)
SELECT u.id, u.id, 'email', u.id, json_build_object('sub', u.id), NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email = 'manager@test.com'
  AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u.id AND provider = 'email');

-- Create regular User (user role)
INSERT INTO auth.users (
    id, instance_id, role, aud, email,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, encrypted_password,
    created_at, updated_at, last_sign_in_at,
    email_confirmed_at, confirmation_sent_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'member@test.com',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, crypt('Member@123', gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(), NOW(),
    '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'member@test.com');

INSERT INTO auth.identities (id, provider_id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at)
SELECT u.id, u.id, 'email', u.id, json_build_object('sub', u.id), NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email = 'member@test.com'
  AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u.id AND provider = 'email');

-- Assign Admin role to manager@test.com
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u CROSS JOIN roles r
WHERE u.email = 'manager@test.com' AND r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign User role to member@test.com
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u CROSS JOIN roles r
WHERE u.email = 'member@test.com' AND r.name = 'Member'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =============================================
-- Seed Dummy Data (uses admin@admin.com)
-- =============================================

-- Get the admin user ID
DO $$
DECLARE
    _uid UUID;
BEGIN
    SELECT id INTO _uid FROM auth.users WHERE email = 'admin@admin.com' LIMIT 1;
    PERFORM set_config('seed.user_id', _uid::text, false);
END $$;

-- Insert sample companies with settings (only if they don't exist)
INSERT INTO companies (user_id, name, email, phone, street, city, zip_code, country, currency_id, template_id, tax_percent, terms)
SELECT
    current_setting('seed.user_id')::uuid,
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
CROSS JOIN (SELECT id FROM templates WHERE name = 'Classic' LIMIT 1) t
WHERE cur.code = company_data.currency_code
  AND NOT EXISTS (SELECT 1 FROM companies WHERE name = company_data.name);

-- Insert 10 sample invoices
INSERT INTO invoices (
    user_id,
    company_id,
    currency_id,
    template_id,
    invoice_code,
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
    current_setting('seed.user_id')::uuid,
    c.id,
    cur.id,
    t.id,
    inv.code,
    inv.status,
    inv.customer_name,
    inv.customer_street,
    inv.customer_city,
    inv.customer_zip_code,
    inv.customer_country,
    inv.issue_date,
    inv.due_date,
    inv.discount_type,
    inv.discount_amount,
    inv.tax_type,
    inv.tax_amount,
    inv.shipping_type,
    inv.shipping_amount,
    inv.notes,
    inv.terms
FROM (VALUES
    ('INV-2026-001', 'paid'::status_type,       'John Smith Enterprises',  '321 Customer Lane',     'Boston',        '02101',   'USA', 'Acme Corporation', 'USD', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', 'percent'::amount_type, 5.00,   'percent'::amount_type, 8.50,  'fixed'::amount_type,   15.00,  'Thank you for your business!',                                'Payment is due within 30 days of invoice date.'),
    ('INV-2026-002', 'pending'::status_type,     'Bright Media Group',      '88 Sunset Boulevard',   'Los Angeles',   '90028',   'USA', 'Acme Corporation', 'USD', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', NULL,                   NULL,   'percent'::amount_type, 8.50,  NULL,                   NULL,   'Rush delivery included.',                                     'Net 30. Late fees of 1.5% per month apply.'),
    ('INV-2026-003', 'overdue'::status_type,     'Northern Logistics AB',   '14 Harbor Street',      'Stockholm',     '11120',   'Sweden', 'TechStart Inc', 'USD', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', 'fixed'::amount_type,   25.00,  'percent'::amount_type, 9.00,  NULL,                   NULL,   NULL,                                                          'Payment is due within 15 days. We accept bank transfers.'),
    ('INV-2026-004', 'paid'::status_type,        'CloudPeak Solutions',     '502 Innovation Drive',  'Austin',        '73301',   'USA', 'Acme Corporation', 'USD', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '60 days', 'percent'::amount_type, 10.00,  'percent'::amount_type, 8.50,  'percent'::amount_type, 3.00,   'Project completed ahead of schedule.',                        'Payment is due within 30 days of invoice date.'),
    ('INV-2026-005', 'pending'::status_type,     'Greenfield Organics',     '27 Farm Road',          'Portland',      '97201',   'USA', 'TechStart Inc',    'USD', CURRENT_DATE - INTERVAL '5 days',  CURRENT_DATE + INTERVAL '10 days', NULL,                   NULL,   'percent'::amount_type, 9.00,  'fixed'::amount_type,   25.00,  'Organic certification included.',                             'Payment is due within 15 days.'),
    ('INV-2026-006', 'cancelled'::status_type,   'Atlas Construction Co',   '999 Builder Ave',       'Chicago',       '60601',   'USA', 'Acme Corporation', 'USD', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE,                      'fixed'::amount_type,   50.00,  'percent'::amount_type, 8.50,  NULL,                   NULL,   'Project cancelled per client request.',                       'Payment is due within 30 days of invoice date.'),
    ('INV-2026-007', 'paid'::status_type,        'Pinnacle Marketing Ltd',  '12 Oxford Street',      'London',        'W1D 1BS', 'UK',  'Global Solutions Ltd', 'GBP', CURRENT_DATE - INTERVAL '75 days', CURRENT_DATE - INTERVAL '45 days', NULL,                   NULL,   'percent'::amount_type, 20.00, NULL,                   NULL,   'Q4 campaign deliverables completed.',                         'Payment due within 14 days via bank transfer.'),
    ('INV-2026-008', 'pending'::status_type,     'Redwood Analytics Inc',   '340 Data Center Blvd',  'Seattle',       '98101',   'USA', 'TechStart Inc',    'USD', CURRENT_DATE - INTERVAL '3 days',  CURRENT_DATE + INTERVAL '12 days', 'percent'::amount_type, 8.00,   'percent'::amount_type, 9.00,  NULL,                   NULL,   'Monthly analytics retainer - February.',                      'Payment is due within 15 days.'),
    ('INV-2026-009', 'overdue'::status_type,     'Summit Event Planners',   '67 Convention Way',     'Las Vegas',     '89101',   'USA', 'Acme Corporation', 'USD', CURRENT_DATE - INTERVAL '50 days', CURRENT_DATE - INTERVAL '20 days', NULL,                   NULL,   'percent'::amount_type, 8.50,  'fixed'::amount_type,   200.00, 'Venue setup and AV equipment rental.',                        'Payment is due within 30 days. Late payments incur 1.5% monthly interest.'),
    ('INV-2026-010', 'paid'::status_type,        'Velocity Software Ltd',   '5 Cambridge Park',      'Cambridge',     'CB1 1PT', 'UK',  'Global Solutions Ltd', 'GBP', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '26 days', 'percent'::amount_type, 15.00,  'percent'::amount_type, 20.00, NULL,                   NULL,   'Annual license renewal and support.',                         'Payment due within 14 days via bank transfer.')
) AS inv(code, status, customer_name, customer_street, customer_city, customer_zip_code, customer_country, company_name, currency_code, issue_date, due_date, discount_type, discount_amount, tax_type, tax_amount, shipping_type, shipping_amount, notes, terms)
JOIN companies c ON c.name = inv.company_name
JOIN currencies cur ON cur.code = inv.currency_code
CROSS JOIN (SELECT id FROM templates WHERE name = 'Classic' LIMIT 1) t
ON CONFLICT (invoice_code) DO NOTHING;

-- Insert invoice items for each sample invoice
INSERT INTO invoice_items (invoice_id, name, quantity, unit_price, sort_order)
SELECT
    i.id,
    item.name,
    item.quantity,
    item.unit_price,
    item.sort_order
FROM invoices i
JOIN (VALUES
    -- INV-2026-001 items
    ('INV-2026-001', 'Web Development Services',        40.00,   75.00, 1),
    ('INV-2026-001', 'UI/UX Design',                    20.00,   85.00, 2),
    ('INV-2026-001', 'API Integration',                  10.00,   55.00, 3),
    ('INV-2026-001', 'Database Setup & Configuration',    1.00, 1000.00, 4),
    -- INV-2026-002 items
    ('INV-2026-002', 'Brand Strategy Workshop',           2.00,  500.00, 1),
    ('INV-2026-002', 'Social Media Campaign',             1.00, 2500.00, 2),
    ('INV-2026-002', 'Content Writing (10 articles)',    10.00,  150.00, 3),
    -- INV-2026-003 items
    ('INV-2026-003', 'Supply Chain Optimization',         1.00, 4500.00, 1),
    ('INV-2026-003', 'Warehouse Management Setup',        1.00, 3200.00, 2),
    ('INV-2026-003', 'Staff Training (per day)',          5.00,  800.00, 3),
    -- INV-2026-004 items
    ('INV-2026-004', 'Cloud Infrastructure Setup',        1.00, 3500.00, 1),
    ('INV-2026-004', 'CI/CD Pipeline Configuration',      1.00, 1800.00, 2),
    ('INV-2026-004', 'Monitoring & Alerting Setup',       1.00, 1200.00, 3),
    ('INV-2026-004', 'Documentation & Handover',          8.00,  100.00, 4),
    -- INV-2026-005 items
    ('INV-2026-005', 'Organic Produce Box (Large)',      50.00,   45.00, 1),
    ('INV-2026-005', 'Delivery Fee',                      1.00,  120.00, 2),
    -- INV-2026-006 items
    ('INV-2026-006', 'Site Survey & Assessment',          1.00, 2000.00, 1),
    ('INV-2026-006', 'Architectural Drawings',            1.00, 5000.00, 2),
    ('INV-2026-006', 'Permit Application Processing',     1.00,  750.00, 3),
    -- INV-2026-007 items
    ('INV-2026-007', 'SEO Audit & Report',                1.00, 1500.00, 1),
    ('INV-2026-007', 'PPC Campaign Management',           1.00, 2800.00, 2),
    ('INV-2026-007', 'Email Marketing Automation',        1.00, 1200.00, 3),
    ('INV-2026-007', 'Analytics Dashboard Setup',         1.00,  900.00, 4),
    -- INV-2026-008 items
    ('INV-2026-008', 'Data Pipeline Maintenance',        20.00,  125.00, 1),
    ('INV-2026-008', 'Custom Report Generation',          5.00,  300.00, 2),
    ('INV-2026-008', 'A/B Test Analysis',                 3.00,  450.00, 3),
    -- INV-2026-009 items
    ('INV-2026-009', 'Venue Rental (3 days)',             3.00, 2500.00, 1),
    ('INV-2026-009', 'AV Equipment Package',              1.00, 3500.00, 2),
    ('INV-2026-009', 'Catering Service (per head)',     150.00,   35.00, 3),
    ('INV-2026-009', 'Event Photography',                 1.00, 1200.00, 4),
    ('INV-2026-009', 'Decoration & Setup',                1.00, 1800.00, 5),
    -- INV-2026-010 items
    ('INV-2026-010', 'Enterprise License (Annual)',       1.00, 8000.00, 1),
    ('INV-2026-010', 'Priority Support Plan',             1.00, 2400.00, 2),
    ('INV-2026-010', 'Custom Integration Module',         1.00, 3500.00, 3)
) AS item(invoice_code, name, quantity, unit_price, sort_order)
    ON i.invoice_code = item.invoice_code
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_items
    WHERE invoice_id = i.id AND name = item.name
);
