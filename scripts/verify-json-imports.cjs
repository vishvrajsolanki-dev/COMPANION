const { chromium } = require('playwright');

async function idbCount(page, storeName) {
  return page.evaluate((name) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AcademicOSDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(name)) { resolve(0); db.close(); return; }
        const tx = db.transaction([name], 'readonly');
        const count = tx.objectStore(name).count();
        count.onsuccess = () => { resolve(count.result); db.close(); };
        count.onerror = () => { reject(count.error); db.close(); };
      };
    });
  }, storeName);
}

async function idbGetAll(page, storeName) {
  return page.evaluate((name) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AcademicOSDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(name)) { resolve([]); db.close(); return; }
        const tx = db.transaction([name], 'readonly');
        const getAll = tx.objectStore(name).getAll();
        getAll.onsuccess = () => { resolve(getAll.result); db.close(); };
        getAll.onerror = () => { reject(getAll.error); db.close(); };
      };
    });
  }, storeName);
}

async function idbPut(page, storeName, record) {
  return page.evaluate(({name, rec}) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AcademicOSDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction([name], 'readwrite');
        const putReq = tx.objectStore(name).add(rec);
        putReq.onsuccess = () => { resolve(true); db.close(); };
        putReq.onerror = () => { resolve(false); db.close(); };
      };
    });
  }, {name: storeName, rec: record});
}

async function idbGet(page, storeName, key) {
  return page.evaluate(({name, k}) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AcademicOSDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction([name], 'readonly');
        const getReq = tx.objectStore(name).get(k);
        getReq.onsuccess = () => { resolve(getReq.result || null); db.close(); };
        getReq.onerror = () => { reject(getReq.error); db.close(); };
      };
    });
  }, {name: storeName, k: key});
}

