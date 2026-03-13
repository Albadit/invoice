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

-- Insert system currencies (is_system = true, no user_id)
-- Rates sourced from ExchangeRate-API (base: USD)
INSERT INTO currencies (code, name, symbol, symbol_position, symbol_space, exchange_rate, is_system) VALUES
    ('USD', 'US Dollar', '$', 'left', false, 1.0, true),
    ('AED', 'UAE Dirham', 'د.إ', 'right', true, 3.6725, true),
    ('AFN', 'Afghan Afghani', '؋', 'right', true, 63.2080, true),
    ('ALL', 'Albanian Lek', 'L', 'left', false, 83.1248, true),
    ('AMD', 'Armenian Dram', '֏', 'right', true, 377.1243, true),
    ('ANG', 'Netherlands Antillean Guilder', 'ƒ', 'left', false, 1.7900, true),
    ('AOA', 'Angolan Kwanza', 'Kz', 'left', true, 920.7029, true),
    ('ARS', 'Argentine Peso', '$', 'left', false, 1452.2500, true),
    ('AUD', 'Australian Dollar', 'A$', 'left', false, 1.4096, true),
    ('AWG', 'Aruban Florin', 'ƒ', 'left', false, 1.7900, true),
    ('AZN', 'Azerbaijani Manat', '₼', 'left', false, 1.7000, true),
    ('BAM', 'Bosnia-Herzegovina Convertible Mark', 'KM', 'left', true, 1.6963, true),
    ('BBD', 'Barbadian Dollar', 'Bds$', 'left', false, 2.0000, true),
    ('BDT', 'Bangladeshi Taka', '৳', 'left', false, 122.6861, true),
    ('BGN', 'Bulgarian Lev', 'лв', 'right', true, 1.6373, true),
    ('BHD', 'Bahraini Dinar', '.د.ب', 'right', true, 0.3760, true),
    ('BIF', 'Burundian Franc', 'FBu', 'left', true, 2973.2731, true),
    ('BMD', 'Bermudian Dollar', '$', 'left', false, 1.0000, true),
    ('BND', 'Brunei Dollar', 'B$', 'left', false, 1.2775, true),
    ('BOB', 'Bolivian Boliviano', 'Bs.', 'left', false, 6.9256, true),
    ('BRL', 'Brazilian Real', 'R$', 'left', true, 5.1807, true),
    ('BSD', 'Bahamian Dollar', 'B$', 'left', false, 1.0000, true),
    ('BTN', 'Bhutanese Ngultrum', 'Nu.', 'left', false, 92.3811, true),
    ('BWP', 'Botswanan Pula', 'P', 'left', false, 13.7589, true),
    ('BYN', 'Belarusian Ruble', 'Br', 'left', true, 2.9385, true),
    ('BZD', 'Belize Dollar', 'BZ$', 'left', false, 2.0000, true),
    ('CAD', 'Canadian Dollar', 'C$', 'left', false, 1.3620, true),
    ('CDF', 'Congolese Franc', 'FC', 'left', true, 2195.8080, true),
    ('CHF', 'Swiss Franc', 'CHF', 'left', true, 0.7845, true),
    ('CLP', 'Chilean Peso', 'CL$', 'left', false, 897.4946, true),
    ('CNY', 'Chinese Yuan', '¥', 'left', false, 6.8813, true),
    ('COP', 'Colombian Peso', 'COL$', 'left', false, 3701.1558, true),
    ('CRC', 'Costa Rican Colón', '₡', 'left', false, 472.1819, true),
    ('CUP', 'Cuban Peso', '₱', 'left', false, 24.0000, true),
    ('CVE', 'Cape Verdean Escudo', 'Esc', 'left', true, 95.6325, true),
    ('CZK', 'Czech Koruna', 'Kč', 'right', true, 21.1716, true),
    ('DJF', 'Djiboutian Franc', 'Fdj', 'left', true, 177.7210, true),
    ('DKK', 'Danish Krone', 'kr', 'left', true, 6.4706, true),
    ('DOP', 'Dominican Peso', 'RD$', 'left', false, 60.9189, true),
    ('DZD', 'Algerian Dinar', 'د.ج', 'right', true, 131.6265, true),
    ('EGP', 'Egyptian Pound', 'E£', 'left', false, 52.4044, true),
    ('ERN', 'Eritrean Nakfa', 'Nfk', 'left', true, 15.0000, true),
    ('ETB', 'Ethiopian Birr', 'Br', 'left', true, 154.7961, true),
    ('EUR', 'Euro', '€', 'right', true, 0.8673, true),
    ('FJD', 'Fijian Dollar', 'FJ$', 'left', false, 2.1990, true),
    ('FKP', 'Falkland Islands Pound', '£', 'left', false, 0.7485, true),
    ('GBP', 'British Pound', '£', 'left', false, 0.7485, true),
    ('GEL', 'Georgian Lari', '₾', 'left', false, 2.7281, true),
    ('GHS', 'Ghanaian Cedi', 'GH₵', 'left', false, 10.8196, true),
    ('GIP', 'Gibraltar Pound', '£', 'left', false, 0.7485, true),
    ('GMD', 'Gambian Dalasi', 'D', 'left', true, 74.1383, true),
    ('GNF', 'Guinean Franc', 'FG', 'left', true, 8757.4990, true),
    ('GTQ', 'Guatemalan Quetzal', 'Q', 'left', false, 7.6667, true),
    ('GYD', 'Guyanaese Dollar', 'GY$', 'left', false, 208.9421, true),
    ('HKD', 'Hong Kong Dollar', 'HK$', 'left', false, 7.8271, true),
    ('HNL', 'Honduran Lempira', 'L', 'left', true, 26.5025, true),
    ('HRK', 'Croatian Kuna', 'kn', 'right', true, 6.5346, true),
    ('HTG', 'Haitian Gourde', 'G', 'left', true, 130.8846, true),
    ('HUF', 'Hungarian Forint', 'Ft', 'right', true, 338.1294, true),
    ('IDR', 'Indonesian Rupiah', 'Rp', 'left', false, 16880.2689, true),
    ('ILS', 'Israeli New Sheqel', '₪', 'left', false, 3.1358, true),
    ('INR', 'Indian Rupee', '₹', 'left', false, 92.3820, true),
    ('IQD', 'Iraqi Dinar', 'ع.د', 'right', true, 1308.2598, true),
    ('IRR', 'Iranian Rial', '﷼', 'right', true, 1022507.7533, true),
    ('ISK', 'Icelandic Króna', 'kr', 'left', true, 125.2301, true),
    ('JMD', 'Jamaican Dollar', 'J$', 'left', false, 156.8224, true),
    ('JOD', 'Jordanian Dinar', 'د.ا', 'right', true, 0.7090, true),
    ('JPY', 'Japanese Yen', '¥', 'left', false, 159.1443, true),
    ('KES', 'Kenyan Shilling', 'KSh', 'left', true, 129.2872, true),
    ('KGS', 'Kyrgystani Som', 'сом', 'right', true, 87.3917, true),
    ('KHR', 'Cambodian Riel', '៛', 'right', true, 4020.0742, true),
    ('KMF', 'Comorian Franc', 'CF', 'left', true, 426.6820, true),
    ('KRW', 'South Korean Won', '₩', 'left', false, 1484.6468, true),
    ('KWD', 'Kuwaiti Dinar', 'د.ك', 'right', true, 0.3068, true),
    ('KYD', 'Cayman Islands Dollar', 'CI$', 'left', false, 0.8333, true),
    ('KZT', 'Kazakhstani Tenge', '₸', 'left', false, 490.2034, true),
    ('LAK', 'Laotian Kip', '₭', 'left', false, 21557.9895, true),
    ('LBP', 'Lebanese Pound', 'ل.ل', 'right', true, 89500.0000, true),
    ('LKR', 'Sri Lankan Rupee', 'Rs', 'left', true, 310.9508, true),
    ('LRD', 'Liberian Dollar', 'L$', 'left', false, 183.0053, true),
    ('LSL', 'Lesotho Loti', 'L', 'left', true, 16.7253, true),
    ('LYD', 'Libyan Dinar', 'ل.د', 'right', true, 6.3520, true),
    ('MAD', 'Moroccan Dirham', 'MAD', 'left', true, 9.3830, true),
    ('MDL', 'Moldovan Leu', 'L', 'left', true, 17.2726, true),
    ('MGA', 'Malagasy Ariary', 'Ar', 'left', true, 4146.7257, true),
    ('MKD', 'Macedonian Denar', 'ден', 'right', true, 53.1326, true),
    ('MMK', 'Myanma Kyat', 'K', 'left', false, 2099.5921, true),
    ('MNT', 'Mongolian Tugrik', '₮', 'left', false, 3552.9500, true),
    ('MOP', 'Macanese Pataca', 'MOP$', 'left', false, 8.0619, true),
    ('MRU', 'Mauritanian Ouguiya', 'UM', 'left', true, 39.9355, true),
    ('MUR', 'Mauritian Rupee', 'Rs', 'left', true, 45.8674, true),
    ('MVR', 'Maldivian Rufiyaa', 'Rf.', 'left', true, 15.4543, true),
    ('MWK', 'Malawian Kwacha', 'MK', 'left', true, 1739.2560, true),
    ('MXN', 'Mexican Peso', 'Mex$', 'left', false, 17.8216, true),
    ('MYR', 'Malaysian Ringgit', 'RM', 'left', true, 3.9263, true),
    ('MZN', 'Mozambican Metical', 'MT', 'left', true, 63.5814, true),
    ('NAD', 'Namibian Dollar', 'N$', 'left', false, 16.7253, true),
    ('NGN', 'Nigerian Naira', '₦', 'left', false, 1390.2354, true),
    ('NIO', 'Nicaraguan Córdoba', 'C$', 'left', false, 36.7959, true),
    ('NOK', 'Norwegian Krone', 'kr', 'left', true, 9.6869, true),
    ('NPR', 'Nepalese Rupee', 'रू', 'left', false, 147.8098, true),
    ('NZD', 'New Zealand Dollar', 'NZ$', 'left', false, 1.7059, true),
    ('OMR', 'Omani Rial', 'ر.ع.', 'right', true, 0.3845, true),
    ('PAB', 'Panamanian Balboa', 'B/.', 'left', false, 1.0000, true),
    ('PEN', 'Peruvian Nuevo Sol', 'S/.', 'left', false, 3.4352, true),
    ('PGK', 'Papua New Guinean Kina', 'K', 'left', true, 4.3122, true),
    ('PHP', 'Philippine Peso', '₱', 'left', false, 59.4921, true),
    ('PKR', 'Pakistani Rupee', 'Rs', 'left', true, 279.5210, true),
    ('PLN', 'Polish Zloty', 'zł', 'right', true, 3.7004, true),
    ('PYG', 'Paraguayan Guarani', '₲', 'left', false, 6503.6304, true),
    ('QAR', 'Qatari Rial', 'ر.ق', 'right', true, 3.6400, true),
    ('RON', 'Romanian Leu', 'lei', 'left', true, 4.4121, true),
    ('RSD', 'Serbian Dinar', 'дин.', 'right', true, 101.7873, true),
    ('RUB', 'Russian Ruble', '₽', 'right', true, 79.3476, true),
    ('RWF', 'Rwandan Franc', 'RF', 'left', true, 1460.7410, true),
    ('SAR', 'Saudi Riyal', 'ر.س', 'right', true, 3.7500, true),
    ('SBD', 'Solomon Islands Dollar', 'SI$', 'left', false, 7.9291, true),
    ('SCR', 'Seychellois Rupee', '₨', 'left', false, 14.0835, true),
    ('SDG', 'Sudanese Pound', 'ج.س.', 'right', true, 510.3250, true),
    ('SEK', 'Swedish Krona', 'kr', 'right', true, 9.3301, true),
    ('SGD', 'Singapore Dollar', 'S$', 'left', false, 1.2776, true),
    ('SHP', 'Saint Helena Pound', '£', 'left', false, 0.7485, true),
    ('SLE', 'Sierra Leonean Leone', 'Le', 'left', true, 24.2891, true),
    ('SOS', 'Somali Shilling', 'Sh', 'left', true, 569.9537, true),
    ('SRD', 'Surinamese Dollar', 'SRD', 'left', true, 37.5147, true),
    ('SSP', 'South Sudanese Pound', '£', 'left', true, 4571.7840, true),
    ('STN', 'São Tomé and Príncipe Dobra', 'Db', 'left', true, 21.2488, true),
    ('SYP', 'Syrian Pound', '£S', 'left', false, 112.9746, true),
    ('SZL', 'Swazi Lilangeni', 'E', 'left', true, 16.7253, true),
    ('THB', 'Thai Baht', '฿', 'left', false, 31.9912, true),
    ('TJS', 'Tajikistani Somoni', 'SM', 'left', true, 9.5448, true),
    ('TMT', 'Turkmenistani Manat', 'T', 'left', true, 3.4977, true),
    ('TND', 'Tunisian Dinar', 'د.ت', 'right', true, 2.9275, true),
    ('TOP', 'Tongan Paʻanga', 'T$', 'left', false, 2.3546, true),
    ('TRY', 'Turkish Lira', '₺', 'left', false, 44.1830, true),
    ('TTD', 'Trinidad and Tobago Dollar', 'TT$', 'left', false, 6.7602, true),
    ('TWD', 'New Taiwan Dollar', 'NT$', 'left', false, 31.8954, true),
    ('TZS', 'Tanzanian Shilling', 'TSh', 'left', true, 2581.7164, true),
    ('UAH', 'Ukrainian Hryvnia', '₴', 'left', false, 44.2432, true),
    ('UGX', 'Ugandan Shilling', 'USh', 'left', true, 3728.7630, true),
    ('UYU', 'Uruguayan Peso', '$U', 'left', false, 40.1832, true),
    ('UZS', 'Uzbekistan Som', 'сўм', 'right', true, 12161.4191, true),
    ('VES', 'Venezuelan Bolívar', 'Bs.S', 'left', false, 443.2587, true),
    ('VND', 'Vietnamese Dong', '₫', 'right', true, 26145.4810, true),
    ('VUV', 'Vanuatu Vatu', 'VT', 'left', true, 119.0214, true),
    ('WST', 'Samoan Tala', 'WS$', 'left', false, 2.6832, true),
    ('XAF', 'CFA Franc BEAC', 'FCFA', 'left', true, 568.9094, true),
    ('XCD', 'East Caribbean Dollar', 'EC$', 'left', false, 2.7000, true),
    ('XOF', 'CFA Franc BCEAO', 'CFA', 'left', true, 568.9094, true),
    ('XPF', 'CFP Franc', '₣', 'left', true, 103.4963, true),
    ('YER', 'Yemeni Rial', '﷼', 'right', true, 238.5404, true),
    ('ZAR', 'South African Rand', 'R', 'left', true, 16.7255, true),
    ('ZMW', 'Zambian Kwacha', 'ZK', 'left', true, 19.5462, true),
    ('ZWL', 'Zimbabwean Dollar', 'Z$', 'left', false, 25.5046, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    symbol_position = EXCLUDED.symbol_position,
    symbol_space = EXCLUDED.symbol_space,
    exchange_rate = EXCLUDED.exchange_rate,
    is_system = true;

-- Insert system templates (is_system = true, no user_id)
INSERT INTO templates (name, styling, is_system)
SELECT 'Classic', $TEMPLATE$<div class="w-full h-full bg-transparent flex flex-col gap-8">
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