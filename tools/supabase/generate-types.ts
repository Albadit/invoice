#!/usr/bin/env tsx

/**
 * Generate TypeScript types from Supabase REST API (OpenAPI spec)
 * 
 * Uses only SUPABASE_URL + SUPABASE_ANON_KEY — no direct Postgres connection needed.
 * Fetches the PostgREST OpenAPI spec and generates types from definitions.
 * 
 * Usage:
 *   npx tsx generate-types-rest.ts
 * 
 * Env vars (from .env or environment):
 *   NEXT_PUBLIC_SUPABASE_URL   - e.g. http://localhost:8000
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  process.exit(1);
}

// ── OpenAPI Schema types ────────────────────────────────────────────

interface OpenApiProperty {
  type?: string;
  format?: string;
  description?: string;
  default?: string;
  enum?: string[];
  items?: { type?: string; format?: string; enum?: string[] };
  maxLength?: number;
}

interface OpenApiDefinition {
  type: string;
  required?: string[];
  properties: Record<string, OpenApiProperty>;
  description?: string;
}

interface OpenApiSpec {
  definitions: Record<string, OpenApiDefinition>;
  paths?: Record<string, unknown>;
}

// ── Type mapping ────────────────────────────────────────────────────

function pgFormatToTs(prop: OpenApiProperty): string {
  const fmt = prop.format || '';
  const type = prop.type || '';

  // Enum column
  if (prop.enum && prop.enum.length > 0) {
    return prop.enum.map(v => `'${v}'`).join(' | ');
  }

  // Array type
  if (type === 'array') {
    if (prop.items?.enum) {
      const inner = prop.items.enum.map(v => `'${v}'`).join(' | ');
      return `(${inner})[]`;
    }
    const innerType = pgFormatToTs({ type: prop.items?.type, format: prop.items?.format });
    return `${innerType}[]`;
  }

  // Map by format (carries the original PG type name)
  const formatMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'character varying': 'string',
    'name': 'string',
    'citext': 'string',
    'inet': 'string',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'money': 'string',
    'boolean': 'boolean',
    'date': 'string',
    'time with time zone': 'string',
    'time without time zone': 'string',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'interval': 'string',
    'json': 'Json',
    'jsonb': 'Json',
    'bytea': 'string',
    'tsvector': 'string',
    'tsquery': 'string',
    'point': 'string',
    'oid': 'number',
  };

  if (fmt && formatMap[fmt]) return formatMap[fmt];

  // Fallback by JSON Schema type
  const typeMap: Record<string, string> = {
    'string': 'string',
    'integer': 'number',
    'number': 'number',
    'boolean': 'boolean',
    'object': 'Json',
  };

  return typeMap[type] || 'unknown';
}

// ── Helpers ─────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** Heuristic: detect likely PK columns from default values and required fields */
function detectPrimaryKeys(
  tableName: string,
  props: Record<string, OpenApiProperty>,
  required: string[],
): string[] {
  const pks: string[] = [];
  for (const [col, prop] of Object.entries(props)) {
    const def = prop.default || '';
    // uuid generation functions
    if (/gen_random_uuid|uuid_generate/i.test(def)) {
      pks.push(col);
      continue;
    }
    // serial / identity columns (nextval)
    if (/nextval\(/i.test(def)) {
      pks.push(col);
      continue;
    }
  }
  // Fallback chain: 'id' column → first required column → first column
  if (pks.length === 0) {
    if (props['id']) {
      pks.push('id');
    } else if (required.length > 0) {
      pks.push(required[0]);
    } else {
      const firstCol = Object.keys(props)[0];
      if (firstCol) pks.push(firstCol);
    }
  }
  return pks;
}

/** Detect columns that are auto-generated (server defaults) */
function isAutoColumn(col: string, prop: OpenApiProperty): boolean {
  const def = prop.default || '';
  if (/gen_random_uuid|uuid_generate|nextval\(/i.test(def)) return true;
  if (col === 'created_at' || col === 'updated_at') return true;
  if (prop.format === 'tsvector' || prop.type === 'tsvector') return true;
  return false;
}

// ── Main ────────────────────────────────────────────────────────────

async function generateTypes() {
  const openApiUrl = `${SUPABASE_URL}/rest/v1/`;

  console.log(`Fetching OpenAPI spec from ${openApiUrl} ...`);

  const response = await fetch(openApiUrl, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/openapi+json',
    },
  });

  if (!response.ok) {
    console.error(`❌ Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const spec: OpenApiSpec = await response.json() as OpenApiSpec;
  const definitions = spec.definitions;

  if (!definitions || Object.keys(definitions).length === 0) {
    console.error('❌ No table definitions found in OpenAPI spec. Check RLS / grants for anon role.');
    process.exit(1);
  }

  const tableNames = Object.keys(definitions).sort();
  console.log(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`);

  // ── Collect enums ───────────────────────────────────────────────
  const enumTypes = new Map<string, string[]>(); // enumTypeName -> values

  for (const tableName of tableNames) {
    const def = definitions[tableName];
    for (const [, prop] of Object.entries(def.properties)) {
      if (prop.enum && prop.enum.length > 0 && prop.format) {
        // PostgREST puts the PG type name in format for enum columns
        const enumName = prop.format;
        if (!enumTypes.has(enumName)) {
          enumTypes.set(enumName, prop.enum);
        }
      }
      if (prop.items?.enum && prop.items.format) {
        const enumName = prop.items.format;
        if (!enumTypes.has(enumName)) {
          enumTypes.set(enumName, prop.items.enum);
        }
      }
    }
  }

  // ── Build output ────────────────────────────────────────────────
  let out = `// Auto-generated TypeScript types from Supabase REST API (OpenAPI spec)
// Generated on: ${new Date().toISOString()}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

`;

  // Enum types
  for (const [enumName, values] of [...enumTypes.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    out += `export type ${toPascalCase(enumName)} = ${values.map(v => `'${v}'`).join(' | ')}\n\n`;
  }

  // Table interfaces
  for (const tableName of tableNames) {
    const def = definitions[tableName];
    const required = new Set(def.required || []);
    const interfaceName = toPascalCase(tableName);

    out += `export interface ${interfaceName} {\n`;

    for (const [col, prop] of Object.entries(def.properties)) {
      let tsType: string;

      // Use named enum type if this column is a known enum
      if (prop.enum && prop.format && enumTypes.has(prop.format)) {
        tsType = toPascalCase(prop.format);
      } else if (prop.items?.enum && prop.items.format && enumTypes.has(prop.items.format)) {
        tsType = `${toPascalCase(prop.items.format)}[]`;
      } else {
        tsType = pgFormatToTs(prop);
      }

      const nullable = required.has(col) ? '' : ' | null';
      out += `  ${col}: ${tsType}${nullable}\n`;
    }

    out += `}\n\n`;
  }

  // REST operation helper types
  out += `// Helper types for REST API operations\n`;
  for (const tableName of tableNames) {
    const def = definitions[tableName];
    const interfaceName = toPascalCase(tableName);
    const pkColumns = detectPrimaryKeys(tableName, def.properties, def.required || []);

    const pkPickList = pkColumns.map(c => `'${c}'`).join(' | ');

    // Columns to omit from Post type
    const autoColumns = Object.entries(def.properties)
      .filter(([col, prop]) => isAutoColumn(col, prop))
      .map(([col]) => `'${col}'`);
    const omitSet = new Set([...pkColumns.map(c => `'${c}'`), ...autoColumns]);
    const omitList = [...omitSet].join(' | ');

    out += `export type ${interfaceName}Get = ${interfaceName}\n`;
    out += `export type ${interfaceName}Post = Omit<${interfaceName}, ${omitList}>\n`;
    out += `export type ${interfaceName}Put = Omit<${interfaceName}, 'created_at' | 'updated_at'>\n`;
    out += `export type ${interfaceName}Patch = Partial<${interfaceName}Post>\n`;
    out += `export type ${interfaceName}Delete = Pick<${interfaceName}, ${pkPickList}>\n\n`;
  }

  // Database type
  out += `export interface Database {\n`;
  out += `  public: {\n`;
  out += `    Tables: {\n`;
  for (const tableName of tableNames) {
    const interfaceName = toPascalCase(tableName);
    out += `      ${tableName}: {\n`;
    out += `        Row: ${interfaceName}\n`;
    out += `        Get: ${interfaceName}Get\n`;
    out += `        Post: ${interfaceName}Post\n`;
    out += `        Put: ${interfaceName}Put\n`;
    out += `        Patch: ${interfaceName}Patch\n`;
    out += `        Delete: ${interfaceName}Delete\n`;
    out += `      }\n`;
  }
  out += `    }\n`;
  out += `  }\n`;
  out += `}\n`;

  // Write
  const outputPath = path.join(__dirname, '..', '..', 'frontend', 'lib', 'database.types.ts');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, out);

  console.log(`✅ Types generated successfully at: ${outputPath}`);
}

generateTypes();