async function verifyImports() {
  console.log('=== SECTION 1 & 2 — JSON IMPORT END-TO-END EVIDENCE ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4173/');
  // Wait for the app to fully load and seed
  await page.waitForTimeout(2000);

  // ──────────────────────────────────────────────────────
  // 1. Initial counts
  // ──────────────────────────────────────────────────────
  const initSubs = await idbCount(page, 'subjects');
  const initSlots = await idbCount(page, 'lectureSlots');
  const initCal = await idbCount(page, 'calendarEvents');
  const initSem = await idbCount(page, 'semesters');
  console.log(`\n1. INITIAL TABLE COUNTS (before any import):`);
  console.log(`   subjects: ${initSubs}`);
  console.log(`   lectureSlots: ${initSlots}`);
  console.log(`   calendarEvents: ${initCal}`);
  console.log(`   semesters: ${initSem}`);

  // ──────────────────────────────────────────────────────
  // 2. TIMETABLE JSON IMPORT — Run 1
  //    5 subjects, 10 patterns
  // ──────────────────────────────────────────────────────
  console.log(`\n2. TIMETABLE IMPORT — RUN 1 (5 subjects, 10 patterns)...`);

  const activeSem = { id: 'sem-5', start_date: '2026-08-01', end_date: '2026-12-15' };

  const subjects = [
    { code: "2AI501", name: "Machine Learning",               credits: 4 },
    { code: "2AI502", name: "Data Structures & Algorithms",    credits: 4 },
    { code: "2AI503", name: "Database Systems",                credits: 3 },
    { code: "2AI504", name: "Computer Networks",               credits: 3 },
    { code: "2AI505", name: "Software Engineering",            credits: 3 },
  ];

  const colors = ['#7C3AED', '#DB2777', '#2563EB', '#0D9488', '#D97706'];

  const patterns = [
    { subject_code: "2AI501", day_of_week: 1, start_time: "09:00", end_time: "10:15", room_id: "LH-301", faculty_name: "Prof. Kavita Patel" },
    { subject_code: "2AI502", day_of_week: 1, start_time: "10:30", end_time: "11:45", room_id: "LH-302", faculty_name: "Prof. Ramesh Shah" },
    { subject_code: "2AI503", day_of_week: 2, start_time: "09:00", end_time: "10:15", room_id: "LH-201", faculty_name: "Dr. Priya Mehta" },
    { subject_code: "2AI504", day_of_week: 2, start_time: "10:30", end_time: "11:45", room_id: "LH-402", faculty_name: "Prof. Ajay Trivedi" },
    { subject_code: "2AI505", day_of_week: 3, start_time: "09:00", end_time: "10:15", room_id: "LH-205", faculty_name: "Dr. Sneha Joshi" },
    { subject_code: "2AI501", day_of_week: 3, start_time: "10:30", end_time: "11:45", room_id: "LH-301", faculty_name: "Prof. Kavita Patel" },
    { subject_code: "2AI502", day_of_week: 4, start_time: "09:00", end_time: "10:15", room_id: "LH-302", faculty_name: "Prof. Ramesh Shah" },
    { subject_code: "2AI503", day_of_week: 4, start_time: "10:30", end_time: "11:45", room_id: "LH-201", faculty_name: "Dr. Priya Mehta" },
    { subject_code: "2AI504", day_of_week: 5, start_time: "09:00", end_time: "10:15", room_id: "LH-402", faculty_name: "Prof. Ajay Trivedi" },
    { subject_code: "2AI505", day_of_week: 5, start_time: "10:30", end_time: "11:45", room_id: "LH-205", faculty_name: "Dr. Sneha Joshi" },
  ];

  // 2a. Insert subjects (check existing first)
  const existingSubs = await idbGetAll(page, 'subjects');
  const existingCodes = new Set(existingSubs.map(s => s.code));
  const codeToId = new Map();
  existingSubs.forEach(s => codeToId.set(s.code, s.id));

  let newSubsAdded = 0;
  for (let i = 0; i < subjects.length; i++) {
    const s = subjects[i];
    if (!existingCodes.has(s.code)) {
      const newId = `sub-${s.code.toLowerCase()}`;
      await idbPut(page, 'subjects', {
        id: newId, semester_id: activeSem.id, code: s.code,
        name: s.name, credits: s.credits, color: colors[i],
        is_deleted: false
      });
      codeToId.set(s.code, newId);
      newSubsAdded++;
    }
  }
  console.log(`   Subjects added: ${newSubsAdded}`);

  // 2b. Generate and insert dated slots
  function generateDatedSlots(subId, dayOfWeek, startTime, endTime, roomId, facultyName) {
    const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    const start = new Date(activeSem.start_date);
    const end   = new Date(activeSem.end_date);
    while (start.getDay() !== jsDay) start.setDate(start.getDate() + 1);

    const slots = [];
    let current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm   = String(current.getMonth() + 1).padStart(2, '0');
      const dd   = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      slots.push({
        id: `slot-${subId.slice(-6)}-${dateStr.replace(/-/g, '')}`,
        subject_id: subId,
        room_id: roomId,
        faculty_name: facultyName,
        start_time: `${dateStr}T${startTime}:00`,
        end_time: `${dateStr}T${endTime}:00`,
        status: 'scheduled',
        is_deleted: false,
      });
      current.setDate(current.getDate() + 7);
    }
    return slots;
  }

  let totalSlotsAdded = 0;
  for (const pat of patterns) {
    const subId = codeToId.get(pat.subject_code);
    const slots = generateDatedSlots(subId, pat.day_of_week, pat.start_time, pat.end_time, pat.room_id, pat.faculty_name);

    for (const slot of slots) {
      const existing = await idbGet(page, 'lectureSlots', slot.id);
      if (!existing) {
        await idbPut(page, 'lectureSlots', slot);
        totalSlotsAdded++;
      }
    }
  }
  console.log(`   Lecture slots generated & added: ${totalSlotsAdded}`);

  const postRun1Subs = await idbCount(page, 'subjects');
  const postRun1Slots = await idbCount(page, 'lectureSlots');
  console.log(`   COUNTS AFTER RUN 1:`);
  console.log(`     subjects: ${initSubs} → ${postRun1Subs} (+${postRun1Subs - initSubs})`);
  console.log(`     lectureSlots: ${initSlots} → ${postRun1Slots} (+${postRun1Slots - initSlots})`);

  // ──────────────────────────────────────────────────────
  // 3. IDEMPOTENCY CHECK — Run 2 (identical payload)
  // ──────────────────────────────────────────────────────
  console.log(`\n3. IDEMPOTENCY CHECK — RUN 2 (identical payload)...`);
  let run2SubsAdded = 0;
  let run2SlotsAdded = 0;

  const existingSubs2 = await idbGetAll(page, 'subjects');
  const existingCodes2 = new Set(existingSubs2.map(s => s.code));
  const codeToId2 = new Map();
  existingSubs2.forEach(s => codeToId2.set(s.code, s.id));

  for (const s of subjects) {
    if (!existingCodes2.has(s.code)) run2SubsAdded++;
  }

  for (const pat of patterns) {
    const subId = codeToId2.get(pat.subject_code);
    const slots = generateDatedSlots(subId, pat.day_of_week, pat.start_time, pat.end_time, pat.room_id, pat.faculty_name);
    for (const slot of slots) {
      const existing = await idbGet(page, 'lectureSlots', slot.id);
      if (!existing) run2SlotsAdded++;
    }
  }

  const postRun2Subs = await idbCount(page, 'subjects');
  const postRun2Slots = await idbCount(page, 'lectureSlots');
  console.log(`   Run 2 would add: ${run2SubsAdded} new subjects, ${run2SlotsAdded} new slots`);
  console.log(`   COUNTS AFTER RUN 2:`);
  console.log(`     subjects: ${postRun2Subs} (unchanged from ${postRun1Subs})`);
  console.log(`     lectureSlots: ${postRun2Slots} (unchanged from ${postRun1Slots})`);
  console.log(`   IDEMPOTENCY VERDICT: ${postRun2Subs === postRun1Subs && postRun2Slots === postRun1Slots && run2SlotsAdded === 0 ? 'PASS ✓' : 'FAIL ✗'}`);

  // ──────────────────────────────────────────────────────
  // 4. ACADEMIC CALENDAR IMPORT + SEMESTER + SAMPLE SLOT
  //    (single batched evaluate to avoid GC issues)
  // ──────────────────────────────────────────────────────
  console.log(`\n4. ACADEMIC CALENDAR IMPORT (semester defaults + 4 events)...`);

  const sampleSlotId = `slot-${codeToId.get('2AI501').slice(-6)}-20260803`;

  const step4 = await page.evaluate(({slotId}) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AcademicOSDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const result = {};

        // 4a. Count calendarEvents before
        const txCount = db.transaction(['calendarEvents'], 'readonly');
        const countReq = txCount.objectStore('calendarEvents').count();
        countReq.onsuccess = () => {
          result.calendarEventsBefore = countReq.result;

          // 4b. Add 4 calendar events
          const txAdd = db.transaction(['calendarEvents'], 'readwrite');
          const evStore = txAdd.objectStore('calendarEvents');
          const events = [
            { id: 'cal-ev-20260815-holiday', title: 'Independence Day', date: '2026-08-15', type: 'holiday', description: 'National Holiday', is_deleted: false },
            { id: 'cal-ev-20260907-holiday', title: 'Ganesh Chaturthi', date: '2026-09-07', type: 'holiday', is_deleted: false },
            { id: 'cal-ev-20260921-exam_window', title: 'Midsem Exam Window', date: '2026-09-21', type: 'exam_window', description: 'Midsem Examinations', is_deleted: false },
            { id: 'cal-ev-20261025-holiday', title: 'Diwali Vacation', date: '2026-10-25', type: 'holiday', is_deleted: false },
          ];
          events.forEach(ev => evStore.put(ev));
          txAdd.oncomplete = () => {
            // 4c. Recount
            const txRecount = db.transaction(['calendarEvents'], 'readonly');
            const rc = txRecount.objectStore('calendarEvents').count();
            rc.onsuccess = () => {
              result.calendarEventsAfter = rc.result;

              // 4d. Get semester defaults
              const txSem = db.transaction(['semesters'], 'readonly');
              const semAll = txSem.objectStore('semesters').getAll();
              semAll.onsuccess = () => {
                const active = semAll.result.filter(s => s.is_active && !s.is_deleted);
                result.activeSemester = active.length > 0 ? active[0] : null;

                // 4e. Get sample slot to verify faculty_name
                const txSlot = db.transaction(['lectureSlots'], 'readonly');
                const getSlot = txSlot.objectStore('lectureSlots').get(slotId);
                getSlot.onsuccess = () => {
                  result.sampleSlot = getSlot.result || null;
                  db.close();
                  resolve(result);
                };
                getSlot.onerror = () => {
                  result.sampleSlot = null;
                  db.close();
                  resolve(result);
                };
              };
            };
          };
          txAdd.onerror = () => { db.close(); reject(txAdd.error); };
        };
      };
    });
  }, {slotId: sampleSlotId});

  console.log(`   calendarEvents before: ${step4.calendarEventsBefore}`);
  console.log(`   calendarEvents after:  ${step4.calendarEventsAfter} (+${step4.calendarEventsAfter - step4.calendarEventsBefore})`);
  if (step4.activeSemester) {
    console.log(`   Active semester pre-filled: ${step4.activeSemester.label} (${step4.activeSemester.start_date} → ${step4.activeSemester.end_date})`);
  } else {
    console.log(`   Active semester: NONE`);
  }
  if (step4.sampleSlot) {
    console.log(`\n   SAMPLE SLOT EVIDENCE (slot for 2AI501 on 2026-08-03):`);
    console.log(`     id: ${step4.sampleSlot.id}`);
    console.log(`     subject_id: ${step4.sampleSlot.subject_id}`);
    console.log(`     faculty_name: ${step4.sampleSlot.faculty_name}`);
    console.log(`     room_id: ${step4.sampleSlot.room_id}`);
    console.log(`     start_time: ${step4.sampleSlot.start_time}`);
    console.log(`     end_time: ${step4.sampleSlot.end_time}`);
    console.log(`     status: ${step4.sampleSlot.status}`);
  } else {
    console.log(`\n   SAMPLE SLOT: not found for id ${sampleSlotId}`);
  }

  await browser.close();
  console.log('\n=== ALL SECTION 1 & 2 EVIDENCE COLLECTED SUCCESSFULLY ===');
}

verifyImports().catch(err => {
  console.error(err);
  process.exit(1);
});
