import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DuplicateGroup } from '@/lib/types';

/**
 * GET  /backup/duplicates  — find duplicate records
 * DELETE /backup/duplicates — delete a specific record by type + id
 */

type Row = Record<string, unknown>;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups: DuplicateGroup[] = [];

    // ── Duplicate companies (same name) ─────────────────────────
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, email, phone, city, country, tax_percent, created_at')
      .eq('user_id', user.id)
      .order('name')
      .order('created_at');

    if (companies) {
      const byName = new Map<string, Row[]>();
      for (const c of companies) {
        const arr = byName.get(c.name) ?? [];
        arr.push(c);
        byName.set(c.name, arr);
      }
      for (const [name, rows] of byName) {
        if (rows.length < 2) continue;
        groups.push({
          type: 'company',
          key: name,
          records: rows.map(r => ({
            id: r.id as string,
            label: r.name as string,
            sublabel: r.email as string | null,
            fields: {
              email: r.email as string | null,
              phone: r.phone as string | null,
              city: r.city as string | null,
              country: r.country as string | null,
              tax_percent: r.tax_percent != null ? String(r.tax_percent) : null,
            },
            created_at: r.created_at as string | null,
          })),
        });
      }
    }

    // ── Duplicate clients (same name) ───────────────────────────
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, phone, city, country, company_id, companies(name), created_at')
      .eq('user_id', user.id)
      .order('name')
      .order('created_at');

    if (clients) {
      const byName = new Map<string, Row[]>();
      for (const c of clients as Row[]) {
        const n = c.name as string;
        const arr = byName.get(n) ?? [];
        arr.push(c);
        byName.set(n, arr);
      }
      for (const [name, rows] of byName) {
        if (rows.length < 2) continue;
        groups.push({
          type: 'client',
          key: name,
          records: rows.map(r => {
            const co = r.companies as Row | null;
            return {
              id: r.id as string,
              label: r.name as string,
              sublabel: co?.name as string | null ?? null,
              fields: {
                email: r.email as string | null,
                phone: r.phone as string | null,
                city: r.city as string | null,
                country: r.country as string | null,
                company: co?.name as string | null ?? null,
              },
              created_at: r.created_at as string | null,
            };
          }),
        });
      }
    }

    // ── Duplicate invoices (same customer_name + issue_date) ────
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, customer_name, status, issue_date, due_date, total_amount, created_at, company_id, companies(name)')
      .eq('user_id', user.id)
      .order('customer_name')
      .order('created_at');

    if (invoices) {
      const byKey = new Map<string, Row[]>();
      for (const inv of invoices as Row[]) {
        const k = `${inv.customer_name}||${inv.issue_date}`;
        const arr = byKey.get(k) ?? [];
        arr.push(inv);
        byKey.set(k, arr);
      }
      for (const [key, rows] of byKey) {
        if (rows.length < 2) continue;
        groups.push({
          type: 'invoice',
          key,
          records: rows.map(r => {
            const co = r.companies as Row | null;
            return {
              id: r.id as string,
              label: r.customer_name as string,
              sublabel: r.issue_date as string | null,
              fields: {
                status: r.status as string | null,
                total_amount: r.total_amount != null ? String(r.total_amount) : null,
                due_date: r.due_date as string | null,
                company: co?.name as string | null ?? null,
              },
              created_at: r.created_at as string | null,
            };
          }),
        });
      }
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Duplicate check failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as
      | { type: string; id: string }
      | { items: { type: string; id: string }[] };

    const tableMap: Record<string, string> = {
      company: 'companies',
      client: 'clients',
      invoice: 'invoices',
    };

    // Bulk delete
    if ('items' in body && Array.isArray(body.items)) {
      // Group ids by table for fewer queries
      const byTable = new Map<string, string[]>();
      for (const item of body.items) {
        const table = tableMap[item.type];
        if (!table || !item.id) continue;
        const arr = byTable.get(table) ?? [];
        arr.push(item.id);
        byTable.set(table, arr);
      }
      let deleted = 0;
      for (const [table, ids] of byTable) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in('id', ids)
          .eq('user_id', user.id);
        if (error) throw error;
        deleted += ids.length;
      }
      return NextResponse.json({ success: true, deleted });
    }

    // Single delete
    const { type, id } = body as { type: string; id: string };
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }
    const table = tableMap[type];
    if (!table) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete duplicate failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
