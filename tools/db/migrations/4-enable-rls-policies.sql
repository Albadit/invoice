-- =============================================
-- Migration: Enable Row Level Security (RLS)
-- =============================================
-- Enables RLS on all tables and creates policies.
-- System rows (is_system = true) are readable by everyone.
-- User rows are scoped to auth.uid().

-- =============================================
-- 1. Enable RLS on all tables
-- =============================================

ALTER TABLE currencies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Currencies policies
-- =============================================

DROP POLICY IF EXISTS currencies_select ON currencies;
CREATE POLICY currencies_select ON currencies FOR SELECT
    USING (is_system = true OR user_id = auth.uid());

DROP POLICY IF EXISTS currencies_insert ON currencies;
CREATE POLICY currencies_insert ON currencies FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS currencies_update ON currencies;
CREATE POLICY currencies_update ON currencies FOR UPDATE
    USING (user_id = auth.uid() AND is_system = false)
    WITH CHECK (user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS currencies_delete ON currencies;
CREATE POLICY currencies_delete ON currencies FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);

-- =============================================
-- 3. Templates policies
-- =============================================

DROP POLICY IF EXISTS templates_select ON templates;
CREATE POLICY templates_select ON templates FOR SELECT
    USING (is_system = true OR user_id = auth.uid());

DROP POLICY IF EXISTS templates_insert ON templates;
CREATE POLICY templates_insert ON templates FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS templates_update ON templates;
CREATE POLICY templates_update ON templates FOR UPDATE
    USING (user_id = auth.uid() AND is_system = false)
    WITH CHECK (user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS templates_delete ON templates;
CREATE POLICY templates_delete ON templates FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);

-- =============================================
-- 4. Companies policies
-- =============================================

DROP POLICY IF EXISTS companies_select ON companies;
CREATE POLICY companies_select ON companies FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS companies_insert ON companies;
CREATE POLICY companies_insert ON companies FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS companies_update ON companies;
CREATE POLICY companies_update ON companies FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS companies_delete ON companies;
CREATE POLICY companies_delete ON companies FOR DELETE
    USING (user_id = auth.uid());

-- =============================================
-- 5. Clients policies
-- =============================================

DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY clients_select ON clients FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS clients_insert ON clients;
CREATE POLICY clients_insert ON clients FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS clients_update ON clients;
CREATE POLICY clients_update ON clients FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY clients_delete ON clients FOR DELETE
    USING (user_id = auth.uid());

-- =============================================
-- 6. Invoices policies
-- =============================================

DROP POLICY IF EXISTS invoices_select ON invoices;
CREATE POLICY invoices_select ON invoices FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS invoices_insert ON invoices;
CREATE POLICY invoices_insert ON invoices FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS invoices_update ON invoices;
CREATE POLICY invoices_update ON invoices FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS invoices_delete ON invoices;
CREATE POLICY invoices_delete ON invoices FOR DELETE
    USING (user_id = auth.uid());

-- =============================================
-- 7. Invoice Items policies (inherited via parent invoice)
-- =============================================

DROP POLICY IF EXISTS invoice_items_select ON invoice_items;
CREATE POLICY invoice_items_select ON invoice_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS invoice_items_insert ON invoice_items;
CREATE POLICY invoice_items_insert ON invoice_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS invoice_items_update ON invoice_items;
CREATE POLICY invoice_items_update ON invoice_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS invoice_items_delete ON invoice_items;
CREATE POLICY invoice_items_delete ON invoice_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));
