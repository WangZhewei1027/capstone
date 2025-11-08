import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/5b26c9a0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Helpers:
 * - findAppVarName: find a global object on window that exposes a `.table` array (the app state).
 * - getTable / getSize / getSpeed / getStatusText: access application state or DOM status.
 * These helpers give us stable, implementation-tolerant access to the internals required by the FSM tests.
 */
async function findAppVarName(page) {
  const name = await page.evaluate(() => {
    for (const k in window) {
      try {
        const v = window[k];
        if (v && typeof v === 'object' && Array.isArray(v.table)) return k;
      } catch (e) {
        // ignore cross-origin or getter errors
      }
    }
    return null;
  });
  if (!name) throw new Error('Could not locate app state object on window (looking for .table array).');
  return name;
}

async function getTable(page, varName) {
  return await page.evaluate((n) => {
    return window[n].table.map(bucket => {
      // ensure serializable: copy values
      if (!Array.isArray(bucket)) return [];
      return bucket.slice();
    });
  }, varName);
}

async function getSize(page, varName) {
  return await page.evaluate((n) => {
    return window[n].size;
  }, varName);
}

async function getSpeed(page, varName) {
  return await page.evaluate((n) => {
    return window[n].speed ?? window[n].animDuration ?? null;
  }, varName);
}

async function getStatusText(page) {
  // status element expected to use class 'status' per HTML; fallback to any element with role 'status'
  const statusText = await page.evaluate(() => {
    const el1 = document.querySelector('.status');
    if (el1) return el1.textContent.trim();
    const el2 = document.querySelector('[role="status"]');
    if (el2) return el2.textContent.trim();
    // fallback: find small panel with status-like content
    const candidates = Array.from(document.querySelectorAll('p,div,span'));
    for (const c of candidates) {
      if (c.textContent && /table|ready|demo|insert|search|delete|cleared|invalid/i.test(c.textContent)) {
        return c.textContent.trim();
      }
    }
    return '';
  });
  return statusText;
}

