#!/usr/bin/env node
/**
 * Apply any migration SQL file directly to the Supabase Postgres database
 * (bypasses the SQL Editor UI). Generic — 0001, 0002, and later migrations.
 *
 * Usage:
 *   node scripts/apply-migration.cjs "<db-connection-string>" <sql-file>
 *
 * Example:
 *   node scripts/apply-migration.cjs "postgresql://..." supabase/migrations/0002_admin_portal.sql
 *
 * Find the connection string in:
 *   Supabase dashboard → Settings → Database → Connection string → URI
 */
'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connStr = process.argv[2];
const sqlFile = process.argv[3];

if (!connStr || !sqlFile) {
  console.error('Usage: node scripts/apply-migration.cjs "<db-connection-string>" <sql-file>');
  process.exit(1);
}

const sqlPath = path.resolve(sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlFile}`);
  process.exit(1);
}

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`  SQL file: ${path.relative(process.cwd(), sqlPath)}`);
  console.log(`  SQL size: ${sql.length} chars`);

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  console.log('  Connecting…');
  await client.connect();
  console.log('  Connected.');

  console.log('  Running migration…');
  await client.query(sql);
  console.log('  ✓ Migration applied.');

  // Quick verification: list the admin functions that should now exist.
  const { rows } = await client.query(
    "select routine_name from information_schema.routines where routine_schema='public' and routine_name like 'admin_%' order by routine_name"
  );
  const fns = rows.map(r => r.routine_name);
  console.log(`  Admin functions found: ${fns.length ? fns.join(', ') : 'NONE'}`);

  await client.end();
  console.log('\n  ✓ Done.');
}

main().catch(err => {
  console.error('\n  ✗ Migration failed:', err.message);
  process.exit(1);
});
