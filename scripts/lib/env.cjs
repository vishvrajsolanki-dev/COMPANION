'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Loads .env.local (gitignored) into process.env. Idempotent — an existing
 * process.env value wins, so a shell `VERIFY_OWNER_KEY=...` override takes
 * precedence over the value in .env.local.
 */
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    if (!(key in process.env)) process.env[key] = trimmed.slice(idx + 1);
  }
}

/**
 * Returns the current owner key credential for live verification scripts,
 * normalized to upper-case grouped format. Prefers process.env, then
 * .env.local. Throws with a clear message if absent — so a script can never
 * silently fall back to a committed secret.
 */
function requireOwnerKey() {
  loadEnvLocal();
  const key = (process.env.VERIFY_OWNER_KEY || '').trim().toUpperCase();
  if (!key) {
    throw new Error(
      'VERIFY_OWNER_KEY is not set. Add it to .env.local (gitignored), e.g.\n' +
      '  VERIFY_OWNER_KEY=XXXX-XXXX-XXXX-XXXX'
    );
  }
  return key;
}

module.exports = { loadEnvLocal, requireOwnerKey };
