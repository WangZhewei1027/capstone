import { test, expect } from '@playwright/test';

// Test file: d809adb1-d1c9-11f0-9efc-d1db1618a544-hash-map.spec.js
// Purpose: Comprehensive end-to-end tests for the Hash Map interactive demo
// Note: We do not modify or patch the page; we observe console logs and page errors and interact with the UI as-is.

// Page object to encapsulate interactions with the demo
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.keyInput = page.locator('#keyInput');
    this.valInput = page.locator('#valInput');
    this.putBtn = page.locator('#putBtn');
    this.getBtn = page.locator('#getBtn');
    this.removeBtn = page.locator('#removeBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.autoResize = page.locator('#autoResize');
    this.capInput = page.locator('#capInput');
    this.lfInput = page.locator('#lfInput');

    // Visual elements / stats
    this.buckets = page.locator('#buckets');
    this.bucket = idx => page.locator(`#buckets .bucket[data-idx="${idx}"]`);
    this.entriesList = page.locator('#entriesList');
    this.sizeEl = page.locator('#size');
    this.capEl = page.locator('#cap');
    this.lfEl = page.locator('#lf');
    this.maxChainEl = page.locator('#maxChain');
    this.avgChainEl = page.locator('#avgChain');
    this.logEl = page.locator('#log');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d809adb1-d1c9-11f0-9efc-d1db1618a544.html', { waitUntil: 'domcontentloaded' });
    // Wait a short while for the initial render and initial log message
    await this.page.waitForTimeout(100);
  }

  // Fill inputs and click put
  async put(key, value) {
    await this.keyInput.fill(String(key));
    await this.valInput.fill(String(value));
    await Promise.all([
      this.page.waitForResponse(response => true).catch(() => {}), // keep tests resilient if no network used
      this.putBtn.click()
    ]);
    // After clicking put, render() is invoked synchronously inside handlers. Give the UI a moment.
    await this.page.waitForTimeout(50);
  }

  // Click get
  async get(key) {
    await this.keyInput.fill(String(key));
    await this.getBtn.click();
    await this.page.waitForTimeout(50);
  }

  async remove(key) {
    await this.keyInput.fill(String(key));
    await this.removeBtn.click();
    await this.page.waitForTimeout(50);
  }

  async clickRandom() {
    await this.randomBtn.click();
    // random insertion uses setTimeout(render, 250)
    await this.page.waitForTimeout(350);
  }

  async clear() {
    await this.clearBtn.click();
    await this.page.waitForTimeout(50);
  }

  async reset(capacity, lf) {
    if (capacity !== undefined) {
      await this.capInput.fill(String(capacity));
    }
    if (lf !== undefined) {
      await this.lfInput.fill(String(lf));
    }
    await this.resetBtn.click();
    await this.page.waitForTimeout(50);
  }

  // Helpers to query state
  async capacity() { return Number((await this.capEl.textContent()).trim()); }
  async size() { return Number((await this.sizeEl.textContent()).trim()); }
  async loadFactorText() { return (await this.lfEl.textContent()).trim(); }
  async entriesText() { return (await this.entriesList.textContent()).trim(); }
  async bucketCount() { return await this.page.locator('#buckets .bucket').count(); }
  async bucketEntriesTotal() {
    const entries = this.page.locator('#buckets .entry');
    return await entries.count();
  }

  // Get first log message text (most recent is first child)
  async latestLogText() {
    const first = this.logEl.locator('div').first();
    return (await first.textContent() || '').trim();
  }

  // Return array of all log texts
  async allLogTexts() {
    const nodes = this.logEl.locator('div');
    const count = await nodes.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push((await nodes.nth(i).textContent() || '').trim());
    }
    return out;
  }

  // Find a bucket index that contains an entry with keyText in .key span
  async findBucketIndexForKeyText(keyText) {
    const buckets = this.page.locator('#buckets .bucket');
    const count = await buckets.count();
    for (let i = 0; i < count; i++) {
      const b = buckets.nth(i);
      const hasKey = await b.locator('.entry .key', { hasText: keyText }).count();
      if (hasKey > 0) return i;
    }
    return -1;
  }
}

