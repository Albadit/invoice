import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: 'tools/supabase/.env' });

const c = new Client({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function main() {
  await c.connect();
  const r = await c.query("SELECT id, name, substring(styling, 1, 800) as snippet FROM templates LIMIT 3");
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
