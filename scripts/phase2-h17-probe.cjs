#!/usr/bin/env node
/**
 * Phase 2 — H17 live probe: "Fresh key activation not creating device_sessions row".
 *
 * Determines systemic vs. isolated by testing TWO fresh student keys end-to-end
 * against the live Supabase backend, exactly as the browser does:
 *
 *   1. mint temp student key N via admin_generate_key   (owner key)
 *   2. activate it via activate_access_key(p_code, p_device_id, p_device_name)
 *      with a UNIQUE device_id (the raw REST payload the client sends)
 *   3. read the sessions back via admin_list_sessions    (owner sees all)
 *      → does the freshly-activated device appear?
 *   4. clean up: revoke the session + deactivate the temp key
 *
 * Two fresh keys, two distinct device ids. If NEITHER creates a session row the
 * bug is systemic (RPC/DB/path issue). If only one does, it's isolated to a
 * device/code-specific condition. Cleans up all rows it creates regardless.
 *
 * Run: node scripts/phase2-h17-probe.cjs
 */
'use strict';

const { requireOwnerKey } = require('./lib/env.cjs');

const OWNER_KEY = requireOwnerKey();

function loadEnv() {
  const env = {};
  for (const line of require('fs').readFileSync(require('path').resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

if (!URL || !ANON) throw new Error('.env.local missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');

async function rpc(name, params) {
  const r = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = JSON.parse(await r.text());
  return { status: r.status, body };
}

let pass = 0, fail = 0;
function log(ok, msg, extra) {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}${extra ? '  → ' + extra : ''}`);
  ok ? pass++ : fail++;
}

/** Mint a fresh student key owned by a temp account, return { id, code }. */
async function mintStudentKey(label) {
  const r = await rpc('admin_generate_key', {
    p_admin_code: OWNER_KEY,
    p_role: 'student',
    p_label: label,
    p_max_uses: 5,
    p_expires_at: null,
  });
  if (r.body?.ok !== true || !r.body.key?.code) throw new Error(`mint failed: ${JSON.stringify(r.body)}`);
  return { id: r.body.key.id, code: String(r.body.key.code).toUpperCase() };
}

/** Activate exactly like the client: activate_access_key(p_code, p_device_id, p_device_name). */
async function activate(code, deviceId, deviceName) {
  return rpc('activate_access_key', {
    p_code: code,
    p_device_id: deviceId,
    p_device_name: deviceName,
  });
}

/** Owner sees all sessions — look for a device_id. */
async function findSession(deviceId) {
  const r = await rpc('admin_list_sessions', { p_admin_code: OWNER_KEY });
  if (r.body?.ok !== true || !Array.isArray(r.body.sessions)) {
    throw new Error(`admin_list_sessions failed: ${JSON.stringify(r.body)}`);
  }
  return r.body.sessions.find(s => s.device_id === deviceId) || null;
}

async function revokeSession(sessionId) {
  return rpc('admin_revoke_session', { p_admin_code: OWNER_KEY, p_session_id: sessionId });
}

async function deactivateKey(keyId) {
  return rpc('admin_set_key_active', { p_admin_code: OWNER_KEY, p_key_id: keyId, p_active: false });
}

async function main() {
  console.log(`=== H17 live probe: fresh-key activation → device_sessions (owner ${OWNER_KEY.slice(0,4)}…) ===`);
  const now = Date.now();
  const keys = [];
  try {
    for (let i = 1; i <= 2; i++) {
      const label = `H17-Probe-Key-${now}-${i}`;
      const deviceId = `h17-probe-device-${now}-${i}`;
      const deviceName = `H17 Probe Device ${i}`;

      console.log(`\n--- fresh student key #${i} (${label}) ---`);
      let minted;
      try {
        minted = await mintStudentKey(label);
        keys.push({ id: minted.id, code: minted.code, deviceId });
        log(true, `minted fresh key`, `id=${minted.id.slice(0,8)}… code=${minted.code.slice(0,4)}…`);
      } catch (e) {
        log(false, `mint fresh key #${i}`, e.message);
        continue;
      }

      const act = await activate(minted.code, deviceId, deviceName);
      const actOk = act.body?.ok === true;
      const role = act.body?.role || '?';
      const acct = act.body?.account_id || '?';
      log(actOk, `activated fresh key`, actOk
        ? `role=${role} account=${acct.slice(0,8)}…`
        : JSON.stringify(act.body));

      const session = await findSession(deviceId);
      if (!actOk) {
        log(false, `device_sessions row created for key #${i}`, 'activation itself failed — no row expected');
      } else if (session) {
        log(true, `device_sessions row created for key #${i}`, `id=${session.id.slice(0,8)}… device=${session.device_name}`);
      } else {
        log(false, `device_sessions row created for key #${i}`, 'activation ok:true but NO session row in admin_list_sessions');
      }

      // Clean up the session if it appeared
      if (session) await revokeSession(session.id);
    }
  } finally {
    // Always try to deactivate the temp keys
    for (const k of keys) {
      await deactivateKey(k.id).catch(() => {});
    }
    console.log(`\n  cleanup: ${keys.length} temp student key(s) deactivated; probe sessions revoked`);
  }

  console.log(`\n=== H17 RESULT: ${fail === 0 ? 'PASS — fresh-key activation creates device_sessions rows (both keys)' : `${fail} FAILURE(S) — H17 reproduction`} (${pass} ok / ${fail} fail) ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error('\n=== H17 PROBE ERROR ==='); console.error(err); process.exit(1); });
