# Invoice System — Refined Requirements & Scalable Design

## 1. Current State Analysis

### What Exists
| Layer | Status |
|---|---|
| **Tables** | `currencies`, `templates`, `companies`, `invoices`, `invoice_items` |
| **Auth** | Supabase email/password, session management |
| **Frontend** | Next.js 16 feature-first architecture, HeroUI, cursor pagination, FTS |
| **User ownership** | **Missing** — no `user_id` on any table |
| **RLS** | **Disabled** — commented out in schema |
| **System vs. custom data** | **No distinction** — all rows are editable/deletable |
| **Record linking** | **Missing** — invoices store customer info inline, no clients/projects/orders |

### Gaps to Close
1. **Multi-tenancy**: Every data table needs a `user_id` foreign key + RLS.
2. **System defaults**: Currencies and templates need an `is_system` flag to protect seed data.
3. **Record linking**: A `clients` table (and optionally `projects`) so invoices reference real entities instead of free-text fields.

---

## 2. Refined Requirements

### R1 — User Ownership (Multi-Tenancy)
- Every user-created row (`companies`, `invoices`, `currencies`, `templates`, `clients`) **must** have a `user_id` referencing `auth.users(id)`.
- Row Level Security (RLS) ensures users can only read/write their own data **plus** system defaults.

### R2 — Companies
- A user can create **multiple** companies.
- Each company belongs to exactly **one** user.
- Companies have a default currency and a default template (both optional).
- Deleting a company is **restricted** if it has invoices (to preserve data integrity).

### R3 — Clients (Record Linking)
- A user can create **clients** scoped to a company (or globally to their account).
- When creating an invoice, the user **selects a client** from their list (or creates one inline).
- The invoice stores both the `client_id` FK **and** a snapshot of the client's billing address at the time of creation (so historical invoices remain accurate even if the client's address later changes).

### R4 — Invoices
- An invoice belongs to a **company**, is linked to a **client**, uses a **currency**, and is rendered with a **template**.
- All existing fields (discount, tax, shipping, items, FTS) are preserved.
- A new optional `reference_code` field lets users attach their own external reference (PO number, project code, etc.).

### R5 — Templates
- **System templates** (`is_system = true`, `user_id = NULL`): Seeded by the platform. Visible to all users. Cannot be edited or deleted by anyone through the API.
- **User templates** (`is_system = false`, `user_id = <uuid>`): Created by a user. Only visible to that user. Fully editable and deletable.
- A template contains a `name` and `styling` (JSX-like markup string, as today).

### R6 — Currencies
- **System currencies** (`is_system = true`, `user_id = NULL`): Seeded by the platform (USD, EUR, GBP, …). Visible to all users. Cannot be edited or deleted by anyone through the API.
- **User currencies** (`is_system = false`, `user_id = <uuid>`): Created by a user. Only visible to that user. Fully editable and deletable.

### R7 — Security
- RLS is **enabled** on every public table.
- Policies follow a consistent pattern:
  - `SELECT`: own rows + system rows.
  - `INSERT`: only into own rows (`user_id = auth.uid()`).
  - `UPDATE` / `DELETE`: own rows only, and only where `is_system = false` (if applicable).

---

## 3. Database Schema Changes

### 3.1 New Table: `clients`

```sql
CREATE TABLE IF NOT EXISTS clients (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
```

### 3.2 Altered Table: `currencies`

```sql
ALTER TABLE currencies
    ADD COLUMN IF NOT EXISTS user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing seed rows as system
UPDATE currencies SET is_system = true WHERE user_id IS NULL;
```

### 3.3 Altered Table: `templates`

```sql
ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing seed rows as system
UPDATE templates SET is_system = true WHERE user_id IS NULL;
```

### 3.4 Altered Table: `companies`

```sql
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
```

### 3.5 Altered Table: `invoices`

```sql
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reference_code TEXT;   -- external PO/project code

CREATE INDEX IF NOT EXISTS idx_invoices_user_id   ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
```

### 3.6 Altered Table: `invoice_items`

```sql
-- No user_id needed; items inherit ownership via their parent invoice.
-- RLS policy chains through `invoice_id → invoices.user_id`.
```

---

## 4. Row Level Security (RLS)

### Pattern

```sql
-- Enable RLS
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (important for Supabase service role)
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
```

### 4.1 `currencies`

```sql
-- Anyone can read system currencies + own currencies
CREATE POLICY currencies_select ON currencies FOR SELECT
    USING (is_system = true OR user_id = auth.uid());

-- Insert only own rows, never system
CREATE POLICY currencies_insert ON currencies FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Update only own rows, never system
CREATE POLICY currencies_update ON currencies FOR UPDATE
    USING (user_id = auth.uid() AND is_system = false)
    WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Delete only own rows, never system
CREATE POLICY currencies_delete ON currencies FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);
```

### 4.2 `templates`

Same pattern as `currencies` — replace table name.

### 4.3 `companies`

```sql
CREATE POLICY companies_select ON companies FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY companies_insert ON companies FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY companies_update ON companies FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY companies_delete ON companies FOR DELETE
    USING (user_id = auth.uid());
```

### 4.4 `clients`

Same pattern as `companies`.

### 4.5 `invoices`

Same pattern as `companies`.

### 4.6 `invoice_items`

