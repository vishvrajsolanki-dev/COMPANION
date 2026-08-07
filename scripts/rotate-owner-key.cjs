#!/usr/bin/env node
/**
 * Rotate the owner access key using only public Supabase RPCs.
 *
 * The old owner key must still be active at the start. The new owner key is
 * written to .env.local as VERIFY_OWNER_KEY, then used to deactivate the old key.
 *
 * Usage:
 *   ROTATE_OLD_OWNER_KEY=XXXX-XXXX-XXXX-XXXX node scripts/rotate-owner-key.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { loadEnvLocal } = require('./lib/env.cjs');

const KEY_RE = /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/;
const LABEL = 'Owner - rotated 2026-08-07';

function mask(code) {
  return typeof code === 'string' && code.length >= 9 ? `${code.slice(0, 4)}…${code.slice(-4)}` : '(none)';
}

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function setEnvLocalValue(name, value) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const before = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = before.split(/\r?\n/);
  const marker = '# Current owner/admin key used by local verification scripts only. Keep this file gitignored.';
  const assignment = `${name}=${value}`;
  let replaced = false;
  const next = lines.map(line => {
    if (line.trim().startsWith(`${name}=`)) {
      replaced = true;
      return assignment;
    }
    return line;
  });
  if (!replaced) {
    if (next.length && next[next.length - 1].trim() !== '') next.push('');
    next.push(marker, assignment);
  }
  fs.writeFileSync(envPath, next.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n'));
}

async function rpc(supabase, name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(`${name} transport failed: ${error.message}`);
  return data;
}

async function main() {
  loadEnvLocal();
  const oldKey = requireEnv('ROTATE_OLD_OWNER_KEY').toUpperCase();
  const url = requireEnv('VITE_SUPABASE_URL');
  const anon = requireEnv('VITE_SUPABASE_ANON_KEY');
  if (!KEY_RE.test(oldKey)) throw new Error('ROTATE_OLD_OWNER_KEY is not in XXXX-XXXX-XXXX-XXXX format');

  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  console.log('Owner key rotation');
  console.log(`  Old owner key: ${mask(oldKey)}`);
  console.log(`  Label:         ${LABEL}`);

  const oldAuth = await rpc(supabase, 'admin_list_keys', { p_admin_code: oldKey });
  if (oldAuth?.ok !== true) throw new Error(`Old owner key cannot list keys: ${JSON.stringify(oldAuth)}`);

  const mint = await rpc(supabase, 'admin_generate_key', {
    p_admin_code: oldKey,
    p_role: 'owner',
    p_label: LABEL,
    p_max_uses: 1,
    p_expires_at: null,
  });
  if (mint?.ok !== true || !mint.key?.code || !mint.key?.id) {
    throw new Error(`Failed to mint new owner key: ${JSON.stringify(mint)}`);
  }
  const newKey = String(mint.key.code).toUpperCase();
  if (!KEY_RE.test(newKey)) throw new Error(`New owner key has unexpected format: ${mask(newKey)}`);
  console.log(`  New owner key: ${mask(newKey)} (full value saved to .env.local)`);

  setEnvLocalValue('VERIFY_OWNER_KEY', newKey);

  const keys = await rpc(supabase, 'admin_list_keys', { p_admin_code: newKey });
  if (keys?.ok !== true || !Array.isArray(keys.keys)) {
    throw new Error(`New owner key cannot list keys: ${JSON.stringify(keys)}`);
  }
  const oldRows = keys.keys.filter(k => k.code === oldKey);
  if (oldRows.length !== 1) throw new Error(`Expected exactly one old owner row, found ${oldRows.length}`);
  const oldRow = oldRows[0];

  const deact = await rpc(supabase, 'admin_set_key_active', {
    p_admin_code: newKey,
    p_key_id: oldRow.id,
    p_active: false,
  });
  if (deact?.ok !== true) throw new Error(`Failed to deactivate old owner key: ${JSON.stringify(deact)}`);
  console.log('  Old owner key deactivated');

  const oldActivation = await rpc(supabase, 'activate_access_key', { p_code: oldKey });
  if (oldActivation?.ok !== false || oldActivation.error !== 'INACTIVE_KEY') {
    throw new Error(`Old key did not return INACTIVE_KEY: ${JSON.stringify(oldActivation)}`);
  }
  console.log('  Verified old key returns INACTIVE_KEY');

  const postRotate = await rpc(supabase, 'admin_list_keys', { p_admin_code: newKey });
  if (postRotate?.ok !== true) throw new Error(`New owner key failed post-rotation admin RPC: ${JSON.stringify(postRotate)}`);
  console.log('  Verified new owner key can perform owner RPCs without consuming its one activation use');

  console.log('\n✓ Rotation complete. The new full owner key is in .env.local as VERIFY_OWNER_KEY.');
  console.log('  IMPORTANT: Do not call activate_access_key with the new key except on the real admin device, because max_uses=1.');
}

main().catch(err => {
  console.error(`\n✗ Rotation failed: ${err.message}`);
  process.exit(1);
});
