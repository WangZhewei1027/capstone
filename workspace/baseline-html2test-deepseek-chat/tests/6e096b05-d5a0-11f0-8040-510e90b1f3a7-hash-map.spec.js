import { test, expect } from '@playwright/test';

// Test file for HashMap Visualization app
// URL: http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b05-d5a0-11f0-8040-510e90b1f3a7.html
// Filename required by spec: 6e096b05-d5a0-11f0-8040-510e90b1f3a7-hash-map.spec.js

// Page Object Model for interacting with the HashMap page
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    // Buttons are using inline onclick attributes; locating by text
    this.insertButton = page.getByRole('button', { name: /Insert Key-Value Pair/i });
    this.getButton = page.getByRole('button', { name: /Get Value/i });
    this.removeButton = page.getByRole('button', { name: /Remove Key/i });
    this.clearButton = page.getByRole('button', { name: /Clear All/i });
    this.hashCodeDisplay = page.locator('#hashCodeDisplay');
    this.operationLog = page.locator('#operationLog');
    this.visualization = page.locator('#hashmapVisualization');
    this.stats = page.locator('#stats');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async setKey(key) {
    await this.keyInput.fill('');
    await this.keyInput.fill(key);
  }

  async setValue(value) {
    await this.valueInput.fill('');
    await this.valueInput.fill(value);
  }

  async clickInsert() {
    await this.insertButton.click();
  }

  async clickGet() {
    await this.getButton.click();
  }

  async clickRemove() {
    await this.removeButton.click();
  }

  async clickClear() {
    await this.clearButton.click();
  }

  async getSizeText() {
    // stats block contains Size: <span id="size">N</span>
    return this.page.locator('#size').innerText();
  }

  async getCapacityText() {
    return this.page.locator('#capacity').innerText();
  }

  async getLoadFactorText() {
    return this.page.locator('#loadFactor').innerText();
  }

  async getOperationLogFirstEntry() {
    // first (most recent) log is the first child of operationLog because entries are prepended
    const first = this.operationLog.locator('div').first();
    return first.innerText();
  }

  async entryLocator(key) {
    return this.page.locator(`#entry-${key}`);
  }

  async waitForEntryVisible(key, timeout = 2000) {
    const el = await this.entryLocator(key);
    await expect(el).toBeVisible({ timeout });
    return el;
  }

  async waitForEntryHidden(key, timeout = 2000) {
    const el = await this.entryLocator(key);
    await expect(el).toBeHidden({ timeout });
  }

  async countBuckets() {
    return this.visualization.locator('.bucket').count();
  }

  async countEmptyMarkers() {
    // Count "Empty" text nodes under buckets
    return this.visualization.locator('text=Empty').count();
  }

  async getHashCodeDisplayText() {
    return this.hashCodeDisplay.innerText();
  }
}

// Base URL of the HTML file under test
const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b05-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('HashMap Visualization - Basic load and initial state', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // Capture console messages and page errors for assertions
    consoleMessages = [];
    pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test('Page loads with expected title, inputs, buttons and initial stats', async ({ page }) => {
    const map = new HashMapPage(page);
    // Navigate to the page
    await map.goto(BASE_URL);

    // Verify basic page elements are present
    await expect(page).toHaveTitle(/HashMap Visualization/i);

    // Verify inputs default values from HTML
    await expect(map.keyInput).toHaveValue('key1');
    await expect(map.valueInput).toHaveValue('value1');

    // Verify buttons are present and enabled
    await expect(map.insertButton).toBeVisible();
    await expect(map.getButton).toBeVisible();
    await expect(map.removeButton).toBeVisible();
    await expect(map.clearButton).toBeVisible();

    // Verify initial stats: the script adds sample data: name, age, city => size 3
    await expect(page.locator('#size')).toHaveText('3');
    await expect(page.locator('#capacity')).toHaveText('16');
    await expect(page.locator('#loadFactor')).toHaveText('0.75');

    // Verify visualization has 16 buckets rendered
    const bucketCount = await map.countBuckets();
    expect(bucketCount).toBe(16);

    // Verify operation log contains initialization message
    const firstLog = await map.getOperationLogFirstEntry();
    expect(firstLog).toContain('HashMap initialized with capacity 16 and load factor 0.75');

    // Assert there were no uncaught page errors during load
    expect(pageErrors.length).toBe(0);

    // Optionally assert that console captured some logs (informational)
    const hasInitConsole = consoleMessages.some(m => /HashMap initialized/i.test(m.text));
    // At least one console message should mention HashMap initialized (if script logs to console)
    // This assertion is permissive: it's okay if console doesn't have it, but we assert the app's DOM log is present above.
    // We won't fail the test if console message is absent; we simply record it.
    // If present, ensure it's a string.
    if (hasInitConsole) {
      const msg = consoleMessages.find(m => /HashMap initialized/i.test(m.text));
      expect(typeof msg.text).toBe('string');
    }
  });
});

