-- Migration: Create settings table for user preferences
-- Dashboard currency is now a user-level setting, not a company field.

-- Drop dashboard_currency_id from companies if it was added previously
ALTER TABLE companies DROP COLUMN IF EXISTS dashboard_currency_id;

-- Create settings table (one row per user)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    dashboard_currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON settings FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY settings_insert ON settings FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY settings_update ON settings FOR UPDATE
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY settings_delete ON settings FOR DELETE
    USING (user_id = auth.uid());

-- Trigger for updated_at
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
