import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Import a .sql backup file by executing it via the pg-meta pg/query endpoint.
 *
 * POST /settings/backup/import
 *
 * Expects the raw SQL string in the request body (Content-Type: text/plain).
 * Replaces the embedded user_id with the current user's ID (cross-account safe).
 * Uses the service-role key so the statements bypass RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let sql = await request.text();
    if (!sql || !sql.trim()) {
      return NextResponse.json({ error: 'Empty SQL file' }, { status: 400 });
    }

    // Replace the exported user_id with the importing user's ID
    const match = sql.match(/^-- User:\s+([0-9a-f-]{36})/m);
    if (match && match[1] !== user.id) {
      sql = sql.replaceAll(match[1], user.id);
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
