#!/usr/bin/env tsx
import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '.env') });

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

/**
 * Split SQL text into individual statements, respecting $$ dollar-quoted blocks.
 * Semicolons inside $$ ... $$ (PL/pgSQL function bodies) are not treated as delimiters.
 */
function splitStatements(sql: string): string[] {
  const results: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let i = 0;

  while (i < sql.length) {
    // Detect $$ toggle
    if (sql[i] === '$' && sql[i + 1] === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i += 2;
      continue;
    }

    // Skip single-line comments
    if (!inDollarQuote && sql[i] === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }

    // Statement delimiter (only outside $$ blocks)
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

async function run() {
  await client.connect();
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`⏳ Running migration: ${file}...`);

    // Split SQL into individual statements, respecting $$ function bodies
    const statements = splitStatements(sql);

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err: any) {
        // Ignore "already exists" errors (columns, indexes, extensions, etc.)
        if (['42701', '42P07', '42710'].includes(err.code)) {
          // 42701 = column exists, 42P07 = relation exists, 42710 = object exists
          continue;
        }
        // Ignore duplicate index built concurrently (leaves invalid index)
        if (err.code === '23505') continue;
        throw err;
      }
    }
    console.log(`✅ ${file} applied successfully`);
  }
  
  await client.end();
  console.log('🎉 All migrations complete!');
}

run().catch(e => { console.error(e); process.exit(1); });