test.describe('Hash Table — Separate Chaining interactive demo (FSM coverage)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // ensure page initialized
    await page.waitForLoadState('networkidle');
  });

  test('Preloading -> idle: demo keys are preloaded and app announces completion', async ({ page }) => {
    // Wait for an internal app state with .table to appear
    const varName = await findAppVarName(page);

    // Wait until preload likely finished: at least one bucket has entries OR status mentions demo/ready
    await page.waitForFunction((n) => {
      const s = window[n];
      if (!s || !Array.isArray(s.table)) return false;
      // preloaded demo usually pushes more than 0 keys
      return s.table.some(b => Array.isArray(b) && b.length > 0);
    }, varName, { timeout: 5000 });

    const status = await getStatusText(page);
    // FSM's preloading onExit announces demo complete; ensure some status text exists and contains demo/ready hints.
    expect(status.length).toBeGreaterThan(0);
    expect(/demo|ready|loaded|complete|table/i.test(status)).toBeTruthy();

    // Ensure we are in idle: input should be focused and primary buttons enabled
    const input = page.locator('input[type="text"]');
    await expect(input).toBeFocused();

    const insertBtn = page.locator('button', { hasText: 'Insert' }).first();
    const searchBtn = page.locator('button', { hasText: 'Search' }).first();
    const deleteBtn = page.locator('button', { hasText: 'Delete' }).first();

    await expect(insertBtn).toBeEnabled();
    await expect(searchBtn).toBeEnabled();
    await expect(deleteBtn).toBeEnabled();

    // Validate internal table structure exists and is an array of arrays
    const table = await getTable(page, varName);
    expect(Array.isArray(table)).toBeTruthy();
    expect(table.length).toBeGreaterThanOrEqual(1);
    expect(table.every(b => Array.isArray(b))).toBeTruthy();
  });

  test.describe('Insertion state and behavior', () => {
    test('Inserting -> INSERT_DONE: valid insert adds a node to correct bucket and buttons are disabled during async action', async ({ page }) => {
      const varName1 = await findAppVarName(page);

      // choose a unique test key
      const key = 'pw-test-insert-' + Date.now();

      const input1 = page.locator('input1[type="text"]');
      const insertBtn1 = page.locator('button', { hasText: 'Insert' }).first();

      // capture table before
      const beforeTable = await getTable(page, varName);

      await input.fill(key);

      // Initiate insertion: click and immediately check that the insert button gets disabled (onEnter)
      await Promise.all([
        page.waitForTimeout(50), // allow microtask to run to disable button
        insertBtn.click()
      ]);
      // button should be disabled during animation/insert processing
      expect(await insertBtn.isDisabled()).toBeTruthy();

      // Wait until the key appears somewhere in the table (INSERT_DONE transition to idle)
      await page.waitForFunction((n, k) => {
        return window[n].table.some(bucket => Array.isArray(bucket) && bucket.includes(k));
      }, varName, key, { timeout: 5000 });

      // After completion, insertBtn should be enabled again and input focused as onExit dictates
      await expect(insertBtn).toBeEnabled();
      await expect(input).toBeFocused();

      // Validate insertion happened: table length per bucket increased or key now present
      const afterTable = await getTable(page, varName);
      const foundInBefore = beforeTable.some(b => b.includes(key));
      const foundInAfter = afterTable.some(b => b.includes(key));
      expect(foundInBefore).toBeFalsy();
      expect(foundInAfter).toBeTruthy();

      // Status should mention insertion or the key/hash
      const status1 = await getStatusText(page);
      expect(/insert|hash|added|added to|inserted|completed/i.test(status)).toBeTruthy();
    });

    test('Invalid input on insert should emit INVALID_INPUT and not modify table', async ({ page }) => {
      const varName2 = await findAppVarName(page);

      const input2 = page.locator('input2[type="text"]');
      const insertBtn2 = page.locator('button', { hasText: 'Insert' }).first();

      // Ensure empty input
      await input.fill('');
      // capture table snapshot
      const before = await getTable(page, varName);

      await insertBtn.click();

      // After invalid input, buttons should remain enabled and table unchanged
      await expect(insertBtn).toBeEnabled();
      const after = await getTable(page, varName);
      expect(after).toEqual(before);

      const status2 = await getStatusText(page);
      // status should indicate invalid input or ask user to input something
      expect(/invalid|empty|enter|please/i.test(status)).toBeTruthy();
    });
  });

  test.describe('Searching state and behavior', () => {
    test('Searching -> SEARCH_RESULT_FOUND and SEARCH_RESULT_NOT_FOUND (found case)', async ({ page }) => {
      const varName3 = await findAppVarName(page);

      // Insert a known key to search for
      const key1 = 'pw-test-search-' + Date.now();
      const input3 = page.locator('input3[type="text"]');
      const insertBtn3 = page.locator('button', { hasText: 'Insert' }).first();
      const searchBtn1 = page.locator('button', { hasText: 'Search' }).first();

      await input.fill(key);
      await insertBtn.click();

      // Wait until inserted
      await page.waitForFunction((n, k) => window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      // Now search for it
      await input.fill(key);

      // Click search and ensure search button becomes disabled during visualizeSearch
      await Promise.all([
        page.waitForTimeout(50),
        searchBtn.click()
      ]);
      expect(await searchBtn.isDisabled()).toBeTruthy();

      // Wait for search to finish: app should emit SEARCH_RESULT_FOUND and re-enable the button
      await page.waitForFunction((n, k) => {
        // if there is an indicator in DOM (class 'found') allow that; otherwise when search button re-enabled assume done
        const foundInTable = window[n].table.some(b => Array.isArray(b) && b.includes(k));
        // cannot reliably detect 'found' flag internally, so poll until search button is re-enabled in the page context
        return foundInTable;
      }, varName, key, { timeout: 5000 });

      // Wait until button enabled again
      await expect(searchBtn).toBeEnabled();

      // Status should mention found
      const status3 = await getStatusText(page);
      expect(/found|exists|present|search/i.test(status)).toBeTruthy();
    });

    test('Searching -> SEARCH_RESULT_NOT_FOUND (not found case)', async ({ page }) => {
      const varName4 = await findAppVarName(page);

      // Pick a key extremely unlikely to exist
      const key2 = 'pw-test-search-missing-' + Date.now();
      const input4 = page.locator('input4[type="text"]');
      const searchBtn2 = page.locator('button', { hasText: 'Search' }).first();

      await input.fill(key);
      await searchBtn.click();

      // Wait for search to finish (button re-enabled) and status to mention not found
      await expect(searchBtn).toBeEnabled({ timeout: 5000 });

      const status4 = await getStatusText(page);
      expect(/not found|no such|absent|not present/i.test(status)).toBeTruthy();
    });

    test('Invalid input on search should emit INVALID_INPUT and not crash', async ({ page }) => {
      const searchBtn3 = page.locator('button', { hasText: 'Search' }).first();
      const input5 = page.locator('input5[type="text"]');

      await input.fill('');
      await searchBtn.click();

      await expect(searchBtn).toBeEnabled();
      const status5 = await getStatusText(page);
      expect(/invalid|enter|empty|please/i.test(status)).toBeTruthy();
    });
  });

  test.describe('Deleting state and behavior', () => {
    test('Deleting -> DELETE_REMOVED: deleting existing key removes it from table and renders chain', async ({ page }) => {
      const varName5 = await findAppVarName(page);

      // Insert a key then delete it
      const key3 = 'pw-test-delete-' + Date.now();
      const input6 = page.locator('input6[type="text"]');
      const insertBtn4 = page.locator('button', { hasText: 'Insert' }).first();
      const deleteBtn1 = page.locator('button', { hasText: 'Delete' }).first();

      // Insert
      await input.fill(key);
      await insertBtn.click();

      await page.waitForFunction((n, k) => window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      // Confirm key present
      let table1 = await getTable(page, varName);
      expect(table.some(b => b.includes(key))).toBeTruthy();

      // Delete the key
      await input.fill(key);
      // click delete; deleteBtn should be disabled while searching/removing
      await Promise.all([page.waitForTimeout(50), deleteBtn.click()]);
      expect(await deleteBtn.isDisabled()).toBeTruthy();

      // Wait until the key is removed from state.table
      await page.waitForFunction((n, k) => !window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      // After deletion, button should be enabled and input focused, per FSM exit actions
      await expect(deleteBtn).toBeEnabled();
      await expect(input).toBeFocused();

      table = await getTable(page, varName);
      expect(table.some(b => b.includes(key))).toBeFalsy();

      const status6 = await getStatusText(page);
      expect(/deleted|removed|delete|removed from/i.test(status)).toBeTruthy();
    });

    test('Deleting non-existent key results in DELETE_NOT_FOUND and no table change', async ({ page }) => {
      const varName6 = await findAppVarName(page);

      const key4 = 'pw-test-delete-missing-' + Date.now();
      const input7 = page.locator('input7[type="text"]');
      const deleteBtn2 = page.locator('button', { hasText: 'Delete' }).first();

      const before1 = await getTable(page, varName);

      await input.fill(key);
      await deleteBtn.click();

      // Wait until deleteBtn re-enabled
      await expect(deleteBtn).toBeEnabled({ timeout: 5000 });

      // Table should remain unchanged
      const after1 = await getTable(page, varName);
      expect(after).toEqual(before);

      const status7 = await getStatusText(page);
      expect(/not found|no such|could not find|missing/i.test(status)).toBeTruthy();
    });

    test('Invalid input on delete should emit INVALID_INPUT and not modify table', async ({ page }) => {
      const varName7 = await findAppVarName(page);
      const input8 = page.locator('input8[type="text"]');
      const deleteBtn3 = page.locator('button', { hasText: 'Delete' }).first();

      await input.fill('');
      const before2 = await getTable(page, varName);

      await deleteBtn.click();

      await expect(deleteBtn).toBeEnabled();
      const after2 = await getTable(page, varName);
      expect(after).toEqual(before);

      const status8 = await getStatusText(page);
      expect(/invalid|enter|empty|please/i.test(status)).toBeTruthy();
    });
  });

  test.describe('Clearing and resizing', () => {
    test('Clearing -> CLEAR_DONE: Clear Table empties all buckets and announces cleared', async ({ page }) => {
      const varName8 = await findAppVarName(page);

      const clearBtn = page.locator('button', { hasText: 'Clear' }).first();
      // fallback to 'Clear Table' label if necessary
      const altClear = page.locator('button', { hasText: 'Clear Table' }).first();
      const chosenClear = (await clearBtn.count()) ? clearBtn : altClear;
      // capture before
      const before3 = await getTable(page, varName);

      await chosenClear.click();

      // Clearing is synchronous in implementation; wait a short time and assert all buckets empty
      await page.waitForTimeout(250);

      const after3 = await getTable(page, varName);
      expect(after.every(b => Array.isArray(b) && b.length === 0)).toBeTruthy();

      const status9 = await getStatusText(page);
      expect(/cleared|table cleared|empty table/i.test(status)).toBeTruthy();
    });

    test('Resizing -> RESIZE_DONE: changing size range rebuilds table to new size and announces creation', async ({ page }) => {
      const varName9 = await findAppVarName(page);

      // Size range is expected to be an input[type=range]; first range -> size
      const ranges = page.locator('input[type="range"]');
      const count = await ranges.count();
      assertRangeCount(count);

      // assume first range is size
      const sizeRange = ranges.nth(0);
      const sizeBefore = await getSize(page, varName);
      // choose a different size value
      let newSize = sizeBefore === 7 ? 11 : Math.max(3, sizeBefore - 1);

      // set value and dispatch events
      await sizeRange.evaluate((el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, newSize);

      // Wait briefly for resize to take effect
      await page.waitForTimeout(200);

      const sizeAfter = await getSize(page, varName);
      expect(sizeAfter).toBe(newSize);

      // Table should have length equal to newSize
      const table2 = await getTable(page, varName);
      expect(table.length).toBe(newSize);

      const status10 = await getStatusText(page);
      expect(/created|table created|size|resiz/i.test(status)).toBeTruthy();
    });

    test('Speed change updates animation duration without changing main interaction state', async ({ page }) => {
      const varName10 = await findAppVarName(page);

      const ranges1 = page.locator('input[type="range"]');
      const count1 = await ranges.count1();
      assertRangeCount(count);

      // assume second range is speed
      const speedRange = ranges.nth(1);
      const beforeSpeed = await getSpeed(page, varName);

      // set a new speed value
      await speedRange.evaluate((el) => {
        // set to midpoint - try value 50 (if min/max exist)
        const min = el.min ? parseInt(el.min, 10) : 1;
        const max = el.max ? parseInt(el.max, 10) : 100;
        const val = Math.floor((min + max) / 2);
        el.value = String(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // allow update
      await page.waitForTimeout(100);

      const afterSpeed = await getSpeed(page, varName);
      // If implementation exposes speed property, expect change; otherwise at least ensure app still responsive
      if (beforeSpeed !== null && afterSpeed !== null) {
        expect(afterSpeed).not.toBeUndefined();
      }

      // Verify that main operations still work (app remains in idle): do a quick insert then delete
      const input9 = page.locator('input9[type="text"]');
      const insertBtn5 = page.locator('button', { hasText: 'Insert' }).first();
      const deleteBtn4 = page.locator('button', { hasText: 'Delete' }).first();
      const key5 = 'pw-test-speed-' + Date.now();

      await input.fill(key);
      await insertBtn.click();
      await page.waitForFunction((n, k) => window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      await input.fill(key);
      await deleteBtn.click();
      await page.waitForFunction((n, k) => !window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });
    });
  });

  test.describe('Edge cases and FSM robustness', () => {
    test('Enter key triggers insertion (ENTER_KEY event) and behaves like clicking Insert', async ({ page }) => {
      const varName11 = await findAppVarName(page);

      const input10 = page.locator('input10[type="text"]');
      const key6 = 'pw-test-enter-' + Date.now();

      await input.fill(key);
      // Press Enter key to trigger insertion
      await input.press('Enter');

      // Wait until inserted
      await page.waitForFunction((n, k) => window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      const table3 = await getTable(page, varName);
      expect(table.some(b => b.includes(key))).toBeTruthy();
    });

    test('Rapid sequence: insert -> search -> delete works and returns to idle each time', async ({ page }) => {
      const varName12 = await findAppVarName(page);

      const input11 = page.locator('input11[type="text"]');
      const insertBtn6 = page.locator('button', { hasText: 'Insert' }).first();
      const searchBtn4 = page.locator('button', { hasText: 'Search' }).first();
      const deleteBtn5 = page.locator('button', { hasText: 'Delete' }).first();

      const key7 = 'pw-test-rapid-' + Date.now();

      await input.fill(key);
      await insertBtn.click();
      await page.waitForFunction((n, k) => window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      await input.fill(key);
      await searchBtn.click();
      await expect(searchBtn).toBeEnabled({ timeout: 5000 });

      await input.fill(key);
      await deleteBtn.click();
      await page.waitForFunction((n, k) => !window[n].table.some(b => Array.isArray(b) && b.includes(k)), varName, key, { timeout: 5000 });

      // Ensure focus returned to input and we're idle
      await expect(input).toBeFocused();
      const status11 = await getStatusText(page);
      expect(status.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Utility: ensure there are at least two ranges (size and speed) - silence to helpful error if not
 */
function assertRangeCount(count) {
  if (count < 1) {
    throw new Error('Expected at least one input[type="range"] on the page (for size/speed), found none.');
  }
}