#!/usr/bin/env tsx

/**
 * Seed the database with sample data
 * This script runs only the seed.sql file
 */

import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
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

async function seedDatabase() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database...');

    const supabasePath = path.join(__dirname, '..', 'db');

    // Find all seed files (files starting with 'seed')
    const files = fs.readdirSync(supabasePath);
    const seedFiles = files
      .filter(file => {
        const filePath = path.join(supabasePath, file);
        const stat = fs.statSync(filePath);
        return file.startsWith('seed') && file.endsWith('.sql') && stat.isFile();
      })
      .sort((a, b) => {
        // Always run init files first, then others alphabetically
        const aIsInit = a.includes('init');
        const bIsInit = b.includes('init');
        if (aIsInit && !bIsInit) return -1;
        if (!aIsInit && bIsInit) return 1;
        return a.localeCompare(b);
      });

    if (seedFiles.length === 0) {
      console.error('❌ No seed files found (seed*.sql)');
      process.exit(1);
    }

    // Check for multiple init files
    const initFiles = seedFiles.filter(f => f.includes('init'));
    if (initFiles.length > 1) {
      console.error(`❌ Error: Found multiple seed initialization files: ${initFiles.join(', ')}`);
      console.error('   Only one seed file with "init" in the name is allowed.');
      process.exit(1);
    }

    console.log(`📝 Found ${seedFiles.length} seed file(s):\n${seedFiles.map(f => `   - ${f}`).join('\n')}\n`);

    // Run each seed file in order
    for (const file of seedFiles) {
      const filePath = path.join(supabasePath, file);
      
      console.log(`⏳ Running ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`✅ ${file} executed successfully\n`);
      } catch (error) {
        console.error(`❌ Error running ${file}:`);
        if (error instanceof Error) {
          console.error(error.message);
        }
        throw error;
      }
    }

    console.log('🎉 All seed files executed successfully!');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();
