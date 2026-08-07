#!/usr/bin/env node
/**
 * Phase B — mint an access key and print a ready-to-paste SQL INSERT for the
 * Supabase SQL Editor. Phase C replaces this CLI with the admin-portal UI.
 *
 * Usage:
 *   node scripts/generate-access-key.cjs --role owner --label "Vishvraj"
 *   node scripts/generate-access-key.cjs                # student key, no label
 */
'use strict';

const args = process.argv.slice(2);
let role = 'student';
let label = null;

// Accept both "--role owner" (space) and "--role=owner" (=) forms.
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--role' && args[i + 1])  { role = args[++i]; continue; }
  if (a === '--label' && args[i + 1]) { label = args[++i]; continue; }
  const rm = a.match(/^--role=(.+)$/);
  if (rm) { role = rm[1]; continue; }
  const lm = a.match(/^--label=(.+)$/);
  if (lm) { label = lm[1]; continue; }
}
if (!['owner', 'admin', 'student'].includes(role)) role = 'student';

// Ambiguity-free alphabet (no 0/O/1/I) so codes are easy to type by hand.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const group = () => {
  let s = '';
  for (let i = 0; i < 4; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
};

const code = `${group()}-${group()}-${group()}-${group()}`;

const cols = ['code', 'role', 'max_uses'];
const vals = [`'${code}'`, `'${role}'`, '1'];
if (label) {
  const safe = label.replace(/'/g, "''");
  cols.push('label');
  vals.push(`'${safe}'`);
}

console.log('────────────────────────────────────────────');
console.log(`  Access key:  ${code}`);
console.log(`  Role:        ${role}${label ? `  (${label})` : ''}`);
console.log('────────────────────────────────────────────\n');
console.log('Paste this into the Supabase SQL Editor and press Run:\n');
console.log(`insert into public.access_keys (${cols.join(', ')})\nvalues (${vals.join(', ')});\n`);
