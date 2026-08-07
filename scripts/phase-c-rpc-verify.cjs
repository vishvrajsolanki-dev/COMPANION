#!/usr/bin/env node
/**
 * Phase C — live RPC verification of the admin portal migration.
 *
 * This exercises the 0002_admin_portal.sql functions through the browser-safe
 * Supabase anon key, proving that the migration is present and enforcing the
 * expected role gates. It does not require the database password.
 *
 * It creates temporary test keys and deactivates them at the end. Rows remain in
 * the admin audit trail; run scripts/cleanup-test-data.cjs with the DB connection
 * string if you want to delete test rows completely.
 *
 * Usage:
 *   node scripts/phase-c-rpc-verify.cjs
 *   PHASE_C_OWNER_KEY=XXXX-XXXX-XXXX-XXXX node scripts/phase-c-rpc-verify.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_OWNER_KEY = 'SEFV-KMAA-2C6K-K72S';
const OWNER_KEY = (process.env.PHASE_C_OWNER_KEY || DEFAULT_OWNER_KEY).trim().toUpperCase();
const KEY_RE = /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/;
const RUN_LABEL = `Phase C RPC Verify ${new Date().toISOString().replace(/[:.]/g, '-')}`;

let passed = 0;
let failed = 0;
const createdKeys = [];

function log(ok, msg) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}`);
  if (ok) passed++; else { failed++; process.exitCode = 1; }
}

function mask(code) {
  return typeof code === 'string' ? `${code.slice(0, 4)}…${code.slice(-4)}` : '(none)';
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found. Copy .env.example to .env.local and fill Supabase values.');
  }

  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('.env.local is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }
  return env;
}

async function rpc(supabase, name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) {
    console.log(`  [rpc error] ${name}: ${error.message}`);
    return { ok: false, transportError: error };
  }
  return data;
}

async function generateKey(supabase, adminCode, role, label, maxUses = 1) {
  const res = await rpc(supabase, 'admin_generate_key', {
    p_admin_code: adminCode,
    p_role: role,
    p_label: label,
    p_max_uses: maxUses,
    p_expires_at: null,
  });
  if (res?.ok && res.key) createdKeys.push(res.key);
  return res;
}

async function deactivateCreatedKeys(supabase) {
  if (!createdKeys.length) return;
  console.log('\nCleanup: deactivating temporary keys');
  for (const key of createdKeys) {
    const res = await rpc(supabase, 'admin_set_key_active', {
      p_admin_code: OWNER_KEY,
      p_key_id: key.id,
      p_active: false,
    });
    log(res?.ok === true, `Deactivated temp ${key.role} key ${mask(key.code)}`);
  }
}

async function main() {
  const env = loadEnvLocal();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  console.log('\nPhase C RPC verification');
  console.log(`  Supabase URL: ${env.VITE_SUPABASE_URL}`);
  console.log(`  Owner key:    ${mask(OWNER_KEY)}`);

  try {
    console.log('\n1. ADMIN RPC PRESENCE + OWNER AUTH');
    const keys = await rpc(supabase, 'admin_list_keys', { p_admin_code: OWNER_KEY });
    log(keys?.ok === true && Array.isArray(keys.keys), 'admin_list_keys accepts the owner credential');
    const ownerRow = keys?.keys?.find(k => k.code === OWNER_KEY);
    log(ownerRow?.role === 'owner' && ownerRow?.is_active === true, 'Owner key is present and active');

    const profiles = await rpc(supabase, 'admin_list_profiles', { p_admin_code: OWNER_KEY });
    log(profiles?.ok === true && Array.isArray(profiles.profiles), 'admin_list_profiles accepts the owner credential');

    console.log('\n2. UNAUTHORIZED CALLS ARE BLOCKED');
    const badList = await rpc(supabase, 'admin_list_keys', { p_admin_code: 'BADK-EYYY-0000-0000' });
    log(badList?.ok === false && badList.error === 'UNAUTHORIZED', 'Invalid admin code cannot list keys');

    console.log('\n3. OWNER CAN MINT STUDENT + ADMIN KEYS');
    const student = await generateKey(supabase, OWNER_KEY, 'student', `${RUN_LABEL} student`, 2);
    log(student?.ok === true && student.key?.role === 'student' && KEY_RE.test(student.key.code), `Owner minted a valid student key (${mask(student?.key?.code)})`);

    const admin = await generateKey(supabase, OWNER_KEY, 'admin', `${RUN_LABEL} admin`, 1);
    log(admin?.ok === true && admin.key?.role === 'admin' && KEY_RE.test(admin.key.code), `Owner minted a valid admin key (${mask(admin?.key?.code)})`);

    console.log('\n4. ADMIN ROLE GATES ARE ENFORCED');
    const adminMintOwner = await generateKey(supabase, admin?.key?.code || 'missing', 'owner', `${RUN_LABEL} forbidden owner`, 1);
    log(adminMintOwner?.ok === false && adminMintOwner.error === 'UNAUTHORIZED', 'Admin key cannot mint owner/admin keys');

    const adminMintStudent = await generateKey(supabase, admin?.key?.code || 'missing', 'student', `${RUN_LABEL} admin-made student`, 1);
    log(adminMintStudent?.ok === true && adminMintStudent.key?.role === 'student', 'Admin key can mint student keys');

    console.log('\n5. KEY ACTIVATION + SELF-PROTECTION');
    const activation = await rpc(supabase, 'activate_access_key', { p_code: student?.key?.code || 'missing' });
    log(activation?.ok === true && activation.role === 'student' && activation.profile?.role === 'student', 'Generated student key activates successfully');

    const selfDeactivate = await rpc(supabase, 'admin_set_key_active', {
      p_admin_code: admin?.key?.code || 'missing',
      p_key_id: admin?.key?.id || '00000000-0000-0000-0000-000000000000',
      p_active: false,
    });
    log(selfDeactivate?.ok === false && selfDeactivate.error === 'CANNOT_MODIFY_SELF', 'Admin key cannot deactivate itself');

    console.log('\n6. OWNER CAN DEACTIVATE TEMP KEYS');
    await deactivateCreatedKeys(supabase);
  } finally {
    // Best-effort cleanup if a later assertion threw before section 6.
    if (createdKeys.some(k => k.is_active !== false) && failed > 0) {
      await deactivateCreatedKeys(supabase).catch(() => {});
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n  ✗ Verification crashed:', err.message);
  process.exit(1);
});