test.describe('HashMap Visualization - CRUD interactions and visual feedback', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Insert a new entry and verify DOM updates, highlight and logs
  test('Insert: adding a new key-value pair updates visualization, stats and logs', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    // Prepare a unique key to avoid collisions with sample data
    const key = 'testKey';
    const value = 'testValue';

    await map.setKey(key);
    await map.setValue(value);

    // Click Insert and wait for DOM updates
    await map.clickInsert();

    // Hash display should reflect the inserted key
    await expect(map.hashCodeDisplay).toContainText(`hash("${key}")`);

    // The new entry element should appear in the visualization
    const entry = map.entryLocator(key);
    await expect(entry).toBeVisible();

    // The operation log should record the insertion at the top
    const log = await map.getOperationLogFirstEntry();
    expect(log).toContain(`Inserted: ${key} → ${value}`);

    // Size should have incremented from initial 3 to 4
    await expect(page.locator('#size')).toHaveText('4');

    // The entry receives a highlight class shortly after insertion (added by setTimeout)
    // Wait until the element has the highlight class, then wait for it to be removed
    await expect(entry).toHaveClass(/highlight/, { timeout: 1200 }); // highlight applied within ~100ms
    // After some time the class should be removed (highlight lasts 1s)
    await page.waitForTimeout(1200);
    await expect(entry).not.toHaveClass(/highlight/);

    // No unexpected page errors should have occurred
    expect(pageErrors.length).toBe(0);
  });

  // Retrieve an existing value and check highlight/log
  test('Get: retrieving an existing key highlights the entry and logs retrieval', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    // 'name' was added as sample data with value 'John'
    await map.setKey('name');
    await map.clickGet();

    // Hash code display should show calculation for 'name'
    const hashText = await map.getHashCodeDisplayText();
    expect(hashText).toContain('hash("name")');

    // The operation log should record the retrieval with correct value
    const log = await map.getOperationLogFirstEntry();
    expect(log).toContain('Retrieved: name → John');

    // The corresponding entry element should exist and be highlighted
    const entry = map.entryLocator('name');
    await expect(entry).toBeVisible();
    await expect(entry).toHaveClass(/highlight/, { timeout: 1200 });
    await page.waitForTimeout(1200);
    await expect(entry).not.toHaveClass(/highlight/);

    expect(pageErrors.length).toBe(0);
  });

  // Remove an existing key and verify it's gone, size updates and log shows removal
  test('Remove: removing an existing key removes the entry, updates stats and logs', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    // Verify initial size is 3 (sample entries)
    await expect(page.locator('#size')).toHaveText('3');

    // Remove 'age'
    await map.setKey('age');
    await map.clickRemove();

    // Operation log should record removal
    const log = await map.getOperationLogFirstEntry();
    expect(log).toContain('Removed: age');

    // Entry for 'age' should no longer be present in DOM
    const entry = map.entryLocator('age');
    await expect(entry).toBeHidden();

    // Size should decrement by 1 (from 3 to 2)
    await expect(page.locator('#size')).toHaveText('2');

    expect(pageErrors.length).toBe(0);
  });

  // Clear all entries and verify buckets show 'Empty' and size resets to 0
  test('Clear: clicking Clear All empties the map, resets size, and logs the operation', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    // Click the clear button
    await map.clickClear();

    // Operation log should include 'Cleared all entries' as most recent
    const log = await map.getOperationLogFirstEntry();
    expect(log).toContain('Cleared all entries');

    // Size should be reset to 0
    await expect(page.locator('#size')).toHaveText('0');

    // All buckets should show 'Empty' (16 buckets)
    const bucketCount = await map.countBuckets();
    expect(bucketCount).toBe(16);

    const emptyCount = await map.countEmptyMarkers();
    expect(emptyCount).toBe(16);

    expect(pageErrors.length).toBe(0);
  });
});

