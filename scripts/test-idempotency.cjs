const { chromium } = require('playwright');

async function testIdempotency() {
  console.log('=== TESTING TIMETABLE BUILDER IDEMPOTENCY ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4173/');

  // 1. Initial count of lectureSlots
  const countBefore = await page.evaluate(async () => {
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['lectureSlots'], 'readonly');
        const store = tx.objectStore('lectureSlots');
        const getAll = store.getAll();
        getAll.onsuccess = () => res(getAll.result.filter(s => !s.is_deleted).length);
      };
    });
  });
  console.log(`1. Initial slot count in IndexedDB: ${countBefore}`);

  // 2. First Run: Generate pattern for Monday 09:00-10:15
  const firstRunAdded = await page.evaluate(async () => {
    const activeSem = { start_date: '2026-08-01', end_date: '2026-12-15' };
    const subjectId = 'sub-1';
    const dayOfWeek = 1; // Mon
    const startTime = '09:00';
    const endTime = '10:15';

    // Generate slots
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
        id: `slot-${subjectId.slice(-6)}-${dateStr.replace(/-/g, '')}`,
        subject_id: subjectId,
        room_id: 'LH-301',
        start_time: `${dateStr}T${startTime}:00`,
        end_time:   `${dateStr}T${endTime}:00`,
        status: 'scheduled',
        is_deleted: false,
      });
      current.setDate(current.getDate() + 7);
    }

    // Insert with skip-guard
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['lectureSlots'], 'readwrite');
        const store = tx.objectStore('lectureSlots');
        let added = 0;
        let pending = slots.length;

        slots.forEach(slot => {
          const getReq = store.get(slot.id);
          getReq.onsuccess = () => {
            if (!getReq.result) {
              store.add(slot);
              added++;
            }
            pending--;
            if (pending === 0) res({ totalGenerated: slots.length, addedCount: added });
          };
        });
      };
    });
  });
  console.log(`2. First Run output: Generated ${firstRunAdded.totalGenerated} slots, Added ${firstRunAdded.addedCount} new slots to DB.`);

  const countAfterFirst = await page.evaluate(async () => {
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['lectureSlots'], 'readonly');
        const store = tx.objectStore('lectureSlots');
        const getAll = store.getAll();
        getAll.onsuccess = () => res(getAll.result.filter(s => !s.is_deleted).length);
      };
    });
  });
  console.log(`   Total slots in IndexedDB after First Run: ${countAfterFirst}`);

  // 3. Second Run: Run identical pattern generation again
  const secondRunAdded = await page.evaluate(async () => {
    const activeSem = { start_date: '2026-08-01', end_date: '2026-12-15' };
    const subjectId = 'sub-1';
    const dayOfWeek = 1; // Mon
    const startTime = '09:00';
    const endTime = '10:15';

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
        id: `slot-${subjectId.slice(-6)}-${dateStr.replace(/-/g, '')}`,
        subject_id: subjectId,
        room_id: 'LH-301',
        start_time: `${dateStr}T${startTime}:00`,
        end_time:   `${dateStr}T${endTime}:00`,
        status: 'scheduled',
        is_deleted: false,
      });
      current.setDate(current.getDate() + 7);
    }

    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['lectureSlots'], 'readwrite');
        const store = tx.objectStore('lectureSlots');
        let added = 0;
        let pending = slots.length;

        slots.forEach(slot => {
          const getReq = store.get(slot.id);
          getReq.onsuccess = () => {
            if (!getReq.result) {
              store.add(slot);
              added++;
            }
            pending--;
            if (pending === 0) res({ totalGenerated: slots.length, addedCount: added });
          };
        });
      };
    });
  });
  console.log(`3. Second Run output: Generated ${secondRunAdded.totalGenerated} slots, Added ${secondRunAdded.addedCount} new slots to DB.`);

  const countAfterSecond = await page.evaluate(async () => {
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['lectureSlots'], 'readonly');
        const store = tx.objectStore('lectureSlots');
        const getAll = store.getAll();
        getAll.onsuccess = () => res(getAll.result.filter(s => !s.is_deleted).length);
      };
    });
  });
  console.log(`   Total slots in IndexedDB after Second Run: ${countAfterSecond}`);

  await browser.close();
  console.log(`=== IDEMPOTENCY TEST VERDICT: ${countAfterFirst === countAfterSecond && secondRunAdded.addedCount === 0 ? 'PASS' : 'FAIL'} ===`);
}

testIdempotency().catch(err => {
  console.error(err);
  process.exit(1);
});
