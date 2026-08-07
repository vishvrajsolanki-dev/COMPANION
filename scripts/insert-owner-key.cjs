#!/usr/bin/env node
/**
 * Insert the owner access key into Supabase Postgres directly.
 * Usage: node scripts/insert-owner-key.cjs "<database-connection-string>"
 */
'use strict';
const { Client } = require('pg');

const connStr = process.argv[2];
if (!connStr) {
  console.error('Usage: node scripts/insert-owner-key.cjs "<db-connection-string>"');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(
    "INSERT INTO public.access_keys (code, role, max_uses, label) VALUES ('SEFV-KMAA-2C6K-K72S', 'owner', 1, 'Vishvraj')"
  );
  const { rows } = await client.query('SELECT code, role, label, max_uses, used_count FROM public.access_keys');
  console.log('Owner key inserted. Current keys:');
  rows.forEach(r => console.log(`  ${r.code} | role=${r.role} | label=${r.label} | uses=${r.used_count}/${r.max_uses}`));
  await client.end();
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