test.describe('HashMap Visualization - Edge cases, not-found cases and resizing behavior', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Attempt to retrieve a non-existent key and assert appropriate log entry and no highlight
  test('Get non-existent key logs a not-found message and does not highlight any entry', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    const missingKey = 'nope';
    await map.setKey(missingKey);
    await map.clickGet();

    // Operation log should indicate key not found
    const log = await map.getOperationLogFirstEntry();
    expect(log).toContain(`Key not found: ${missingKey}`);

    // There should be no entry element for the missing key
    const entry = map.entryLocator(missingKey);
    await expect(entry).toBeHidden();

    expect(pageErrors.length).toBe(0);
  });

  // Attempt to remove a non-existent key and check log
  test('Remove non-existent key logs a not-found-for-removal message', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    const missingKey = 'ghost';
    await map.setKey(missingKey);
    await map.clickRemove();

    const log = await map.getOperationLogFirstEntry();
    expect(log).toContain(`Key not found for removal: ${missingKey}`);

    expect(pageErrors.length).toBe(0);
  });

  // Insert enough entries to trigger resize and confirm capacity doubles
  test('Resize: inserting many entries triggers resize and updates capacity and size correctly', async ({ page }) => {
    const map = new HashMapPage(page);
    await map.goto(BASE_URL);

    // Initial size is 3, capacity 16, loadFactor 0.75 -> threshold = 12
    // We need to exceed threshold (size/capacity > 0.75) -> size > 12
    // So we will insert 10 additional distinct keys to make size = 13 (>12)
    const insertsNeeded = 10;
    for (let i = 1; i <= insertsNeeded; i++) {
      const k = `k${i}`;
      const v = `v${i}`;
      await map.setKey(k);
      await map.setValue(v);
      await map.clickInsert();

      // small delay to allow UI update/highlight toggles to run
      await page.waitForTimeout(50);
    }

    // After insertions, verify capacity increased from 16 to 32
    await expect(page.locator('#capacity')).toHaveText('32');

    // Size should be initial 3 + insertsNeeded = 13
    await expect(page.locator('#size')).toHaveText('13');

    // All recently added entries should now exist in DOM
    for (let i = 1; i <= insertsNeeded; i++) {
      const key = `k${i}`;
      const entry = map.entryLocator(key);
      await expect(entry).toBeVisible();
    }

    expect(pageErrors.length).toBe(0);
  });
});

// Additional grouping to explicitly inspect console and page errors after various operations
test.describe('HashMap Visualization - Console and runtime error observation', () => {
  test('No unexpected runtime page errors are thrown during typical flows', async ({ page }) => {
    const map = new HashMapPage(page);
    const pageErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (e) => pageErrors.push(e));
    page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));

    await map.goto(BASE_URL);

    // Perform a sampling of typical flows: insert, get, remove, clear
    await map.setKey('probe1');
    await map.setValue('pv1');
    await map.clickInsert();
    await page.waitForTimeout(100);

    await map.setKey('name');
    await map.clickGet();
    await page.waitForTimeout(100);

    await map.setKey('age');
    await map.clickRemove();
    await page.waitForTimeout(100);

    await map.clickClear();
    await page.waitForTimeout(100);

    // Assert that there were no uncaught exceptions during the interactions
    expect(pageErrors.length).toBe(0);

    // Make sure operation log contains at least one expected message
    const topLog = await map.getOperationLogFirstEntry();
    expect(typeof topLog).toBe('string');

    // Log console summary if any console errors occurred (not failing the test unless pageErrors > 0)
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});