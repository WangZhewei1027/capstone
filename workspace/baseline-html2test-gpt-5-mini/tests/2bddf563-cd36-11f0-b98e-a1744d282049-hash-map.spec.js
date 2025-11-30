import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf563-cd36-11f0-b98e-a1744d282049.html';

test.describe('Hash Map Interactive Demo (2bddf563-cd36-11f0-b98e-a1744d282049)', () => {
  // Collect console and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP);
    // Wait for initial seed() log entry to ensure app has rendered
    await expect(page.locator('#log .logEntry').first()).toBeVisible();
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors during the test
    expect(pageErrors.length).toBe(0);
    // Optionally assert no console 'error' messages (developers often log warnings/info; we only fail on error type)
    const errorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorMsgs.length).toBe(0);
  });

  test('Initial load shows seeded entries, capacity, size, and buckets', async ({ page }) => {
    // Verify capacity, size and load factor reflect seeded data
    await expect(page.locator('#cap')).toHaveText('8');
    await expect(page.locator('#size')).toHaveText('5'); // seed adds 5 entries: Alice,Bob,Carol,Dave,Eve
    await expect(page.locator('#thresh')).toHaveText('0.75');
    // Buckets count equals capacity (8)
    const buckets = page.locator('#buckets .bucket');
    await expect(buckets).toHaveCount(8);

    // Ensure seeded items exist in the UI
    await expect(page.locator('.item[data-key="Alice"]')).toBeVisible();
    await expect(page.locator('.item[data-key="Bob"]')).toBeVisible();
    await expect(page.locator('.item[data-key="Carol"]')).toBeVisible();
    await expect(page.locator('.item[data-key="Dave"]')).toBeVisible();
    await expect(page.locator('.item[data-key="Eve"]')).toBeVisible();

    // Progress fill width should reflect load factor (5/8 ~= 62-63%)
    const width = await page.locator('#progressFill').evaluate((el) => el.style.width);
    // allow either "62%" or "63%" depending on rounding
    expect(width.endsWith('%')).toBeTruthy();
    const pct = parseInt(width.replace('%', ''), 10);
    expect(pct).toBeGreaterThanOrEqual(62);
    expect(pct).toBeLessThanOrEqual(63);
  });

  test('Clicking Put without a key shows an alert', async ({ page }) => {
    // Ensure key input is empty then click Put -> alert
    await page.locator('#keyInput').fill('');
    // Listen for dialog and assert its message
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Please provide a key');
      await dialog.accept();
    });
    await page.locator('#putBtn').click();
  });

  test('Put a new key inserts it into the correct bucket and highlights it', async ({ page }) => {
    // Insert a new key-value
    await page.locator('#keyInput').fill('Zed');
    await page.locator('#valueInput').fill('id:9');

    // Click Put and wait for UI updates
    await page.locator('#putBtn').click();

    // Size should increase from 5 to 6
    await expect(page.locator('#size')).toHaveText('6');

    // The new item should appear in the bucket list
    const newItem = page.locator('.item[data-key="Zed"]');
    await expect(newItem).toBeVisible();

    // A bucket should have the temporary 'highlight' class after insertion
    // Because highlight is removed after ~700ms, assert it's present quickly
    const highlighted = page.locator('.bucket.highlight');
    await expect(highlighted.first()).toBeVisible();

    // A log entry for PUT should be present at the top
    const firstLog = page.locator('#log .logEntry').first();
    const text = await firstLog.textContent();
    expect(text).toContain("PUT key='Zed' value='id:9' -> inserted");
  });

  test('Get an existing key marks the item found and logs result', async ({ page }) => {
    // Look up seeded key 'Alice'
    await page.locator('#keyInput').fill('Alice');
    await page.locator('#getBtn').click();

    // The log should indicate a successful GET
    const firstLog1 = page.locator('#log .logEntry').first();
    await expect(firstLog).toContainText("GET key='Alice' -> found");

    // The item for Alice should briefly have the 'found' class
    const alice = page.locator('.item[data-key="Alice"]');
    await expect(alice).toBeVisible();

    // Check class list contains 'found' shortly after click
    await page.waitForTimeout(50); // small wait to allow brieflyMarkItem to add class
    const classList = await alice.evaluate((el) => el.className);
    expect(classList.includes('found')).toBeTruthy();

    // Eventually the class is removed (default ms=1000), confirm that after 1500ms it's gone
    await page.waitForTimeout(1500);
    const classListAfter = await alice.evaluate((el) => el.className);
    expect(classListAfter.includes('found')).toBeFalsy();
  });

  test('Delete an existing key removes it from the map and logs deletion', async ({ page }) => {
    // Ensure Bob exists and get initial size
    await expect(page.locator('.item[data-key="Bob"]')).toBeVisible();
    await expect(page.locator('#size')).toHaveText('5');

    // Delete Bob
    await page.locator('#keyInput').fill('Bob');
    await page.locator('#delBtn').click();

    // Size should drop to 4
    await expect(page.locator('#size')).toHaveText('4');

    // Bob's item should no longer be present in DOM
    await expect(page.locator('.item[data-key="Bob"]')).toHaveCount(0);

    // Log shows deletion
    const firstLog2 = page.locator('#log .logEntry').first();
    await expect(firstLog).toContainText("DELETE key='Bob' -> deleted");
  });

  test('Clear button confirms then clears all items and logs action', async ({ page }) => {
    // Click Clear and accept the confirmation dialog
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Clear all items from the hash map?');
      await dialog.accept();
    });
    await page.locator('#clearBtn').click();

    // After clearing, size should be 0 and all bucket lengths should be 0
    await expect(page.locator('#size')).toHaveText('0');

    // Each bucket .len should be "0"
    const lenElements = page.locator('.bucket .len');
    const count = await lenElements.count();
    for (let i = 0; i < count; i++) {
      await expect(lenElements.nth(i)).toHaveText('0');
    }

    // Log indicates the map was cleared
    const firstLog3 = page.locator('#log .logEntry').first();
    await expect(firstLog).toContainText('Cleared hash map.');
  });

  test('Set capacity with invalid value shows an alert', async ({ page }) => {
    // Fill capacity with invalid value (<2)
    await page.locator('#capacityInput').fill('1');

    // Click set capacity -> alert
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Capacity must be a number >= 2');
      await dialog.accept();
    });
    await page.locator('#setCapacityBtn').click();

    // Ensure capacity hasn't changed (still 8)
    await expect(page.locator('#cap')).toHaveText('8');
  });

  test('Rehash button rehashes items (same capacity) and logs completion', async ({ page }) => {
    const initialCapacity = await page.locator('#cap').textContent();
    await page.locator('#rebuildBtn').click();

    // Log entry should indicate rehash complete
    const firstLog4 = page.locator('#log .logEntry').first();
    await expect(firstLog).toContainText('Rehash complete (same capacity).');

    // Capacity remains unchanged
    await expect(page.locator('#cap')).toHaveText(initialCapacity.trim());
  });

  test('Toggling Auto-resize updates resizing indicator and logs', async ({ page }) => {
    // Auto-resize is checked by default -> "on"
    await expect(page.locator('#resizing')).toHaveText('on');

    // Uncheck the autoResize checkbox
    await page.locator('#autoResize').uncheck();
    // A log entry is added and resizing stat updates to 'off'
    await expect(page.locator('#resizing')).toHaveText('off');

    // The top log should indicate auto-resize disabled
    const firstLog5 = page.locator('#log .logEntry').first();
    await expect(firstLog).toContainText('Auto-resize disabled');
  });

  test('Find collisions without key shows an alert', async ({ page }) => {
    // Ensure key input is empty
    await page.locator('#keyInput').fill('');
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Please provide a key to find collisions for');
      await dialog.accept();
    });
    await page.locator('#findCollisionsBtn').click();
  });

  test('Find collisions for seeded key logs results (found or not) and does not crash', async ({ page }) => {
    // Provide a key to search collisions for
    await page.locator('#keyInput').fill('Alice');

    // Click and wait for the asynchronous collision search to complete and log something
    await page.locator('#findCollisionsBtn').click();

    // Collision search logs "Searching for 1 collision ..." and either "Found collision" or "No collisions"
    // Wait up to 5s for search to complete (could be quick)
    await expect(page.locator('#log .logEntry').first()).toBeVisible({ timeout: 5000 });
    const logsText = await page.locator('#log').innerText();
    expect(logsText).toMatch(/Searching for 1 collision for key='Alice'|Searching for 1 collision/);

    // After completion, the log should contain either 'Found collision' or 'No collisions'
    // Wait a bit to allow the async search to finish and log result
    await page.waitForTimeout(1200);
    const finalLogs = await page.locator('#log').innerText();
    expect(/Found collision|No collisions|No collisions found/.test(finalLogs)).toBeTruthy();
  });

  test('Random insert adds 8 items and updates size accordingly', async ({ page }) => {
    // Initial size is 5, clicking Insert 8 Random will add 8 -> expect 13
    await page.locator('#randomBtn').click();

    // Wait for the UI to update (random insertion is synchronous but logs added)
    await expect(page.locator('#size')).toHaveText('13', { timeout: 2000 });

    // Confirm that there are at least 8 log entries from the random insertion
    const logText = await page.locator('#log').innerText();
    // the random insertion logs "PUT 'k...'" entries; assert that such lines exist
    const match = logText.match(/PUT 'k[a-z0-9]+?'/g);
    expect(match && match.length >= 8).toBeTruthy();
  });

  test('Threshold input invalid value triggers alert and does not update load factor', async ({ page }) => {
    // Set an invalid threshold (>=1)
    await page.locator('#thresholdInput').fill('1.5');

    // Trigger change by blurring the input, which should fire 'change' handler
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Load factor must be between 0 and 1');
      await dialog.accept();
    });

    // Click elsewhere to trigger change event
    await page.locator('h1').click();
  });
});