```sql
-- Items are visible/editable if the parent invoice belongs to the user
CREATE POLICY invoice_items_select ON invoice_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));

CREATE POLICY invoice_items_insert ON invoice_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));

-- (Same for UPDATE and DELETE)
```

---

## 5. Entity-Relationship Diagram

```
auth.users
    │
    ├──< companies        (user_id FK)
    │       │
    │       ├──< invoices  (company_id FK, user_id FK)
    │       │       │
    │       │       ├──< invoice_items (invoice_id FK)
    │       │       │
    │       │       ├───> clients    (client_id FK)
    │       │       ├───> currencies (currency_id FK)
    │       │       └───> templates  (template_id FK)
    │       │
    │       ├───> currencies (default currency_id FK)
    │       └───> templates  (default template_id FK)
    │
    ├──< clients          (user_id FK, optional company_id FK)
    │
    ├──< currencies       (user_id FK, nullable for system)
    │
    └──< templates        (user_id FK, nullable for system)
```

---

## 6. Frontend Architecture Changes

### 6.1 New Feature Module: `features/clients/`

```
features/clients/
    ├── api.ts              # CRUD for clients
    ├── components/
    │   ├── ClientForm.tsx   # Create/edit client
    │   ├── ClientList.tsx   # Searchable list
    │   └── ClientSelect.tsx # Dropdown used inside InvoiceForm
    └── types.ts            # Client-specific types (if any beyond DB types)
```

### 6.2 Updated Feature: `features/invoice/`

- **InvoiceForm** gains a `<ClientSelect>` field (imported from shared or clients feature — see note below).
- On client selection, billing address fields auto-fill but remain editable (snapshot pattern).
- New optional `reference_code` text input.

> **Cross-feature import rule**: Since the architecture forbids cross-feature imports, `ClientSelect` should live in `components/ui/` (shared) or `features/invoice/components/` with its own API call. The cleanest approach: expose a shared `useClients()` hook in `lib/` that both features can consume.

### 6.3 Updated Feature: `features/settings/`

- **CurrencyList / CurrencyForm**: Disable edit/delete buttons when `is_system = true`. Show a badge "System" on system currencies.
- **TemplateList / TemplateForm**: Same treatment — system templates show a lock icon and are read-only.

### 6.4 API Layer Updates

Every API call must include the Supabase **auth token** (JWT) in the `Authorization: Bearer <token>` header so RLS can resolve `auth.uid()`. The current `getHeaders()` in `lib/api.ts` must be updated:

```typescript
export async function getHeaders(prefer?: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  if (prefer) {
    headers['Prefer'] = prefer;
  }

  return headers;
}
```

### 6.5 New Shared Types

```typescript
// lib/types.ts additions
export type Client = Database['public']['Tables']['clients']['Row'];

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  currency: Currency;
  company: Company;
  client?: Client;
}
```

### 6.6 New Route

```
app/(main)/clients/         → Client list + CRUD
app/(main)/clients/[id]/    → Client detail (optional, can be modal-based)
```

Or integrate clients as a sub-section of Settings — depending on UX preference.

---

## 7. Seed Data Updates

### System Currencies (unchanged, but flagged)

```sql
INSERT INTO currencies (code, name, symbol, symbol_position, symbol_space, is_system) VALUES
    ('USD', 'US Dollar',     '$',   'left',  false, true),
    ('EUR', 'Euro',          '€',   'right', true,  true),
    ('GBP', 'British Pound', '£',   'left',  false, true),
    ('JPY', 'Japanese Yen',  '¥',   'left',  false, true),
    ('CHF', 'Swiss Franc',   'CHF', 'left',  true,  true)
ON CONFLICT (code) DO UPDATE SET is_system = true;
```

### System Template (unchanged, but flagged)

```sql
-- After inserting the Classic template:
UPDATE templates SET is_system = true WHERE name = 'Classic' AND user_id IS NULL;
```

---

## 8. Migration Plan

All changes should be delivered as **incremental migration files** in `tools/db/migrations/`:

| # | File | What it does |
|---|---|---|
| 1 | `add-user-ownership.sql` | Adds `user_id` to `companies`, `invoices`. Adds `user_id` + `is_system` to `currencies`, `templates`. Backfills system flags. |
| 2 | `create-clients-table.sql` | Creates `clients` table with indexes. |
| 3 | `add-invoice-client-link.sql` | Adds `client_id` and `reference_code` to `invoices`. |
| 4 | `enable-rls-policies.sql` | Enables RLS on all tables and creates all policies. |

Update `schema-init.sql` and `seed-init.sql` to include the final state so fresh installs get everything in one pass.

---

## 9. Summary of Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Client scope | Per-user (optionally per-company) | Simplest model; user can share clients across companies |
| Address snapshot | Keep inline fields on invoice + add `client_id` FK | Historical accuracy; client address changes don't alter old invoices |
| System data protection | `is_system` boolean + RLS | Database-level enforcement, impossible to bypass from frontend |
| Template storage | JSX string in `styling` column (existing) | Already works with `renderTemplate` and PDF generation |
| Cross-feature data sharing | Shared hooks in `lib/` | Respects the architecture's no-cross-feature-import rule |
| `invoice_items` ownership | Inherited via parent invoice RLS | Avoids redundant `user_id` column; cleaner schema |
| User auth token in API calls | `Authorization: Bearer` header from Supabase session | Required for RLS `auth.uid()` to work |
