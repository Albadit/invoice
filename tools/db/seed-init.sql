-- =============================================
-- Seed Admin User
-- =============================================

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
    'authenticated',
    'authenticated',
    'admin@admin.com',
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    crypt('Admin@123', gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(), NOW(),
    '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com');

INSERT INTO auth.identities (
    id, provider_id, provider, user_id,
    identity_data, last_sign_in_at, created_at, updated_at
)
SELECT
    u.id, u.id, 'email', u.id,
    json_build_object('sub', u.id),
    NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email = 'admin@admin.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = u.id AND provider = 'email'
  );

-- =============================================
-- Seed System Roles
-- =============================================

INSERT INTO roles (name, description, is_system) VALUES
    ('Super Admin',  'Full access to all resources. Cannot be removed.',  true),
    ('Admin',        'Administrative access. Can manage users and settings.', true),
    ('Member',       'Can manage companies, clients, and invoices.',  true)
ON CONFLICT DO NOTHING;

-- =============================================
-- Seed Permissions
-- =============================================

INSERT INTO permissions (key, description, route) VALUES
    -- User permissions
    ('users:access',         'Access users page',       '/users'),
    ('users:read',           'View users',              NULL),
    ('users:create',         'Create users',            NULL),
    ('users:update',         'Update users',            NULL),
    ('users:delete',         'Delete users',            NULL),
    -- Role permissions
    ('roles:access',         'Access roles page',       '/roles'),
    ('roles:read',           'View roles',              NULL),
    ('roles:create',         'Create roles',            NULL),
    ('roles:update',         'Update roles',            NULL),
    ('roles:delete',         'Delete roles',            NULL),
    -- Company permissions
    ('companies:access',     'Access companies page',   '/companies'),
    ('companies:read',       'View companies',          NULL),
    ('companies:create',     'Create companies',        NULL),
    ('companies:update',     'Update companies',        NULL),
    ('companies:delete',     'Delete companies',        NULL),
    -- Client permissions
    ('clients:access',       'Access clients page',     '/clients'),
    ('clients:read',         'View clients',            NULL),
    ('clients:create',       'Create clients',          NULL),
    ('clients:update',       'Update clients',          NULL),
    ('clients:delete',       'Delete clients',          NULL),
    -- Invoice permissions
    ('invoices:access',      'Access invoices page',    '/invoice'),
    ('invoices:read',        'View invoices',           NULL),
    ('invoices:create',      'Create invoices',         NULL),
    ('invoices:update',      'Update invoices',         NULL),
    ('invoices:delete',      'Delete invoices',         NULL),
    -- Template permissions
    ('templates:access',     'Access templates page',   '/editor'),
    ('templates:read',       'View templates',          NULL),
    ('templates:create',     'Create templates',        NULL),
    ('templates:update',     'Update templates',        NULL),
    ('templates:delete',     'Delete templates',        NULL),
    -- Currency permissions
    ('currencies:access',    'Access currencies page',  '/currencies'),
    ('currencies:read',      'View currencies',         NULL),
    ('currencies:create',    'Create currencies',       NULL),
    ('currencies:update',    'Update currencies',       NULL),
    ('currencies:delete',    'Delete currencies',       NULL),
    -- Settings
    ('settings:access',      'Access settings page',    '/settings'),
    ('settings:read',        'View settings',           NULL),
    ('settings:create',      'Create settings',         NULL),
    ('settings:update',      'Update settings',         NULL),
    ('settings:delete',      'Delete settings',         NULL),
    -- Dashboard
    ('dashboard:access',     'Access dashboard page',   '/dashboard'),
    ('dashboard:read',       'View dashboard and analytics', NULL)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- Seed Role ↔ Permission mappings
-- =============================================

-- Super Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets everything except role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.key NOT LIKE 'roles:%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member: everything except role and user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Member'
  AND p.key NOT LIKE 'roles:%'
  AND p.key NOT LIKE 'users:%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================
-- Assign Super Admin role to admin user
-- =============================================

INSERT INTO user_roles (user_id, role_id, is_system)
SELECT u.id, r.id, true
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'admin@admin.com'
  AND r.name = 'Super Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =============================================
-- Seed Invoice Management System
-- =============================================

-- Insert system currencies (is_system = true, no user_id)
INSERT INTO currencies (code, name, symbol, symbol_position, symbol_space, is_system) VALUES
    ('USD', 'US Dollar', '$', 'left', false, true),
    ('EUR', 'Euro', '€', 'right', true, true),
    ('GBP', 'British Pound', '£', 'left', false, true),
    ('JPY', 'Japanese Yen', '¥', 'left', false, true),
    ('CHF', 'Swiss Franc', 'CHF', 'left', true, true)
ON CONFLICT (code) DO UPDATE SET is_system = true;

