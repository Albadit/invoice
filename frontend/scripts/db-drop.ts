#!/usr/bin/env tsx

/**
 * Drop all tables in the database
 * This script will drop all tables, sequences, functions, and types in the public schema
 * WARNING: This will permanently delete all data!
 */

import { config } from 'dotenv';
import { Client } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration
interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const DB_CONFIG: DBConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
};

async function dropAllTables() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database...');

    // Drop all tables in the public schema
    console.log('\n🗑️  Dropping all database objects...');
    const dropTablesSQL = `
      DO $$ 
      DECLARE
          r RECORD;
      BEGIN
          -- Drop all tables first (this removes indexes too)
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          
          -- Drop all views
          FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
          END LOOP;
          
          -- Drop all sequences
          FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
              EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
          END LOOP;
          
          -- Drop user-defined functions only (exclude extension functions)
          FOR r IN (
              SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
              FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname = 'public'
              AND NOT EXISTS (
                  SELECT 1 FROM pg_depend d
                  JOIN pg_extension e ON d.refobjid = e.oid
                  WHERE d.objid = p.oid AND d.deptype = 'e'
              )
          ) LOOP
              EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
          END LOOP;
          
          -- Drop user-defined types only (exclude extension types and internal types)
          FOR r IN (
              SELECT t.typname
              FROM pg_type t
              JOIN pg_namespace n ON t.typnamespace = n.oid
              WHERE n.nspname = 'public'
              AND t.typtype IN ('e', 'c')  -- enum and composite types only
              AND NOT EXISTS (
                  SELECT 1 FROM pg_depend d
                  JOIN pg_extension e ON d.refobjid = e.oid
                  WHERE d.objid = t.oid AND d.deptype = 'e'
              )
          ) LOOP
              EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `;
    
    await client.query(dropTablesSQL);
    console.log('✅ All database objects dropped successfully\n');

    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database cleanup failed:');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Show usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage:
  npm run reset     - Drop all tables in the database

⚠️  WARNING: This will DELETE ALL DATA in your database!

The script will drop all tables, sequences, functions, and types in the public schema.

Environment variables:
  POSTGRES_HOST     - Database host (default: localhost)
  POSTGRES_PORT     - Database port (default: 5432)
  POSTGRES_DB       - Database name (default: postgres)
  POSTGRES_USER     - Database user (default: postgres)
  POSTGRES_PASSWORD - Database password (default: postgres)
  `);
  process.exit(0);
}

console.log('\n⚠️  WARNING: This will DELETE ALL DATA in your database!');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

// Give user 5 seconds to cancel
setTimeout(() => {
  dropAllTables();
}, 5000);
