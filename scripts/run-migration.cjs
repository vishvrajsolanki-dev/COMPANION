#!/usr/bin/env node
/**
 * Phase B — run the access-keys migration directly against the Supabase
 * Postgres database (bypasses the SQL Editor UI).
 *
 * Usage:
 *   node scripts/run-migration.cjs "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
 *
 * Find the connection string in:
 *   Supabase dashboard → Settings → Database → Connection string → URI
 *   (enable "Show connection string" if hidden)
 */
'use strict';

const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

const connStr = process.argv[2];
if (!connStr) {
  console.error('Usage: node scripts/run-migration.cjs "<database-connection-string>"');
  console.error('\nFind the URI in Supabase Dashboard → Settings → Database → Connection string → URI');
  process.exit(1);
}

const SQL_PATH = path.join(__dirname, '..', 'supabase', 'migrations', '0001_access_keys.sql');

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf-8');
  console.log(`  SQL file: ${path.relative(process.cwd(), SQL_PATH)}`);
  console.log(`  SQL size: ${sql.length} chars`);

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

  console.log('  Connecting to database…');
  await client.connect();
  console.log('  Connected.');

  console.log('  Running migration…');
  await client.query(sql);
  console.log('  Migration applied successfully.');

  // Quick verification: check the table exists.
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' and table_name in ('access_keys','profiles')"
  );
  const tables = rows.map(r => r.table_name);
  console.log(`  Tables found: ${tables.join(', ')}`);

  const fn = await client.query(
    "select routine_name from information_schema.routines where routine_schema='public' and routine_name='activate_access_key'"
  );
  console.log(`  Function found: ${fn.rows[0]?.routine_name ?? 'MISSING'}`);

  await client.end();
  console.log('\n  ✓ Done. You can close this window and create .env.local next.');
}

main().catch(err => {
  console.error('\n  ✗ Migration failed:', err.message);
  process.exit(1);
});
