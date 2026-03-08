import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Preview a backup SQL file before importing.
 *
 * POST /settings/backup/preview
 *
 * Parses company / client / invoice data from the SQL VALUES clauses,
 * compares against existing records, and returns a conflict report so
 * the user can choose which duplicates to overwrite.
 */

type Row = Record<string, unknown>;

/** Unescape a SQL string literal value (strip surrounding quotes, unescape ''). */
function unesc(v: string): string | null {
  const trimmed = v.trim();
  if (trimmed === 'NULL') return null;
  // Remove surrounding single quotes and unescape doubled quotes
  return trimmed.replace(/^'|'$/g, '').replace(/''/g, "'");
}

/**
 * Parse a single SQL VALUES row like ('a', 'b', NULL) into an array of raw strings.
 * Handles quoted strings with embedded commas, parentheses, and escaped quotes.
 */
function parseValuesRow(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuote = false;
  let i = 0;
  // Skip leading whitespace and opening paren
  const trimmed = row.trim();
  const start = trimmed.startsWith('(') ? 1 : 0;
  const end = trimmed.endsWith(')') ? trimmed.length - 1 : trimmed.length;

  for (i = start; i < end; i++) {
    const ch = trimmed[i];
    if (inQuote) {
      if (ch === "'" && trimmed[i + 1] === "'") {
        // Escaped quote
        current += "''";
        i++;
      } else if (ch === "'") {
        inQuote = false;
        current += ch;
      } else {
        current += ch;
      }
    } else {
      if (ch === "'") {
        inQuote = true;
        current += ch;
      } else if (ch === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

/** Extract all VALUES row tuples from a block like: FROM (VALUES\n  (...),\n  (...)\n) AS v(...) */
function extractValueRows(block: string): string[][] {
  // Match the VALUES block: everything between (VALUES and ) AS v(
  const match = block.match(/\(VALUES\s*\n([\s\S]*?)\n\s*\)\s*AS\s+v\s*\(/i);
  if (!match) return [];
  const rowsBlock = match[1];
  // Split on row boundaries: each row starts with optional whitespace and (
  const rowTexts = rowsBlock.split(/\n/).filter(l => l.trim().startsWith('('));
  return rowTexts.map(r => {
    // Remove trailing comma if present
    const cleaned = r.trim().replace(/,\s*$/, '');
    return parseValuesRow(cleaned);
  });
}

interface BackupCompany {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tax_percent: string | null;
  terms: string | null;
}

interface BackupClient {
  company_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
}

interface BackupInvoice {
  company_name: string | null;
  customer_name: string;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  total_amount: string | null;
  created_at: string | null;
}

export interface ConflictItem<T> {
  incoming: T;
  existing: T;
}

export interface PreviewResponse {
  companies: { new: BackupCompany[]; conflicts: ConflictItem<BackupCompany>[] };
  clients: { new: BackupClient[]; conflicts: ConflictItem<BackupClient>[] };
  invoices: { new: BackupInvoice[]; conflicts: ConflictItem<BackupInvoice>[] };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = await request.text();
    if (!sql || !sql.trim()) {
      return NextResponse.json({ error: 'Empty SQL file' }, { status: 400 });
    }

    // ── Parse companies from SQL ──────────────────────────────────
    // Company VALUES columns: name, email, phone, street, city, zip_code, country, vat_number, coc_number, logo_url, currency_code, template_name, tax_percent, terms, language, created_at, updated_at
    const companyBlock = sql.match(/-- Companies\n([\s\S]*?)(?=\n--|;\n)/);
    const parsedCompanies: BackupCompany[] = [];
    if (companyBlock) {
      const rows = extractValueRows(companyBlock[1]);
      for (const vals of rows) {
        parsedCompanies.push({
          name: unesc(vals[0]) ?? '',
          email: unesc(vals[1]),
          phone: unesc(vals[2]),
          city: unesc(vals[4]),
          country: unesc(vals[6]),
          tax_percent: unesc(vals[12]),
          terms: unesc(vals[13]),
        });
      }
    }

    // ── Parse clients from SQL ────────────────────────────────────
    // Client VALUES columns: company_name, name, email, phone, street, city, zip_code, country, tax_id, notes, created_at, updated_at
    const clientBlock = sql.match(/-- Clients\n([\s\S]*?)(?=\n--|;\n)/);
    const parsedClients: BackupClient[] = [];
    if (clientBlock) {
      const rows = extractValueRows(clientBlock[1]);
      for (const vals of rows) {
        parsedClients.push({
          company_name: unesc(vals[0]),
          name: unesc(vals[1]) ?? '',
          email: unesc(vals[2]),
          phone: unesc(vals[3]),
          city: unesc(vals[5]),
          country: unesc(vals[7]),
        });
      }
    }

    // ── Parse invoices from SQL ───────────────────────────────────
    // Invoice VALUES columns: company_name, currency_code, template_name, client_name, status, customer_name, ...
    // We extract from every WITH inv AS or INSERT INTO invoices block.
    // Use `company_name,\s*currency_code` to avoid matching the client VALUES block (which also starts with `company_name`).
    const invoicePattern = /FROM \(VALUES\s*\n\s*\(([^)]*'[^)]*)\ )\s*\n\s*\)\s*AS\s+v\(company_name,\s*currency_code/g;
    const parsedInvoices: BackupInvoice[] = [];
    let invMatch;
    while ((invMatch = invoicePattern.exec(sql)) !== null) {
      const rowStr = invMatch[1];
      const vals = parseValuesRow(`(${rowStr})`);
      parsedInvoices.push({
        company_name: unesc(vals[0]),
        customer_name: unesc(vals[5]) ?? '',
        status: unesc(vals[4]),
        issue_date: unesc(vals[10]),
        due_date: unesc(vals[11]),
        total_amount: unesc(vals[25]),
        created_at: unesc(vals[26]),
      });
    }

    // ── Fetch existing data ───────────────────────────────────────
    const [existingCompanies, existingClients, existingInvoices] = await Promise.all([
      supabase.from('companies').select('name, email, phone, city, country, tax_percent, terms').eq('user_id', user.id).then(r => r.data ?? []),
      supabase.from('clients').select('name, email, phone, city, country, company_id, companies(name)').eq('user_id', user.id).then(r => r.data ?? []),
      supabase.from('invoices').select('customer_name, status, issue_date, due_date, total_amount, created_at, company_id, companies(name)').eq('user_id', user.id).then(r => r.data ?? []),
    ]);

    const existingCompanyMap = new Map(existingCompanies.map(c => [c.name, c]));
    const existingClientMap = new Map((existingClients as Row[]).map(c => [c.name as string, c]));

    // Index invoices by customer_name + created_at for matching
    const existingInvoiceMap = new Map<string, Row>();
    for (const inv of existingInvoices as Row[]) {
      const key = `${inv.customer_name}||${inv.created_at}`;
      existingInvoiceMap.set(key, inv);
    }

    // ── Build conflict report ─────────────────────────────────────
    const result: PreviewResponse = {
      companies: { new: [], conflicts: [] },
      clients: { new: [], conflicts: [] },
      invoices: { new: [], conflicts: [] },
    };

    for (const co of parsedCompanies) {
      const existing = existingCompanyMap.get(co.name);
      if (existing) {
        result.companies.conflicts.push({
          incoming: co,
          existing: {
            name: existing.name,
            email: existing.email,
            phone: existing.phone,
            city: existing.city,
            country: existing.country,
            tax_percent: existing.tax_percent != null ? String(existing.tax_percent) : null,
            terms: existing.terms,
          },
        });
      } else {
        result.companies.new.push(co);
      }
    }

    for (const cl of parsedClients) {
      const existing = existingClientMap.get(cl.name) as Row | undefined;
      if (existing) {
        const coData = existing.companies as Row | null;
        result.clients.conflicts.push({
          incoming: cl,
          existing: {
            company_name: coData?.name as string | null ?? null,
            name: existing.name as string,
            email: existing.email as string | null,
            phone: existing.phone as string | null,
            city: existing.city as string | null,
            country: existing.country as string | null,
          },
        });
      } else {
        result.clients.new.push(cl);
      }
    }

    const seenInvoiceKeys = new Set<string>();
    for (const inv of parsedInvoices) {
      const key = `${inv.customer_name}||${inv.created_at}`;
      if (seenInvoiceKeys.has(key)) continue;
      seenInvoiceKeys.add(key);
      const existing = existingInvoiceMap.get(key);
      if (existing) {
        const coData = existing.companies as Row | null;
        result.invoices.conflicts.push({
          incoming: inv,
          existing: {
            company_name: coData?.name as string | null ?? null,
            customer_name: existing.customer_name as string,
            status: existing.status as string | null,
            issue_date: existing.issue_date as string | null,
            due_date: existing.due_date as string | null,
            total_amount: existing.total_amount != null ? String(existing.total_amount) : null,
            created_at: existing.created_at as string | null,
          },
        });
      } else {
        result.invoices.new.push(inv);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Backup preview failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 500 },
    );
  }
}
