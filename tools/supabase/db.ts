#!/usr/bin/env tsx

/**
 * Unified database management script via the Supabase pg-meta HTTP API.
 *
 * Usage:
 *   tsx db.ts schema          – Apply schema files (schema*.sql)
 *   tsx db.ts migrate         – Run migration files (migrations/*.sql)
 *   tsx db.ts seed            – Run seed files (seed*.sql)
 *   tsx db.ts drop [--yes]    – Drop all public objects + auth data
 *   tsx db.ts reset [--yes]   – drop → schema → seed (shortcut)
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const DB_DIR = path.join(__dirname, '..', 'db');

// ── HTTP helper ──────────────────────────────────────────────────
async function runSQL(sql: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

// ── SQL statement splitter (respects $$ blocks) ──────────────────
function splitStatements(sql: string): string[] {
  const results: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let i = 0;

  while (i < sql.length) {
    if (sql[i] === '$' && sql[i + 1] === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i += 2;
      continue;
    }
    if (!inDollarQuote && sql[i] === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (!inDollarQuote && sql[i] === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) results.push(trimmed);
      current = '';
      i++;
      continue;
    }
    current += sql[i];
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) results.push(trimmed);
  return results;
}

// ── File helpers ─────────────────────────────────────────────────
function findFiles(prefix: string): string[] {
  const files = fs.readdirSync(DB_DIR)
    .filter(f => {
      const fp = path.join(DB_DIR, f);
      return f.startsWith(prefix) && f.endsWith('.sql') && fs.statSync(fp).isFile();
    })
    .sort((a, b) => {
      const aInit = a.includes('init');
      const bInit = b.includes('init');
      if (aInit && !bInit) return -1;
      if (!aInit && bInit) return 1;
      return a.localeCompare(b);
    });

  const initFiles = files.filter(f => f.includes('init'));
  if (initFiles.length > 1) {
    console.error(`❌ Multiple init files found: ${initFiles.join(', ')}`);
    process.exit(1);
  }
  return files;
}

async function runFiles(prefix: string, label: string) {
  const files = findFiles(prefix);
  if (files.length === 0) {
    console.error(`❌ No ${label} files found (${prefix}*.sql)`);
    process.exit(1);
  }

  console.log(`📝 Found ${files.length} ${label} file(s):\n${files.map(f => `   - ${f}`).join('\n')}\n`);

  for (const file of files) {
    console.log(`⏳ Running ${file}...`);
    const sql = fs.readFileSync(path.join(DB_DIR, file), 'utf-8');
    await runSQL(sql);
    console.log(`✅ ${file} executed successfully\n`);
  }

  console.log(`🎉 All ${label} files applied successfully!`);
}

// ── Commands ─────────────────────────────────────────────────────
async function cmdSchema() {
  await runFiles('schema', 'schema');
}

async function cmdMigrate() {
  const migrationsDir = path.join(DB_DIR, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.error('❌ No migration files found');
    process.exit(1);
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`⏳ Running migration: ${file}...`);

    const statements = splitStatements(sql);
    for (const stmt of statements) {
      try {
        await runSQL(stmt);
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate')) continue;
        throw err;
      }
    }
    console.log(`✅ ${file} applied successfully`);
  }

  console.log('🎉 All migrations complete!');
}

async function cmdSeed() {
  await runFiles('seed', 'seed');
}

async function cmdDrop() {
  const dropSQL = `
    DO $$ 
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
      END LOOP;
      FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
      END LOOP;
      FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d JOIN pg_extension e ON d.refobjid = e.oid WHERE d.objid = p.oid AND d.deptype = 'e')
      ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
      END LOOP;
      FOR r IN (
        SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' AND t.typtype IN ('e','c')
        AND NOT EXISTS (SELECT 1 FROM pg_depend d JOIN pg_extension e ON d.refobjid = e.oid WHERE d.objid = t.oid AND d.deptype = 'e')
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `;

  console.log('🗑️  Dropping all database objects...');
  await runSQL(dropSQL);
  console.log('✅ All public schema objects dropped');

  console.log('🗑️  Cleaning auth data...');
  await runSQL('DELETE FROM auth.identities');
  await runSQL('DELETE FROM auth.users');
  console.log('✅ Auth users and identities cleared\n');

  console.log('🎉 Database cleanup completed!');
}

async function confirmThenRun(fn: () => Promise<void>) {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    console.log('⚠️  WARNING: This will DELETE ALL DATA in your database!\n');
    return fn();
  }

  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('⚠️  WARNING: This will DELETE ALL DATA in your database!\n');
  rl.question('Are you sure? (y/N): ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'y') {
      fn().catch((e) => { console.error(e); process.exit(1); });
    } else {
      console.log('❌ Cancelled.');
      process.exit(0);
    }
  });
}

// ── Main ─────────────────────────────────────────────────────────
const COMMANDS: Record<string, () => Promise<void>> = {
  schema: cmdSchema,
  migrate: cmdMigrate,
  seed: cmdSeed,
  drop: () => confirmThenRun(cmdDrop),
  reset: () => confirmThenRun(async () => {
    await cmdDrop();
    await cmdSchema();
    await cmdSeed();
  }),
};

const command = process.argv[2];

if (!command || command === '--help' || command === '-h') {
  console.log(`
Usage: tsx db.ts <command> [options]

Commands:
  schema     Apply schema files (schema*.sql)
  migrate    Run migration files (migrations/*.sql)
  seed       Run seed files (seed*.sql)
  drop       Drop all public objects + auth data
  reset      drop → schema → seed

Options:
  --yes, -y  Skip confirmation for destructive commands
`);
  process.exit(0);
}

if (!COMMANDS[command]) {
  console.error(`❌ Unknown command: ${command}\nRun "tsx db.ts --help" for usage.`);
  process.exit(1);
}

console.log(`🔗 Using Supabase at ${SUPABASE_URL}\n`);
COMMANDS[command]().catch((e) => {
  console.error('\n❌ Failed:', e.message || e);
  process.exit(1);
});
