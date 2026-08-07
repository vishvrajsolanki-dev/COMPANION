#!/usr/bin/env node
/**
 * Delete leftover test data from live runs of phase-c-live-verify.cjs.
 *
 * The Phase C verify script mints a "Tester" key and redeems it with a student
 * activation. That key + its cascading profile are test residue — this removes
 * them (profiles cascade on key delete).
 *
 * Usage: node scripts/cleanup-test-data.cjs "<db-connection-string>"
 */
'use strict';
const { Client } = require('pg');

const connStr = process.argv[2];
if (!connStr) {
  console.error('Usage: node scripts/cleanup-test-data.cjs "<db-connection-string>"');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Show what's currently there before deleting.
  const before = await client.query(
    `select k.code, k.role, k.label, k.used_count, k.max_uses,
            p.name as profile_name, p.role as profile_role
     from public.access_keys k
     left join public.profiles p on p.access_key_id = k.id
     order by k.created_at`
  );
  console.log('Current access keys:');
  before.rows.forEach(r =>
    console.log(`  ${r.code} | key=${r.label ?? '—'}(${r.role}) | used ${r.used_count}/${r.max_uses}` +
      (r.profile_name ? ` | profile="${r.profile_name}"(${r.profile_role})` : ''))
  );

  const del = await client.query(
    `delete from public.access_keys
     where label = 'Tester' or label like 'tester%' or label like 'Test%'`
  );
  console.log(`\n  Deleted ${del.rowCount} test key(s) (cascades to profiles).`);

  // Confirm the owner key survived.
  const owners = await client.query(
    `select code, role, label, max_uses, used_count from public.access_keys where role = 'owner'`
  );
  owners.rows.forEach(r => console.log(`  Kept owner key ${r.code} (uses ${r.used_count}/${r.max_uses})`));

  await client.end();
  console.log('\n  ✓ Done.');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
