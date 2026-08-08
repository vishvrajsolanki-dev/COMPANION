#!/usr/bin/env node
/**
 * scrape-adit.mjs — ADIT website scraper for reference data
 *
 * Fetches faculty and curriculum data from adit.ac.in and writes JSON output
 * to scripts/out/adit-reference-<date>.json.
 *
 * Usage:
 *   node scripts/scrape-adit.mjs              # scrape + write JSON
 *   node scripts/scrape-adit.mjs --publish    # scrape + write JSON + push to Supabase
 *   node scripts/scrape-adit.mjs --dry-run    # scrape + preview without writing
 *
 * The --publish flag calls admin_upsert_reference_data RPC. Requires:
 *   SUPABASE_URL and SUPABASE_ANON_KEY in .env.local (or environment).
 *   VERIFY_OWNER_KEY in .env.local (the owner access code for admin auth).
 *
 * Reference data changes infrequently (once per semester). Run this script
 * when the college publishes new curriculum or faculty changes.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'out');

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = 'https://adit.ac.in';

/** Departments with their URL parameters. */
const DEPARTMENTS = [
  { dept: 'cp',                      program: 'cp',  name: 'Computer Engineering',       level: 'UG' },
  { dept: 'informationtechnology',   program: 'it',  name: 'Information Technology',     level: 'UG' },
  { dept: 'informationtechnology',   program: 'aids', name: 'AI & Data Science',         level: 'UG' },
  { dept: 'mechanicalengineering',   program: 'me',  name: 'Mechanical Engineering',     level: 'UG' },
  { dept: 'ec',                      program: 'ec',  name: 'Electronics & Communication', level: 'UG' },
  { dept: 'electricalengineering',   program: 'ee',  name: 'Electrical Engineering',     level: 'UG' },
  { dept: 'civilengineering',        program: 'civil', name: 'Civil Engineering',         level: 'UG' },
  { dept: 'automobileengineering',   program: 'auto', name: 'Automobile Engineering',     level: 'UG' },
  { dept: 'dairytechnology',         program: 'dairy', name: 'Dairy Technology',          level: 'UG' },
  { dept: 'fpt',                     program: 'fpt', name: 'Food Processing Technology',  level: 'UG' },
];

const FETCH_DELAY_MS = 500; // polite crawl delay