-- Insert system templates (is_system = true, no user_id)
INSERT INTO templates (name, styling, is_system)
SELECT 'Classic', $TEMPLATE$<div class="w-full h-full bg-white flex flex-col gap-8">
  <div class="flex flex-col gap-4">
    <div class="flex justify-between">
      {{#if company.logo_url}}
        <img src="{{ company.logo_url }}" alt="Logo" class="h-16" />
      {{else}}
        <div class="h-16 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm font-bold">Logo Demo</div>
      {{/if}}
      <div class="flex flex-col gap-2 text-right">
        <h2 class="text-4xl font-bold text-slate-900">{{ lang.invoiceTitle }}</h2>
        <p class="text-2xl text-slate-600 font-semibold">#{{ invoice.invoice_code }}</p>
      </div>
    </div>
    <div class="flex justify-between">
      <div class="flex flex-col">
        <h1 class="text-2xl font-bold text-gray-900">{{ company.name }}</h1>
        {{#if company.street}}<p class="text-sm text-gray-600">{{ company.street }}</p>{{/if}}
        {{#if company.city}}<p class="text-sm text-gray-600">{{ company.city }}{{#if company.zip_code}}, {{ company.zip_code }}{{/if}}</p>{{/if}}
        {{#if company.country}}<p class="text-sm text-gray-600">{{ company.country }}</p>{{/if}}
        {{#if company.email}}<p class="text-sm text-gray-600">{{ company.email }}</p>{{/if}}
        {{#if company.phone}}<p class="text-sm text-gray-600">{{ company.phone }}</p>{{/if}}
        {{#if company.vat_number}}<p class="text-sm text-gray-600"><span class="font-semibold">{{ lang.vatNumber }}:</span> {{ company.vat_number }}</p>{{/if}}
        {{#if company.coc_number}}<p class="text-sm text-gray-600"><span class="font-semibold">{{ lang.cocNumber }}:</span> {{ company.coc_number }}</p>{{/if}}
      </div>
      <div class="flex flex-col gap-1">
        {{#if invoice.issue_date}}
          <div class="flex justify-end gap-3">
            <span class="text-sm font-semibold text-gray-600">{{ lang.issueDate }}:</span>
            <span class="text-sm text-gray-900">{{ date.issue_date }}</span>
          </div>
        {{/if}}
        {{#if invoice.due_date}}
          <div class="flex justify-end gap-3">
            <span class="text-sm font-semibold text-gray-600">{{ lang.dueDate }}:</span>
            <span class="text-sm text-gray-900">{{ date.due_date }}</span>
          </div>
        {{/if}}
      </div>
    </div>
  </div>
  <hr class="border-1 border-gray-200"/>
  <div class="flex flex-col">
    <h3 class="text-xs font-bold uppercase text-gray-600">{{ lang.billTo }}:</h3>
    <p class="text-lg font-semibold text-gray-900">{{ customer.name }}</p>
    {{#if customer.street}}<p class="text-sm text-gray-600">{{ customer.street }}</p>{{/if}}
    {{#if customer.city}}<p class="text-sm text-gray-600">{{ customer.city }}</p>{{/if}}
    {{#if customer.country}}<p class="text-sm text-gray-600">{{ customer.country }}</p>{{/if}}
  </div>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-12 border-b-2 py-3 border-slate-900">
      <div class="col-span-5 text-sm font-bold text-slate-900 uppercase">{{ lang.item }}</div>
      <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-sm font-bold text-slate-900 uppercase text-right">{{ lang.amount }}</div>
    </div>
    {{#each items in item}}
      <div class="grid grid-cols-12">
        <span class="col-span-5 text-slate-700">{{ item.name }}</span>
        <span class="col-span-2 text-slate-700 text-center">{{ item.quantity }}</span>
        <span class="col-span-2 text-slate-700 text-right">{{ item.fc.unit_price }}</span>
        <span class="col-span-3 text-slate-900 font-semibold text-right">{{ item.fc.amount }}</span>
      </div>
    {{/each}}
  </div>
  <div class="grid grid-cols-2 gap-8 grow content-end">
    <div class="flex flex-col gap-8">
      <div>
        <h4 class="text-sm font-bold text-gray-900">{{ lang.notes }}</h4>
        <p class="text-sm text-gray-600 whitespace-pre-line">{{ invoice.notes }}</p>
      </div>
      <div>
        <h4 class="text-sm font-bold text-gray-900">{{ lang.terms }}</h4>
        <p class="text-sm text-gray-600 whitespace-pre-line">{{ invoice.terms }}</p>
      </div>
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex justify-between text-slate-700">
        <span class="font-semibold text-gray-700">{{ lang.subtotal }}:</span>
        <span class="font-semibold text-gray-900">{{ fc.subtotal_amount }}</span>
      </div>
      {{#if invoice.discount_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.discount_label }}{{#if invoice.discount_is_percent}} ({{ invoice.discount }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">-{{ fc.discount_total_amount }}</span>
        </div>
      {{/if}}
      {{#if invoice.tax_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.tax_label }}{{#if invoice.tax_is_percent}} ({{ invoice.tax }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">{{ fc.tax_total_amount }}</span>
        </div>
      {{/if}}
      {{#if invoice.shipping_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.shipping_label }}{{#if invoice.shipping_is_percent}} ({{ invoice.shipping }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">{{ fc.shipping_total_amount }}</span>
        </div>
      {{/if}}
      <div class="flex justify-between items-center pt-2 border-t">
        <span class="text-xl font-bold text-gray-900">{{ lang.total }}:</span>
        <span class="text-2xl font-bold text-gray-900">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</div>$TEMPLATE$, true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Classic');

-- Ensure Classic template is flagged as system
UPDATE templates SET is_system = true WHERE name = 'Classic' AND user_id IS NULL;