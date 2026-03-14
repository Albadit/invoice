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

INSERT INTO roles (name, description, level, is_system) VALUES
    ('Super Admin',  'Full access to all resources. Cannot be removed.',  1, true),
    ('Admin',        'Administrative access. Can manage users and settings.', 2, true),
    ('Member',       'Can manage companies, clients, and invoices.',  3, false)
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
    -- Permission management
    ('permissions:access',   'Access permissions page', '/permissions'),
    ('permissions:read',     'View permissions',        NULL),
    ('permissions:create',   'Create permissions',      NULL),
    ('permissions:update',   'Update permissions',      NULL),
    ('permissions:delete',   'Delete permissions',      NULL),
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
  AND p.key NOT LIKE 'permissions:%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member: everything except role and user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Member'
  AND p.key NOT LIKE 'roles:%'
  AND p.key NOT LIKE 'users:%'
  AND p.key NOT LIKE 'permissions:%'
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