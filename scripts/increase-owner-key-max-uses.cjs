#!/usr/bin/env node
/**
 * Increase the owner key's max_uses so live verification can proceed.
 * Requires Supabase SERVICE_ROLE key (not the anon key).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/increase-owner-key-max-uses.cjs
 *   Or with direct PG connection:
 *   SUPABASE_DB_URI=postgresql://... node scripts/increase-owner-key-max-uses.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const { requireOwnerKey } = require('./lib/env.cjs');
const OWNER_KEY = requireOwnerKey();
const NEW_MAX_USES = 100;

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUri = process.env.SUPABASE_DB_URI;

  if (!serviceRoleKey && !dbUri) {
    console.error('❌ Need either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_URI env var');
    console.error('');
    console.error('Option 1: Get service role key from Supabase Dashboard → Settings → API → service_role');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/increase-owner-key-max-uses.cjs');
    console.error('');
    console.error('Option 2: Get direct PG URI from Supabase Dashboard → Settings → Database → Connection string → URI');
    console.error('  SUPABASE_DB_URI=postgresql://... node scripts/increase-owner-key-max-uses.cjs');
    process.exit(1);
  }

  console.log(`Updating owner key ${OWNER_KEY} max_uses → ${NEW_MAX_USES}...`);

  if (serviceRoleKey) {
    const supabase = createClient(env.VITE_SUPABASE_URL, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase
      .from('access_keys')
      .update({ max_uses: NEW_MAX_USES })
      .eq('code', OWNER_KEY)
      .select();
    if (error) {
      console.error('❌ Update failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Updated via service role:', data);
  } else if (dbUri) {
    const { Client } = require('pg');
    const client = new Client({ connectionString: dbUri });
    await client.connect();
    const res = await client.query(
      `UPDATE public.access_keys SET max_uses = $1 WHERE code = $2 RETURNING *`,
      [NEW_MAX_USES, OWNER_KEY]
    );
    await client.end();
    console.log('✅ Updated via direct PG:', res.rows);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});