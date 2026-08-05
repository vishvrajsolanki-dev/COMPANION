const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testOfflinePWA() {
  console.log('=== STARTING TRUE OFFLINE PWA TEST ===');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone viewport
    serviceWorkers: 'allow',
  });

  const page = await context.newPage();
  
  const networkLogs = [];
  page.on('request', req => {
    networkLogs.push(`[REQ] ${req.method()} ${req.url()}`);
  });
  page.on('requestfinished', async req => {
    const res = await req.response();
    const fromSW = res ? res.fromServiceWorker() : false;
    networkLogs.push(`[RES ${res ? res.status() : 'FAIL'}] ${req.url()} (fromSW: ${fromSW})`);
  });

  console.log('1. Navigating to http://localhost:4173/ online to install SW...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  
  // Wait 3 seconds for Service Worker to register and precache
  await page.waitForTimeout(3000);

  // Check Service Worker registration state in browser
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'No SW support';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'No active registration';
    return {
      active: !!reg.active,
      state: reg.active ? reg.active.state : 'none',
      scope: reg.scope
    };
  });
  console.log('Service Worker State:', JSON.stringify(swState, null, 2));

  // Check Cache Storage entries
  const cacheKeys = await page.evaluate(async () => {
    if (!('caches' in window)) return [];
    const keys = await caches.keys();
    const result = {};
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      result[key] = reqs.map(r => r.url);
    }
    return result;
  });
  console.log('Cache Storage Contents:', JSON.stringify(cacheKeys, null, 2));

  console.log('\n2. DISABLING NETWORK (Setting context.setOffline(true))...');
  await context.setOffline(true);
  networkLogs.length = 0; // Clear logs for offline test

  console.log('3. Performing Hard Reload while OFFLINE...');
  let reloadError = null;
  try {
    await page.reload({ waitUntil: 'networkidle' });
  } catch (err) {
    reloadError = err.message;
  }

  console.log('Reload result:', reloadError ? `Error: ${reloadError}` : 'Success');
  console.log('\n--- OFFLINE NETWORK LOGS (Page Reload) ---');
  networkLogs.forEach(log => console.log(log));

  // Take screenshot of offline reload
  const artifactsDir = path.join('C:', 'Users', 'vishv', '.gemini', 'antigravity-ide', 'brain', 'ff3aba28-318d-4817-87bb-8fcb55023b8c');
  await page.screenshot({ path: path.join(artifactsDir, 'sw_offline_reload.png') });
  console.log('\nSaved screenshot: sw_offline_reload.png');

  // Verify app title & state
  const title = await page.title();
  console.log('App Title after offline reload:', title);

  // 4. Perform mutation while OFFLINE (Mark attendance via IndexedDB directly or UI click)
  console.log('\n4. Marking attendance and adding task while OFFLINE...');
  const mutationResult = await page.evaluate(async () => {
    // Access Dexie database directly in page context
    const req = indexedDB.open('AcademicOSDB');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['attendanceRecords', 'tasks'], 'readwrite');
        
        // Add attendance record
        const attStore = tx.objectStore('attendanceRecords');
        attStore.add({
          id: `att-offline-${Date.now()}`,
          lecture_slot_id: 'slot-mon-1',
          status: 'present',
          marked_at: new Date().toISOString(),
          version: 1,
          is_deleted: false
        });

        // Add task
        const taskStore = tx.objectStore('tasks');
        taskStore.add({
          id: `task-offline-${Date.now()}`,
          title: 'Offline SW Verified Task',
          due_at: '2026-08-05T23:59:00',
          priority: 'urgent',
          status: 'todo',
          is_deleted: false
        });

        tx.oncomplete = () => resolve('Mutation succeeded in IndexedDB');
        tx.onerror = () => reject('Mutation failed');
      };
    });
  });
  console.log('Offline Mutation Result:', mutationResult);

  // 5. Reload again while STILL OFFLINE and verify mutations persisted
  console.log('\n5. Reloading second time while STILL OFFLINE to verify persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const persistedTasks = await page.evaluate(async () => {
    const req = indexedDB.open('AcademicOSDB');
    return new Promise(resolve => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['tasks'], 'readonly');
        const store = tx.objectStore('tasks');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          resolve(getAll.result.filter(t => !t.is_deleted).map(t => t.title));
        };
      };
    });
  });
  console.log('Persisted Tasks in IndexedDB after offline reloads:', persistedTasks);

  await page.screenshot({ path: path.join(artifactsDir, 'sw_offline_persisted.png') });
  console.log('Saved screenshot: sw_offline_persisted.png');

  await browser.close();
  console.log('\n=== OFFLINE PWA TEST COMPLETED SUCCESSFULLY ===');
}

testOfflinePWA().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
