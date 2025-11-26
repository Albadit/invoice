#!/usr/bin/env tsx

/**
 * Generate TypeScript types from PostgreSQL database
 * This script connects to the database and generates types
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

interface Column {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
}

interface TableInfo {
  table_name: string;
  columns: Column[];
}

interface EnumRow {
  enum_name: string;
  enum_values: string[];
}

interface TypeMap {
  [key: string]: string;
}

async function generateTypes() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('Connected to database...');

    // Query to get all tables and their columns
    const query = `
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'udt_name', c.udt_name,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name;
    `;

    const result = await client.query<TableInfo>(query);

    // Generate TypeScript interfaces
    let typeDefinitions = `// Auto-generated TypeScript types from PostgreSQL database
// Generated on: ${new Date().toISOString()}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

`;

    // Map PostgreSQL types to TypeScript types
    const typeMap: TypeMap = {
      'uuid': 'string',
      'text': 'string',
      'character varying': 'string',
      'varchar': 'string',
      'integer': 'number',
      'bigint': 'number',
      'smallint': 'number',
      'numeric': 'number',
      'decimal': 'number',
      'real': 'number',
      'double precision': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'timestamp with time zone': 'string',
      'timestamp without time zone': 'string',
      'time': 'string',
      'json': 'Json',
      'jsonb': 'Json',
      'ARRAY': 'string[]',
      'USER-DEFINED': 'string', // Will be handled separately for enums
    };

    // Get all enums
    const enumQuery = `
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname;
    `;

    const enumResult = await client.query<EnumRow>(enumQuery);
    const enums: Record<string, string[]> = {};

    enumResult.rows.forEach((row: any) => {
      // Parse the array if it comes as a string or handle it as an array
      let enumValues: string[];
      if (typeof row.enum_values === 'string') {
        // PostgreSQL array format: {value1,value2,value3}
        enumValues = row.enum_values.replace(/[{}]/g, '').split(',');
      } else if (Array.isArray(row.enum_values)) {
        enumValues = row.enum_values;
      } else {
        console.warn(`Unexpected enum_values format for ${row.enum_name}:`, row.enum_values);
        return;
      }
      
      enums[row.enum_name] = enumValues;
      typeDefinitions += `export type ${toPascalCase(row.enum_name)} = ${enumValues.map((v: string) => `'${v}'`).join(' | ')}\n\n`;
    });

    // Generate interfaces for each table
    result.rows.forEach((table: TableInfo) => {
      const tableName = table.table_name;
      const interfaceName = toPascalCase(tableName);
      
      typeDefinitions += `export interface ${interfaceName} {\n`;
      
      table.columns.forEach((col: Column) => {
        const columnName = col.column_name;
        let tsType = typeMap[col.data_type] || 'unknown';
        
        // Handle custom enums
        if (col.data_type === 'USER-DEFINED' && enums[col.udt_name]) {
          tsType = toPascalCase(col.udt_name);
        }
        
        // Handle nullable types
        const nullable = col.is_nullable === 'YES' ? ' | null' : '';
        
        typeDefinitions += `  ${columnName}: ${tsType}${nullable}\n`;
      });
      
      typeDefinitions += `}\n\n`;
    });

    // Add REST API operation types
    typeDefinitions += `// Helper types for REST API operations\n`;
    result.rows.forEach((table: TableInfo) => {
      const tableName = table.table_name;
      const interfaceName = toPascalCase(tableName);
      
      typeDefinitions += `export type ${interfaceName}Get = ${interfaceName}\n`;
      typeDefinitions += `export type ${interfaceName}Post = Omit<${interfaceName}, 'id' | 'created_at' | 'updated_at'>\n`;
      typeDefinitions += `export type ${interfaceName}Put = Omit<${interfaceName}, 'created_at' | 'updated_at'>\n`;
      typeDefinitions += `export type ${interfaceName}Patch = Partial<${interfaceName}Post>\n`;
      typeDefinitions += `export type ${interfaceName}Delete = Pick<${interfaceName}, 'id'>\n\n`;
    });

    // Add Database type
    typeDefinitions += `export interface Database {\n`;
    typeDefinitions += `  public: {\n`;
    typeDefinitions += `    Tables: {\n`;
    result.rows.forEach((table: TableInfo) => {
      const tableName = table.table_name;
      const interfaceName = toPascalCase(tableName);
      typeDefinitions += `      ${tableName}: {\n`;
      typeDefinitions += `        Row: ${interfaceName}\n`;
      typeDefinitions += `        Get: ${interfaceName}Get\n`;
      typeDefinitions += `        Post: ${interfaceName}Post\n`;
      typeDefinitions += `        Put: ${interfaceName}Put\n`;
      typeDefinitions += `        Patch: ${interfaceName}Patch\n`;
      typeDefinitions += `        Delete: ${interfaceName}Delete\n`;
      typeDefinitions += `      }\n`;
    });
    typeDefinitions += `    }\n`;
    typeDefinitions += `  }\n`;
    typeDefinitions += `}\n`;

    // Write to file
    const outputPath = path.join(__dirname, '..', 'supabase', 'database.types.ts');
    fs.writeFileSync(outputPath, typeDefinitions);
    
    console.log(`✅ Types generated successfully at: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating types:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Run the script
generateTypes();
