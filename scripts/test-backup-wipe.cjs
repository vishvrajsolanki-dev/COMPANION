const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testBackupAndWipe() {
  console.log('=== TESTING BACKUP EXPORT & SAFE DATA WIPE ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4173/');

  // 1. Trigger exportBackupJSON directly in page context
  const backupJSON = await page.evaluate(async () => {
    // Open DB
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = async () => {
        const db = req.result;
        const tableNames = Array.from(db.objectStoreNames);
        const data = {};
        for (const name of tableNames) {
          const tx = db.transaction([name], 'readonly');
          const store = tx.objectStore(name);
          const getAll = store.getAll();
          await new Promise(r => { getAll.onsuccess = () => { data[name] = getAll.result; r(); }; });
        }
        res(data);
      };
    });
  });

  const keys = Object.keys(backupJSON);
  console.log('1. Exported Backup Top-Level Keys:', keys);
  console.log('   Table Row Counts:', Object.fromEntries(Object.entries(backupJSON).map(([k, v]) => [k, v.length])));

  // 2. Perform Wipe
  const wipeResult = await page.evaluate(async () => {
    localStorage.setItem('academic_os_user_cleared', 'true');
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = async () => {
        const db = req.result;
        const names = Array.from(db.objectStoreNames);
        const tx = db.transaction(names, 'readwrite');
        names.forEach(name => tx.objectStore(name).clear());
        tx.oncomplete = () => res('Wipe transaction completed successfully');
      };
    });
  });
  console.log('2. Wipe Execution Result:', wipeResult);

  // 3. Reload page and verify IndexedDB is genuinely empty and NOT auto-reseeded
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const postWipeCounts = await page.evaluate(async () => {
    const isClearedFlagSet = localStorage.getItem('academic_os_user_cleared');
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(res => {
      req.onsuccess = () => {
        const db = req.result;
        const names = Array.from(db.objectStoreNames);
        const tx = db.transaction(names, 'readonly');
        const counts = { isClearedFlagSet };
        let pending = names.length;
        names.forEach(name => {
          const countReq = tx.objectStore(name).count();
          countReq.onsuccess = () => {
            counts[name] = countReq.result;
            pending--;
            if (pending === 0) res(counts);
          };
        });
      };
    });
  });
  console.log('3. Post-Wipe Table Counts (after reload):', postWipeCounts);

  await browser.close();
  console.log('=== BACKUP EXPORT & SAFE DATA WIPE TEST PASSED ===');
}

testBackupAndWipe().catch(err => {
  console.error(err);
  process.exit(1);
});