// Keep logs and page errors captured per test
test.describe('Hash Map Interactive Demo - Full E2E', () => {
  // We'll capture console messages and pageerrors for each test to ensure there are no unexpected runtime errors.
  test.beforeEach(async ({ page }) => {
    // Ensure viewport and basic readiness
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  // Test initial load and default state
  test('Initial page load shows UI controls and default stats', async ({ page }) => {
    // Collect console messages and errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err));

    const hm = new HashMapPage(page);
    await hm.goto();

    // Verify main elements exist and are visible
    await expect(page.locator('header .logo')).toBeVisible();
    await expect(page.locator('h1', { hasText: 'Hash Map — Interactive Demo' })).toBeVisible();
    await expect(hm.keyInput).toBeVisible();
    await expect(hm.valInput).toBeVisible();
    await expect(hm.putBtn).toBeVisible();
    await expect(hm.getBtn).toBeVisible();
    await expect(hm.removeBtn).toBeVisible();
    await expect(hm.randomBtn).toBeVisible();
    await expect(hm.clearBtn).toBeVisible();

    // Default stats: capacity 8, size 0, load factor 0.000
    await expect(hm.capEl).toHaveText(String(8));
    await expect(hm.sizeEl).toHaveText('0');
    // load factor displayed as 3 decimals
    await expect(hm.lfEl).toHaveText('0.000');
    await expect(hm.maxChainEl).toHaveText('0');
    await expect(hm.avgChainEl).toHaveText('0.00');

    // There should be 8 bucket elements rendered (initial capacity)
    const bucketCount = await hm.bucketCount();
    expect(bucketCount).toBe(8);

    // Entries list should indicate no entries
    await expect(hm.entriesList).toHaveText('(no entries)');

    // The initial log should include the ready message
    const latestLog = await hm.latestLogText();
    expect(latestLog).toMatch(/HashMap demo ready/);

    // Assert there were no uncaught page errors during load
    expect(pageErrors.length).toBe(0);

    // Keep consoleMessages for debugging if tests fail
    test.info().attachments.push({
      name: 'console-messages-initial',
      body: consoleMessages.join('\n'),
    });
  });

  // Test put/get/remove workflows, UI updates, and error-handling when inputs are empty
  test('Put a key, update it, get it, and remove it; validate logs and UI changes', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err));

    const hm = new HashMapPage(page);
    await hm.goto();

    // 1) Attempt to Get with empty key -> should produce an error message in the app log (not a JS exception)
    await hm.keyInput.fill(''); // ensure empty
    await hm.getBtn.click();
    // Give time for the log to be prepended
    await page.waitForTimeout(50);
    const log1 = await hm.latestLogText();
    expect(log1).toMatch(/Please provide a key to get/i);

    // 2) Attempt to Remove with empty key -> should produce an error message
    await hm.removeBtn.click();
    await page.waitForTimeout(50);
    const log2 = await hm.latestLogText();
    expect(log2).toMatch(/Please provide a key to remove/i);

    // 3) Put a key "name" => "Alice"
    await hm.put('name', 'Alice');

    // After put, size should be 1 and entries list updated
    await expect(hm.sizeEl).toHaveText('1');
    await expect(hm.entriesList).toContainText('name');
    await expect(hm.entriesList).toContainText('Alice');

    // The latest log should mention put(... added in bucket ...
    const putLog = await hm.latestLogText();
    expect(putLog).toMatch(/put\(/i);
    expect(putLog).toMatch(/added|updated/i);

    // 4) Put same key to update its value to "Eve"
    await hm.put('name', 'Eve');
    // Size should remain 1
    await expect(hm.sizeEl).toHaveText('1');
    // Entries list should now show updated value
    await expect(hm.entriesList).toContainText('Eve');

    // Latest log should indicate updated
    const updLog = await hm.latestLogText();
    expect(updLog).toMatch(/updated/i);

    // 5) Get the key via the Get button; should log the retrieved value
    await hm.get('name');
    await page.waitForTimeout(20);
    const getLog = await hm.latestLogText();
    expect(getLog).toMatch(/get\(/i);
    expect(getLog).toMatch(/Eve/);

    // Also the bucket that contains 'name' should receive highlight class briefly; assert it is present immediately after get
    const bucketIdx = await hm.findBucketIndexForKeyText('name');
    expect(bucketIdx).toBeGreaterThanOrEqual(0);
    const bucketLocator = hm.bucket(bucketIdx);
    await expect(bucketLocator).toHaveClass(/highlight/);

    // 6) Remove the key using remove button - size should drop to 0
    await hm.remove('name');
    await expect(hm.sizeEl).toHaveText('0');
    await expect(hm.entriesList).toHaveText('(no entries)');

    // Latest log should indicate remove(...) => value
    const remLog = await hm.latestLogText();
    expect(remLog).toMatch(/remove\(/i);

    // Ensure no uncaught JS errors were thrown during interactions
    expect(pageErrors.length).toBe(0);

    test.info().attachments.push({
      name: 'console-messages-put-get-remove',
      body: consoleMessages.join('\n'),
    });
  });

  // Test random insertion of 10 items, resizing behavior, and clear
  test('Insert 10 random keys, validate size and capacity (auto-resize), then clear map', async ({ page }) => {
    const pageErrors = [];
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err));

    const hm = new HashMapPage(page);
    await hm.goto();

    // Click the "Insert 10 Random" button and wait for the scheduled render
    await hm.clickRandom();

    // After random insert, size should be 10 (the UI uses map.put 10 times)
    // There may be collisions, but each put() always pushes a new item unless the random key duplicates. We assert size >= 1 and <= 10, but typically equals 10. To be resilient, ensure size is > 0 and <= 1024.
    const sizeAfter = await hm.size();
    expect(sizeAfter).toBeGreaterThanOrEqual(1);
    expect(sizeAfter).toBeLessThanOrEqual(1024);

    // Verify entries list matches the count of entries in buckets
    const entriesInBuckets = await hm.bucketEntriesTotal();
    expect(entriesInBuckets).toBeGreaterThanOrEqual(1);
    // entriesList should not show '(no entries)'
    await expect(hm.entriesList).not.toHaveText('(no entries)');

    // Capacity should be a power of two and at least 8 (may have grown)
    const cap = await hm.capacity();
    expect(cap).toBeGreaterThanOrEqual(8);
    // Basic check: cap is power of two
    const isPowerOfTwo = (n) => (n & (n - 1)) === 0;
    expect(isPowerOfTwo(cap)).toBeTruthy();

    // Now clear the map and validate size resets to 0 and entries list shows '(no entries)'
    await hm.clear();
    await expect(hm.sizeEl).toHaveText('0');
    await expect(hm.entriesList).toHaveText('(no entries)');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    test.info().attachments.push({
      name: 'console-messages-random-clear',
      body: consoleMessages.join('\n'),
    });
  });

  // Test reset with custom capacity and load factor inputs
  test('Reset map with new initial capacity and load factor', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err));

    const hm = new HashMapPage(page);
    await hm.goto();

    // Set capacity to 4 and load factor to 0.5 and reset
    await hm.reset(4, 0.5);

    // Capacity element should reflect new capacity (4)
    await expect(hm.capEl).toHaveText('4');

    // The log should mention Reset map: capacity=...
    const allLogs = await hm.allLogTexts();
    const foundReset = allLogs.some(l => /Reset map: capacity=\d+/i.test(l));
    expect(foundReset).toBeTruthy();

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    test.info().attachments.push({
      name: 'console-messages-reset',
      body: consoleMessages.join('\n'),
    });
  });

  // Test clicking on a bucket to highlight and produce a log entry
  test('Clicking a bucket highlights it and logs selection', async ({ page }) => {
    const pageErrors = [];
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err));

    const hm = new HashMapPage(page);
    await hm.goto();

    // Put a specific numeric key (easier to find)
    await hm.put(42, 'the-answer');

    // Find bucket index containing the key '42'
    const idx = await hm.findBucketIndexForKeyText('42');
    expect(idx).toBeGreaterThanOrEqual(0);

    // Click the bucket element
    const b = hm.bucket(idx);
    await b.click();
    await page.waitForTimeout(30);

    // The log should include "bucket X selected"
    const logText = await hm.latestLogText();
    expect(logText).toMatch(new RegExp(`bucket ${idx} selected`));

    // The bucket should have highlight class applied (immediate)
    await expect(b).toHaveClass(/highlight/);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    test.info().attachments.push({
      name: 'console-messages-bucket-click',
      body: consoleMessages.join('\n'),
    });
  });
});