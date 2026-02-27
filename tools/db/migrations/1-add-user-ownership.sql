-- =============================================
-- Migration: Add User Ownership & System Flags
-- =============================================
-- Adds user_id to companies, invoices
-- Adds user_id + is_system to currencies, templates
-- Adds created_at/updated_at to currencies
-- Backfills existing seed rows as system defaults

-- =============================================
-- 1. Currencies: add user_id, is_system, timestamps
-- =============================================

ALTER TABLE currencies
    ADD COLUMN IF NOT EXISTS user_id   UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing seed rows as system defaults
UPDATE currencies SET is_system = true WHERE user_id IS NULL;

-- Trigger for updated_at on currencies
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

CREATE INDEX IF NOT EXISTS idx_currencies_user_id ON currencies(user_id);
CREATE INDEX IF NOT EXISTS idx_currencies_is_system ON currencies(is_system);

-- =============================================
-- 2. Templates: add user_id, is_system
-- =============================================

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS user_id   UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing seed rows as system defaults
UPDATE templates SET is_system = true WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON templates(is_system);

-- =============================================
-- 3. Companies: add user_id
-- =============================================

-- First add as nullable, then backfill if needed, then set NOT NULL
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- NOTE: If you have existing companies without a user_id, you must
-- assign them to a user before enabling the NOT NULL constraint:
-- UPDATE companies SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- ALTER TABLE companies ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- =============================================
-- 4. Invoices: add user_id
-- =============================================

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- NOTE: Same as companies — backfill existing rows before enforcing NOT NULL:
-- UPDATE invoices SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
