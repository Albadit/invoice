import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Import a .sql backup file by executing it via the pg-meta pg/query endpoint.
 *
 * POST /settings/backup/import
 *
 * Accepts either:
 *  - Content-Type: text/plain → raw SQL (legacy, no overwrite support)
 *  - Content-Type: application/json → { sql, overwrite }
 *
 * overwrite = { companies: string[], clients: string[], invoices: { customer_name, created_at }[] }
 * Records listed in overwrite are deleted before the SQL runs so the INSERT succeeds.
 *
 * Replaces the embedded user_id with the current user's ID (cross-account safe).
 * Uses the service-role key so the statements bypass RLS.
 */

function escSql(v: string): string {
  return v.replace(/'/g, "''");
}

interface OverwriteSpec {
  companies?: string[];
  clients?: string[];
  invoices?: { customer_name: string; created_at: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let sql: string;
    let overwrite: OverwriteSpec = {};

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      sql = body.sql;
      overwrite = body.overwrite ?? {};
    } else {
      sql = await request.text();
    }

    if (!sql || !sql.trim()) {
      return NextResponse.json({ error: 'Empty SQL file' }, { status: 400 });
    }

    // Replace the exported user_id with the importing user's ID
    const match = sql.match(/^-- User:\s+([0-9a-f-]{36})/m);
    if (match && match[1] !== user.id) {
      sql = sql.replaceAll(match[1], user.id);
    }

    // Build pre-delete statements for records the user chose to overwrite.
    // Executed inside the same transaction (injected right after BEGIN).
    const deleteStatements: string[] = [];
    const uid = user.id;

    if (overwrite.invoices?.length) {
      for (const inv of overwrite.invoices) {
        // Delete invoice items first (FK), then the invoice
        deleteStatements.push(
          `DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE customer_name = '${escSql(inv.customer_name)}' AND created_at = '${escSql(inv.created_at)}'::timestamptz AND user_id = '${uid}');`,
          `DELETE FROM invoices WHERE customer_name = '${escSql(inv.customer_name)}' AND created_at = '${escSql(inv.created_at)}'::timestamptz AND user_id = '${uid}';`
        );
      }
    }

    if (overwrite.clients?.length) {
      for (const name of overwrite.clients) {
        deleteStatements.push(
          `DELETE FROM clients WHERE name = '${escSql(name)}' AND user_id = '${uid}';`
        );
      }
    }

    if (overwrite.companies?.length) {
      for (const name of overwrite.companies) {
        // Cascade: delete clients and invoices under this company first
        deleteStatements.push(
          `DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id IN (SELECT id FROM companies WHERE name = '${escSql(name)}' AND user_id = '${uid}'));`,
          `DELETE FROM invoices WHERE company_id IN (SELECT id FROM companies WHERE name = '${escSql(name)}' AND user_id = '${uid}');`,
          `DELETE FROM clients WHERE company_id IN (SELECT id FROM companies WHERE name = '${escSql(name)}' AND user_id = '${uid}');`,
          `DELETE FROM companies WHERE name = '${escSql(name)}' AND user_id = '${uid}';`
        );
      }
    }

    // Inject delete statements after BEGIN
    if (deleteStatements.length) {
      sql = sql.replace(/BEGIN;\s*\n/, `BEGIN;\n\n${deleteStatements.join('\n')}\n\n`);
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(body);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Backup import failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    );
  }
}
