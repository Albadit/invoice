import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Export all user data as a .sql backup file.
 *
 * GET /settings/backup/export
 *
 * Generates INSERT … SELECT … FROM (VALUES) JOIN statements following the
 * same pattern as seed-dummy.sql. No UUIDs are exported — FKs are resolved
 * by natural keys (currency code, template name, company name, etc.).
 */

type Row = Record<string, unknown>;

/** Escape a value as a SQL text literal. Types are cast in SELECT clauses. */
function esc(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

/** Collapse redundant whitespace, strip SQL comments, and trim blank lines. */
function minifySql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')        // strip single-line comments
    .replace(/\n\s*\n/g, '\n')       // collapse blank lines
    .replace(/^\s+/gm, '')           // strip leading indentation
    .replace(/\n/g, ' ')             // join lines
    .replace(/ {2,}/g, ' ')          // collapse spaces
    .replace(/; /g, ';\n')           // re-break after semicolons
    .trim();
}

/** Set to true to strip comments and whitespace from the exported SQL. */
const MINIFY = false;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all visible data (system + user) for FK lookups;
    // only non-system currencies/templates are actually exported.
    const [allCurrencies, allTemplates, companies, clients, invoices] = await Promise.all([
      supabase.from('currencies').select('*').order('created_at', { ascending: true }).then(r => r.data ?? []),
      supabase.from('templates').select('*').order('created_at', { ascending: true }).then(r => r.data ?? []),
      supabase.from('companies').select('*').order('created_at', { ascending: true }).then(r => r.data ?? []),
      supabase.from('clients').select('*').order('created_at', { ascending: true }).then(r => r.data ?? []),
      supabase.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: true }).then(r => r.data ?? []),
    ]);

    const userCurrencies = (allCurrencies as Row[]).filter(c => !c.is_system);
    const userTemplates = (allTemplates as Row[]).filter(t => !t.is_system);

    // Lookup maps: id → record (for resolving FK names)
    const curById = new Map((allCurrencies as Row[]).map(c => [c.id as string, c]));
    const tmplById = new Map((allTemplates as Row[]).map(t => [t.id as string, t]));
    const coById = new Map((companies as Row[]).map(c => [c.id as string, c]));
    const clById = new Map((clients as Row[]).map(c => [c.id as string, c]));

    // Keep items per invoice for CTE-based insertion
    const cleanInvoices = (invoices as Row[]).map(inv => {
      const items = ((inv.invoice_items as Row[] | undefined) ?? []).sort(
        (a, b) => (a.sort_order as number) - (b.sort_order as number)
      );
      const { invoice_items: _, search_tsv: _a, search_text: _b, invoice_code: _c, ...rest } = inv;
      return { ...rest, _items: items } as Row & { _items: Row[] };
    });

    const uid = user.id;
    const lines: string[] = [
      `-- Invoice backup exported at ${new Date().toISOString()}`,
      `-- User: ${uid}\n`,
      'BEGIN;\n',
      `SELECT set_config('backup.user_id', '${uid}', true);\n`,
    ];

    // ── Currencies (user-created, non-system) ────────────────────
    if (userCurrencies.length) {
      const rows = userCurrencies.map(c =>
        `    (${esc(c.code)}, ${esc(c.name)}, ${esc(c.symbol)}, ${esc(c.symbol_position)}, ${esc(c.symbol_space)}, ${esc(c.is_system)}, ${esc(c.created_at)}, ${esc(c.updated_at)})`
      ).join(',\n');
      lines.push(`-- Currencies
INSERT INTO currencies (user_id, code, name, symbol, symbol_position, symbol_space, is_system, created_at, updated_at)
SELECT
    current_setting('backup.user_id')::uuid,
    v.code, v.name, v.symbol, v.symbol_position::symbol_position_type, v.symbol_space::boolean,
    v.is_system::boolean, v.created_at::timestamptz, v.updated_at::timestamptz
FROM (VALUES
${rows}
) AS v(code, name, symbol, symbol_position, symbol_space, is_system, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE code = v.code);\n`);
    }

    // ── Templates (user-created, non-system) ─────────────────────
    if (userTemplates.length) {
      const rows = userTemplates.map(t =>
        `    (${esc(t.name)}, ${esc(t.styling)}, ${esc(t.is_system)}, ${esc(t.created_at)}, ${esc(t.updated_at)})`
      ).join(',\n');
      lines.push(`-- Templates
INSERT INTO templates (user_id, name, styling, is_system, created_at, updated_at)
SELECT
    current_setting('backup.user_id')::uuid,
    v.name, v.styling, v.is_system::boolean, v.created_at::timestamptz, v.updated_at::timestamptz
FROM (VALUES
${rows}
) AS v(name, styling, is_system, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = v.name AND user_id = current_setting('backup.user_id')::uuid);\n`);
    }

    // ── Companies ────────────────────────────────────────────────
    if (companies.length) {
      const rows = (companies as Row[]).map(co => {
        const cur = co.currency_id ? curById.get(co.currency_id as string) : null;
        const tmpl = co.template_id ? tmplById.get(co.template_id as string) : null;
        return `    (${esc(co.name)}, ${esc(co.email)}, ${esc(co.phone)}, ${esc(co.street)}, ${esc(co.city)}, ${esc(co.zip_code)}, ${esc(co.country)}, ${esc(co.vat_number)}, ${esc(co.coc_number)}, ${esc(co.logo_url)}, ${esc(cur?.code ?? null)}, ${esc(tmpl?.name ?? null)}, ${esc(co.tax_percent)}, ${esc(co.terms)}, ${esc(co.language)}, ${esc(co.created_at)}, ${esc(co.updated_at)})`;
      }).join(',\n');
      lines.push(`-- Companies
INSERT INTO companies (user_id, name, email, phone, street, city, zip_code, country, vat_number, coc_number, logo_url, currency_id, template_id, tax_percent, terms, language, created_at, updated_at)
SELECT
    current_setting('backup.user_id')::uuid,
    v.name, v.email, v.phone, v.street, v.city, v.zip_code, v.country, v.vat_number, v.coc_number, v.logo_url,
    cur.id, t.id,
    v.tax_percent::decimal, v.terms, v.language, v.created_at::timestamptz, v.updated_at::timestamptz
FROM (VALUES
${rows}
) AS v(name, email, phone, street, city, zip_code, country, vat_number, coc_number, logo_url, currency_code, template_name, tax_percent, terms, language, created_at, updated_at)
LEFT JOIN currencies cur ON cur.code = v.currency_code
LEFT JOIN LATERAL (
    SELECT id FROM templates
    WHERE name = v.template_name AND (user_id = current_setting('backup.user_id')::uuid OR is_system = true)
    LIMIT 1
) t ON true
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = v.name AND user_id = current_setting('backup.user_id')::uuid);\n`);
    }

    // ── Clients ──────────────────────────────────────────────────
    if (clients.length) {
      const rows = (clients as Row[]).map(cl => {
        const co = cl.company_id ? coById.get(cl.company_id as string) : null;
        return `    (${esc(co?.name ?? null)}, ${esc(cl.name)}, ${esc(cl.email)}, ${esc(cl.phone)}, ${esc(cl.street)}, ${esc(cl.city)}, ${esc(cl.zip_code)}, ${esc(cl.country)}, ${esc(cl.tax_id)}, ${esc(cl.notes)}, ${esc(cl.created_at)}, ${esc(cl.updated_at)})`;
      }).join(',\n');
      lines.push(`-- Clients
INSERT INTO clients (user_id, company_id, name, email, phone, street, city, zip_code, country, tax_id, notes, created_at, updated_at)
SELECT
    current_setting('backup.user_id')::uuid,
    co.id,
    v.name, v.email, v.phone, v.street, v.city, v.zip_code, v.country, v.tax_id, v.notes,
    v.created_at::timestamptz, v.updated_at::timestamptz
FROM (VALUES
${rows}
) AS v(company_name, name, email, phone, street, city, zip_code, country, tax_id, notes, created_at, updated_at)
LEFT JOIN LATERAL (
    SELECT id FROM companies
    WHERE name = v.company_name AND user_id = current_setting('backup.user_id')::uuid
    LIMIT 1
) co ON true
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = v.name AND user_id = current_setting('backup.user_id')::uuid);\n`);
    }

    // ── Invoices (per-invoice CTE with items) ────────────────────
    const insertCols = `user_id, company_id, currency_id, template_id, client_id, status,
    customer_name, customer_street, customer_city, customer_zip_code, customer_country,
    issue_date, due_date,
    discount_type, discount_amount, discount_total_amount,
    tax_type, tax_amount, tax_total_amount,
    shipping_type, shipping_amount, shipping_total_amount,
    notes, terms, language, subtotal_amount, total_amount,
    created_at, updated_at`;

    const selectCols = `current_setting('backup.user_id')::uuid,
    co.id, cur.id, t.id, cl.id, v.status::status_type,
    v.customer_name, v.customer_street, v.customer_city, v.customer_zip_code, v.customer_country,
    v.issue_date::date, v.due_date::date,
    v.discount_type::amount_type, v.discount_amount::decimal, v.discount_total_amount::decimal,
    v.tax_type::amount_type, v.tax_amount::decimal, v.tax_total_amount::decimal,
    v.shipping_type::amount_type, v.shipping_amount::decimal, v.shipping_total_amount::decimal,
    v.notes, v.terms, v.language, v.subtotal_amount::decimal, v.total_amount::decimal,
    v.created_at::timestamptz, v.updated_at::timestamptz`;

    const vCols = 'company_name, currency_code, template_name, client_name, status, customer_name, customer_street, customer_city, customer_zip_code, customer_country, issue_date, due_date, discount_type, discount_amount, discount_total_amount, tax_type, tax_amount, tax_total_amount, shipping_type, shipping_amount, shipping_total_amount, notes, terms, language, subtotal_amount, total_amount, created_at, updated_at';

    const fkJoins = `JOIN LATERAL (
    SELECT id FROM companies
    WHERE name = v.company_name AND user_id = current_setting('backup.user_id')::uuid
    LIMIT 1
) co ON true
JOIN currencies cur ON cur.code = v.currency_code
LEFT JOIN LATERAL (
    SELECT id FROM templates
    WHERE name = v.template_name AND (user_id = current_setting('backup.user_id')::uuid OR is_system = true)
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT id FROM clients
    WHERE name = v.client_name AND user_id = current_setting('backup.user_id')::uuid
    LIMIT 1
) cl ON true`;

    for (const inv of cleanInvoices) {
      const co = inv.company_id ? coById.get(inv.company_id as string) : null;
      const cur = inv.currency_id ? curById.get(inv.currency_id as string) : null;
      const tmpl = inv.template_id ? tmplById.get(inv.template_id as string) : null;
      const cl = inv.client_id ? clById.get(inv.client_id as string) : null;
      const items = inv._items as Row[];

      const val = `    (${esc(co?.name ?? null)}, ${esc(cur?.code ?? null)}, ${esc(tmpl?.name ?? null)}, ${esc(cl?.name ?? null)}, ${esc(inv.status)}, ${esc(inv.customer_name)}, ${esc(inv.customer_street)}, ${esc(inv.customer_city)}, ${esc(inv.customer_zip_code)}, ${esc(inv.customer_country)}, ${esc(inv.issue_date)}, ${esc(inv.due_date)}, ${esc(inv.discount_type)}, ${esc(inv.discount_amount)}, ${esc(inv.discount_total_amount)}, ${esc(inv.tax_type)}, ${esc(inv.tax_amount)}, ${esc(inv.tax_total_amount)}, ${esc(inv.shipping_type)}, ${esc(inv.shipping_amount)}, ${esc(inv.shipping_total_amount)}, ${esc(inv.notes)}, ${esc(inv.terms)}, ${esc(inv.language)}, ${esc(inv.subtotal_amount)}, ${esc(inv.total_amount)}, ${esc(inv.created_at)}, ${esc(inv.updated_at)})`;

      if (items.length) {
        const itemRows = items.map(it =>
          `    (${esc(it.name)}, ${esc(it.quantity)}, ${esc(it.unit_price)}, ${esc(it.total_amount)}, ${esc(it.sort_order)}, ${esc(it.created_at)}, ${esc(it.updated_at)})`
        ).join(',\n');
        lines.push(`WITH inv AS (
  INSERT INTO invoices (
    ${insertCols}
  )
  SELECT
    ${selectCols}
  FROM (VALUES
  ${val}
  ) AS v(${vCols})
  ${fkJoins}
  RETURNING id
)
INSERT INTO invoice_items (invoice_id, name, quantity, unit_price, total_amount, sort_order, created_at, updated_at)
SELECT inv.id, item.name, item.quantity::decimal, item.unit_price::decimal, item.total_amount::decimal, item.sort_order::integer,
    item.created_at::timestamptz, item.updated_at::timestamptz
FROM inv, (VALUES
${itemRows}
) AS item(name, quantity, unit_price, total_amount, sort_order, created_at, updated_at);\n`);
      } else {
        lines.push(`INSERT INTO invoices (
    ${insertCols}
)
SELECT
    ${selectCols}
FROM (VALUES
${val}
) AS v(${vCols})
${fkJoins};\n`);
      }
    }

    lines.push('COMMIT;\n');
    const sql = MINIFY ? minifySql(lines.join('\n')) : lines.join('\n');

    return new NextResponse(sql, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="invoice-backup-${new Date().toISOString().slice(0, 10)}.sql"`,
      },
    });
  } catch (error) {
    console.error('Backup export failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 },
    );
  }
}
