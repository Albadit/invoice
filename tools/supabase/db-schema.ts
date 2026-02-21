#!/usr/bin/env tsx

/**
 * Apply database schema
 * This script runs only the schema.sql file
 */

import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the same directory
config({ path: path.join(__dirname, '.env') });

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

async function applySchema() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database...');

    const supabasePath = path.join(__dirname, '..', 'db');
    console.log(`📁 Looking for schema files in: ${supabasePath}`);

    // Find all schema files (files starting with 'schema')
    const files = fs.readdirSync(supabasePath);
    console.log(`📂 All files in directory: ${files.join(', ')}`);
    
    const schemaFiles = files
      .filter(file => {
        const filePath = path.join(supabasePath, file);
        const stat = fs.statSync(filePath);
        return file.startsWith('schema') && file.endsWith('.sql') && stat.isFile();
      })
      .sort((a, b) => {
        // Always run init files first, then others alphabetically
        const aIsInit = a.includes('init');
        const bIsInit = b.includes('init');
        if (aIsInit && !bIsInit) return -1;
        if (!aIsInit && bIsInit) return 1;
        return a.localeCompare(b);
      });

    if (schemaFiles.length === 0) {
      console.error('❌ No schema files found (schema*.sql)');
      console.log('Available files:', files.filter(f => f.endsWith('.sql')));
      process.exit(1);
    }

    // Check for multiple init files
    const initFiles = schemaFiles.filter(f => f.includes('init'));
    if (initFiles.length > 1) {
      console.error(`❌ Error: Found multiple schema initialization files: ${initFiles.join(', ')}`);
      console.error('   Only one schema file with "init" in the name is allowed.');
      process.exit(1);
    }

    console.log(`📝 Found ${schemaFiles.length} schema file(s):\n${schemaFiles.map(f => `   - ${f}`).join('\n')}\n`);

    // Run each schema file in order
    for (const file of schemaFiles) {
      const filePath = path.join(supabasePath, file);
      
      console.log(`⏳ Running ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`   File size: ${sql.length} bytes`);

      try {
        await client.query(sql);
        console.log(`✅ ${file} executed successfully\n`);
      } catch (error) {
        console.error(`❌ Error running ${file}:`);
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        } else {
          console.error('Unknown error:', error);
        }
        throw error;
      }
    }

    console.log('🎉 All schema files applied successfully!');
    
  } catch (error) {
    console.error('\n❌ Schema application failed:');
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      if ('code' in error) {
        console.error('Error code:', (error as any).code);
      }
    } else {
      console.error('Unknown error type:', typeof error);
      console.error('Error value:', error);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
