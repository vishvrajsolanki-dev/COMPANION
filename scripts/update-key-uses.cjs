#!/usr/bin/env node
/**
 * Update max_uses for an access key (e.g. to allow re-activation after sign-out).
 * Usage: node scripts/update-key-uses.cjs "<db-connection-string>" [new-max-uses]
 */
'use strict';
const { Client } = require('pg');

const connStr = process.argv[2];
const newMax = parseInt(process.argv[3] || '10', 10);

if (!connStr) {
  console.error('Usage: node scripts/update-key-uses.cjs "<db-connection-string>" [new-max-uses]');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const code = 'SEFV-KMAA-2C6K-K72S';
  await client.query(
    'UPDATE public.access_keys SET max_uses = $1 WHERE code = $2',
    [newMax, code]
  );

  const { rows } = await client.query('SELECT code, role, label, max_uses, used_count FROM public.access_keys');
  console.log(`Updated max_uses to ${newMax}. Current keys:`);
  rows.forEach(r => console.log(`  ${r.code} | role=${r.role} | label=${r.label} | uses=${r.used_count}/${r.max_uses}`));
  await client.end();
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