// ── Environment ──────────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    if (!(key in process.env)) process.env[key] = trimmed.slice(idx + 1);
  }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AcademicOS-Scraper/1.0 (internal reference data)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  ⚠ Fetch failed for ${url}: ${err.message}`);
    return null;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── HTML parsing (regex-based — the site generates clean PHP table HTML) ─────

/**
 * Extract rows from HTML tables on the page. Returns arrays of cell text
 * values, one per row. Skips header rows (detected by th-only content).
 */
function parseTables(html) {
  const tables = [];
  // Match each <table>...</table> block
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1];
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let isHeader = false;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      // Check if this is a header row (contains th tags)
      const hasTh = /<th[\s>]/i.test(rowHtml);
      if (hasTh) { isHeader = true; continue; } // skip header rows
      // Also skip the first non-th row after a header (it might be a sub-header)
      isHeader = false;

      const cells = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        // Strip HTML tags and decode entities
        const text = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .replace(/&#\d+;/g, '')
          .trim();
        cells.push(text);
      }
      if (cells.length >= 2) rows.push(cells); // need at least 2 cells
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

// ── Faculty scraping ─────────────────────────────────────────────────────────

function parseFacultyFromHTML(html, department) {
  const faculty = [];
  const tables = parseTables(html);

  for (const rows of tables) {
    for (const cells of rows) {
      // Faculty table typically has: Name | Designation | Qualifications | Experience | Email | Phone
      // The exact column count varies. We look for name + email patterns.
      const name = cells[0]?.trim();
      if (!name || name.length < 3 || /^(Name|Faculty|#|Sr)/i.test(name)) continue;

      const designation = cells[1]?.trim() || null;
      const qualifications = cells[2]?.trim() || null;
      // Email is usually in one of the later cells
      let email = null;
      for (let i = 3; i < cells.length; i++) {
        const cell = cells[i].trim();
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cell)) {
          email = cell;
          break;
        }
      }

      faculty.push({
        name,
        designation,
        department,
        email,
      });
    }
  }
  return faculty;
}

async function scrapeFaculty(deptInfo) {
  const url = `${BASE_URL}/departments/department.php?dept=${deptInfo.dept}&page=faculty`;
  console.log(`  📋 Faculty: ${deptInfo.name} → ${url}`);
  const html = await fetchPage(url);
  if (!html) return [];

  const faculty = parseFacultyFromHTML(html, deptInfo.name);
  console.log(`     Found ${faculty.length} faculty member(s)`);
  return faculty;
}

// ── Curriculum scraping ──────────────────────────────────────────────────────

function parseCurriculumFromHTML(html, department) {
  const subjects = [];
  const tables = parseTables(html);

  // Curriculum tables typically have: Code | Title | L-T-P | Credits | Max/Passing | Syllabus
  // Or: Course Group | Code | Title | L-T-P | Credits | Max/Passing | Syllabus
  // The structure varies by page. We look for tables with course-code patterns.

  for (const rows of tables) {
    for (const cells of rows) {
      // Find the cell that looks like a course code (digits, 6-10 chars)
      let codeIdx = -1;
      for (let i = 0; i < cells.length; i++) {
        if (/^\d{6,10}$/.test(cells[i].trim())) {
          codeIdx = i;
          break;
        }
      }
      if (codeIdx === -1) continue;

      const courseCode = cells[codeIdx].trim();
      const title = cells[codeIdx + 1]?.trim();
      if (!title || /^(Title|Course|Subject)/i.test(title)) continue;

      // L-T-P pattern
      const ltpCell = cells[codeIdx + 2]?.trim() || '';
      const ltpMatch = ltpCell.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
      const ltp = ltpMatch ? `${ltpMatch[1]}-${ltpMatch[2]}-${ltpMatch[3]}` : ltpCell || null;

      // Credits
      const creditsStr = cells[codeIdx + 3]?.trim() || '3';
      const credits = parseInt(creditsStr, 10) || 3;

      subjects.push({
        course_code: courseCode,
        name: title,
        department,
        semester: null, // filled in by the caller based on page context
        credits,
        ltp,
      });
    }
  }
  return subjects;
}

async function scrapeCurriculum(deptInfo) {
  const subjects = [];
  const url = `${BASE_URL}/departments/department.php?dept=${deptInfo.dept}&page=curriculum&level=${deptInfo.level}&program=${deptInfo.program}`;
  console.log(`  📚 Curriculum: ${deptInfo.name} → ${url}`);
  const html = await fetchPage(url);
  if (!html) return [];

  // The page has semester tabs. We parse all tables on the page, but we need
  // to figure out which semester each table belongs to. The page structure
  // typically renders semesters as separate table blocks with headers.
  //
  // Strategy: look for semester headings in the HTML, then parse tables in order.
  // The heading pattern is typically "Semester N" or "Semester N — Total: ... hrs, ... credits".
  const semesterPattern = /Semester\s+(\d+)/gi;
  const semHeadings = [];
  let m;
  while ((m = semesterPattern.exec(html)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 8) {
      semHeadings.push({ semester: num, pos: m.index });
    }
  }

  if (semHeadings.length === 0) {
    // Fallback: parse all tables without semester info
    const parsed = parseCurriculumFromHTML(html, deptInfo.name);
    for (const s of parsed) {
      s.semester = 1; // best guess
      subjects.push(s);
    }
    console.log(`     Found ${parsed.length} subject(s) (semester unknown)`);
    return subjects;
  }

  // For each semester heading, extract the HTML chunk until the next heading,
  // then parse tables from that chunk.
  for (let i = 0; i < semHeadings.length; i++) {
    const start = semHeadings[i].pos;
    const end = i + 1 < semHeadings.length ? semHeadings[i + 1].pos : html.length;
    const chunk = html.slice(start, end);

    const parsed = parseCurriculumFromHTML(chunk, deptInfo.name);
    for (const s of parsed) {
      s.semester = semHeadings[i].semester;
      subjects.push(s);
    }
    console.log(`     Semester ${semHeadings[i].semester}: ${parsed.length} subject(s)`);
  }

  return subjects;
}

// ── Supabase publish ─────────────────────────────────────────────────────────

async function publishToSupabase(faculty, subjects) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const ownerKey = process.env.VERIFY_OWNER_KEY;

  if (!url || !anonKey || !ownerKey) {
    console.error('\n❌ Missing SUPABASE_URL, SUPABASE_ANON_KEY, or VERIFY_OWNER_KEY in .env.local');
    console.error('   Set these to use --publish mode.');
    process.exit(1);
  }

  console.log('\n📡 Publishing to Supabase...');

  const rpcUrl = `${url}/rest/v1/rpc/admin_upsert_reference_data`;
  const payload = {
    p_admin_code: ownerKey,
    p_faculty: faculty,
    p_subjects: subjects,
  };

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json();
    if (data?.ok) {
      console.log(`   ✅ Published: ${data.faculty_inserted} faculty inserted, ${data.faculty_updated} updated`);
      console.log(`               ${data.subjects_inserted} subjects inserted, ${data.subjects_updated} updated`);
    } else {
      console.error('   ❌ RPC error:', data);
      process.exit(1);
    }
  } catch (err) {
    console.error(`   ❌ Network error: ${err.message}`);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const publish = args.includes('--publish');
  const dryRun = args.includes('--dry-run');

  console.log('🏫 ADIT Website Scraper — Reference Data');
  console.log(`   Mode: ${dryRun ? 'dry-run' : publish ? 'scrape + publish' : 'scrape only'}\n`);

  const allFaculty = [];
  const allSubjects = [];

  // Deduplicate departments (some share dept param with different programs)
  const seenFaculty = new Set();
  const seenSubjects = new Set();

  for (const dept of DEPARTMENTS) {
    console.log(`\n── ${dept.name} (${dept.dept}/${dept.program}) ──`);

    // Scrape faculty (once per unique dept param)
    const facultyKey = dept.dept;
    if (!seenFaculty.has(facultyKey)) {
      seenFaculty.add(facultyKey);
      const faculty = await scrapeFaculty(dept);
      allFaculty.push(...faculty);
      await sleep(FETCH_DELAY_MS);
    }

    // Scrape curriculum (once per program)
    const currKey = `${dept.dept}/${dept.program}`;
    if (!seenSubjects.has(currKey)) {
      seenSubjects.add(currKey);
      const subjects = await scrapeCurriculum(dept);
      allSubjects.push(...subjects);
      await sleep(FETCH_DELAY_MS);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log(`📊 Summary:`);
  console.log(`   Faculty:   ${allFaculty.length} member(s) across ${seenFaculty.size} department(s)`);
  console.log(`   Subjects:  ${allSubjects.length} course(s) across ${seenSubjects.size} program(s)`);

  // Show department breakdown
  const deptCounts = {};
  for (const f of allFaculty) {
    deptCounts[f.department] = (deptCounts[f.department] || 0) + 1;
  }
  for (const [dept, count] of Object.entries(deptCounts)) {
    console.log(`     ${dept}: ${count} faculty`);
  }

  const subDeptSem = {};
  for (const s of allSubjects) {
    const key = `${s.department} Sem ${s.semester}`;
    subDeptSem[key] = (subDeptSem[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(subDeptSem)) {
    console.log(`     ${key}: ${count} subjects`);
  }

  // ── Write output ────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const output = {
    source: 'https://adit.ac.in',
    scraped_at: new Date().toISOString(),
    faculty: allFaculty,
    subjects: allSubjects,
  };

  if (!dryRun) {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    const outPath = join(OUT_DIR, `adit-reference-${today}.json`);
    writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\n💾 Written to: ${outPath}`);
  } else {
    console.log(`\n🔍 Dry run — no files written`);
    console.log(`   First faculty: ${allFaculty[0]?.name || 'none'}`);
    console.log(`   First subject: ${allSubjects[0]?.name || 'none'}`);
  }

  // ── Publish ─────────────────────────────────────────────────────────────
  if (publish) {
    loadEnvLocal();
    await publishToSupabase(allFaculty, allSubjects);
  }

  console.log('\n✅ Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
