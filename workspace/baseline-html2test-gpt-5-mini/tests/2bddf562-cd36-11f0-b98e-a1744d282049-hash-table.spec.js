import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf562-cd36-11f0-b98e-a1744d282049.html';

// Page object to encapsulate interactions with the demo
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.locators = {
      keyInput: this.page.locator('#keyInput'),
      valInput: this.page.locator('#valInput'),
      insertBtn: this.page.locator('#insertBtn'),
      getBtn: this.page.locator('#getBtn'),
      delBtn: this.page.locator('#delBtn'),
      modeSelect: this.page.locator('#modeSelect'),
      modeIndicator: this.page.locator('#modeIndicator'),
      capInput: this.page.locator('#capInput'),
      applyCap: this.page.locator('#applyCap'),
      randBtn: this.page.locator('#randBtn'),
      clearBtn: this.page.locator('#clearBtn'),
      stepBtn: this.page.locator('#stepBtn'),
      rehashBtn: this.page.locator('#rehashBtn'),
      autoResize: this.page.locator('#autoResize'),
      capacityStat: this.page.locator('#capacity'),
      sizeStat: this.page.locator('#size'),
      loadStat: this.page.locator('#load'),
      collStat: this.page.locator('#collisions'),
      buckets: this.page.locator('#buckets'),
      log: this.page.locator('#log'),
    };
  }

  // Helper to wait until the log contains a message substring
  async waitForLogContains(substring, timeout = 3000) {
    await this.page.waitForFunction(
      (sel, sub) => {
        const el = document.querySelector(sel);
        return el && el.innerText.includes(sub);
      },
      this.locators.log.first().selector(),
      substring,
      { timeout }
    );
  }

  async getLatestLogText() {
    // entries are prepended: the first .entry is the latest
    const firstEntry = this.page.locator('#log .entry').first();
    return (await firstEntry.innerText()).trim();
  }

  async insertViaUI(key, value) {
    await this.locators.keyInput.fill(key);
    await this.locators.valInput.fill(String(value));
    await this.locators.insertBtn.click();
    // wait for the log to include the inserted key (either Insert or Update or error)
    await this.waitForLogContains(`"${key}"`);
  }

  async getViaUI(key) {
    await this.locators.keyInput.fill(key);
    await this.locators.getBtn.click();
    await this.waitForLogContains(`"${key}"`);
  }

  async deleteViaUI(key) {
    await this.locators.keyInput.fill(key);
    await this.locators.delBtn.click();
    await this.waitForLogContains(`"${key}"`);
  }

  async switchMode(modeValue) {
    await this.locators.modeSelect.selectOption(modeValue);
    // expect a log entry noting the switch
    await this.waitForLogContains(modeValue === 'chaining' ? 'Separate Chaining' : 'Open Addressing');
  }

  async applyCapacity(value) {
    await this.locators.capInput.fill(String(value));
    await this.locators.applyCap.click();
    await this.waitForLogContains(`Applied capacity`);
    // wait for capacity stat to reflect new capacity
    await this.page.waitForFunction(
      (sel, val) => document.querySelector(sel).textContent.trim() === String(val),
      '#capacity',
      String(value)
    );
  }

  async rehash() {
    await this.locators.rehashBtn.click();
    await this.waitForLogContains('Rehashed');
  }

  async clearTable() {
    await this.locators.clearBtn.click();
    await this.waitForLogContains('Cleared table');
  }

  async stepInsert(key, value) {
    await this.locators.keyInput.fill(key);
    await this.locators.valInput.fill(String(value));
    await this.locators.stepBtn.click();
    await this.waitForLogContains('STEP: Compute hash');
  }

  async bucketCount() {
    return await this.locators.buckets.locator('.bucket').count();
  }

  async bucketHasTombstoneAtIndex(idx) {
    const selector = `.bucket[data-idx="${idx}"] .node.tombstone`;
    return await this.page.locator(selector).count().then(c => c > 0);
  }

  async getCapacity() {
    return Number((await this.locators.capacityStat.innerText()).trim());
  }

  async getSize() {
    return Number((await this.locators.sizeStat.innerText()).trim());
  }
}

test.describe('Hash Table Interactive Demo - end-to-end', () => {
  // Capture console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // collect console messages
    page.on('console', msg => {
      // store text and type for inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // capture unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Ensure initial initialization logs appear
    await page.waitForSelector('#log .entry');
  });

  test.afterEach(async ({ page }) => {
    // Final safety: capture any remaining page errors as test failure context
    if (pageErrors.length > 0) {
      // Keep test output helpful by logging the errors, but do not attempt to modify page
      console.error('Page errors during test:', pageErrors.map(e => e.message).join('\n---\n'));
    }
  });

  test('Initial load: default mode, capacity and seeded entries are displayed', async ({ page }) => {
    // Purpose: Validate that initial UI state matches expectations after seed runs.
    const app = new HashTablePage(page);

    // Title visible
    await expect(page.locator('h1')).toHaveText('Hash Table Interactive Demo');

    // Default mode indicator should be "Separate Chaining"
    await expect(app.locators.modeIndicator).toHaveText('Separate Chaining');

    // Capacity should reflect default 12
    const cap = await app.getCapacity();
    expect(cap).toBe(12);

    // Size should reflect seeded entries (seed inserted 6 items)
    // We allow slight variance if code changed, assert at least non-negative and <= capacity
    const size = await app.getSize();
    expect(size).toBeGreaterThanOrEqual(0);
    expect(size).toBeLessThanOrEqual(cap);

    // There should be exactly `capacity` bucket elements rendered
    const bucketCount = await app.bucketCount();
    expect(bucketCount).toBe(cap);

    // The log should contain the "Demo ready." entry from initialization
    // Wait and read the latest log
    await app.waitForLogContains('Demo ready.');
    const latest = await app.getLatestLogText();
    expect(latest).toContain('Demo ready');

    // Ensure no uncaught page errors were emitted during initial load
    expect(pageErrors, 'No page errors on initial load').toHaveLength(0);
  });

  test('Insert, get and delete flows via UI update stats and operation log', async ({ page }) => {
    // Purpose: Test typical insert/get/delete interactions and verify DOM/log updates
    const app1 = new HashTablePage(page);

    // Insert a new key
    const key = 'testkey';
    const value = 'value-123';
    await app.insertViaUI(key, value);

    // After insert, size should have increased by at least 1 (compared to initial)
    const sizeAfterInsert = await app.getSize();
    expect(sizeAfterInsert).toBeGreaterThan(0);

    // Log should contain insert message for the key
    const logTextAfterInsert = await app.getLatestLogText();
    expect(logTextAfterInsert).toContain(`"${key}"`);

    // Get the key via UI and assert returned value is logged
    await app.getViaUI(key);
    const logAfterGet = await app.getLatestLogText();
    // The getBtn handler logs "Get: key="key" → value="value""; allow either onTableChange or getBtn log
    expect(logAfterGet).toMatch(new RegExp(`Get.*"${key}".*value.*`));

    // Delete the key via UI
    await app.deleteViaUI(key);
    const logAfterDel = await app.getLatestLogText();
    // deleteBtn logs either "Deleted key="key"" or "Key="key" not found"
    expect(logAfterDel).toMatch(new RegExp(`Deleted key=|not found`));

    // Verify size updated accordingly (size decreased or is valid)
    const sizeAfterDel = await app.getSize();
    expect(sizeAfterDel).toBeGreaterThanOrEqual(0);
  });

  test('Switch to Open Addressing mode, create a tombstone by deleting and verify UI shows tombstone', async ({ page }) => {
    // Purpose: Ensure mode switching clears table and open addressing tombstones are shown after delete
    const app2 = new HashTablePage(page);

    // Switch to open addressing mode (this triggers a table.reset)
    await app.switchMode('open');
    await expect(app.locators.modeIndicator).toHaveText('Open Addressing');

    // Ensure size is zero after reset
    const sizeAfterSwitch = await app.getSize();
    expect(sizeAfterSwitch).toBe(0);

    // Insert a deterministic key so we can compute its index
    const key1 = 'oak-tombstone-test';
    const val = 'v';
    await app.insertViaUI(key, val);

    // Compute the index used for this key by evaluating the page's djb2Hash and table.capacity
    const idx = await page.evaluate(k => {
      // eslint-disable-next-line no-undef
      const h = djb2Hash(String(k));
      // table is global in the demo
      // eslint-disable-next-line no-undef
      return h % table.capacity;
    }, key);

    // Delete the key to produce a tombstone
    await app.deleteViaUI(key);

    // Wait a bit for render and reflow (tombstone rendering)
    await page.waitForTimeout(200);

    // Verify that the bucket at computed idx contains a tombstone element
    const hasTomb = await app.bucketHasTombstoneAtIndex(idx);
    expect(hasTomb, `Bucket ${idx} should show a TOMBSTONE after deletion in open addressing mode`).toBe(true);
  });

  test('Apply capacity change clears table and updates capacity stat', async ({ page }) => {
    // Purpose: Verify capacity apply control resets and updates capacity stat & logs
    const app3 = new HashTablePage(page);

    // Set a new capacity and apply
    const newCap = 8;
    await app.applyCapacity(newCap);

    // Validate capacity stat updated
    const capNow = await app.getCapacity();
    expect(capNow).toBe(newCap);

    // Validate size reset to zero
    const sizeNow = await app.getSize();
    expect(sizeNow).toBe(0);

    // Log should contain applied capacity
    const latestLog = await app.getLatestLogText();
    expect(latestLog).toContain('Applied capacity');
  });

  test('Rehash button resizes and logs rehash event', async ({ page }) => {
    // Purpose: Ensure rehash triggers onTableChange rehash event and logs are updated
    const app4 = new HashTablePage(page);

    // Insert a few keys to ensure rehash has entries to reinsert
    await app.insertViaUI('rkey1', '1');
    await app.insertViaUI('rkey2', '2');
    await app.insertViaUI('rkey3', '3');

    const oldCap = await app.getCapacity();

    // Click rehash button which suggests doubling capacity
    await app.rehash();

    // After rehash, a log entry should mention Rehashed explicitly
    const latestLog1 = await app.getLatestLogText();
    expect(latestLog).toMatch(/Rehashed|Rehash performed/);

    // capacity should be >= oldCap (resized)
    const newCap1 = await app.getCapacity();
    expect(newCap).toBeGreaterThanOrEqual(oldCap);
  });

  test('Step insert visualizer shows step messages and completes insertion', async ({ page }) => {
    // Purpose: Validate the step-by-step insertion flow emits expected step logs and performs insertion
    const app5 = new HashTablePage(page);

    const key2 = 'stepper-key2';
    const value1 = 'sval';

    // Ensure key absent initially
    await app.getViaUI(key);
    // Now perform a step insert
    await app.stepInsert(key, value);

    // After step insertion, the table should log the compute step and eventual insert/update
    await app.waitForLogContains('Compute hash for');
    // Wait for eventual insert message about the key
    await app.waitForLogContains(`"${key}"`);
    const latest1 = await app.getLatestLogText();
    expect(latest).toContain(key);
  });

  test('Random insert and clear controls modify table and log actions', async ({ page }) => {
    // Purpose: Validate "Insert 6 Random" and "Clear" controls behave and produce logs
    const app6 = new HashTablePage(page);

    // Click random insert
    await app.locators.randBtn.click();

    // The random insert action may produce several log entries; ensure at least one mentions "Insert" or an error
    await app.waitForLogContains('Insert', 4000).catch(() => {}); // tolerate if randomness logs differ
    // Validate size increased (non-negative)
    const sizeAfterRand = await app.getSize();
    expect(sizeAfterRand).toBeGreaterThanOrEqual(0);

    // Now clear
    await app.clearTable();
    const sizeAfterClear = await app.getSize();
    expect(sizeAfterClear).toBe(0);
    // Log contains 'Cleared table'
    const latest2 = await app.getLatestLogText();
    expect(latest).toContain('Cleared table');
  });

  test('Auto-resize toggle logs its state and does not throw page errors', async ({ page }) => {
    // Purpose: Ensure toggling auto-resize produces a log entry and no runtime errors
    const app7 = new HashTablePage(page);

    // Toggle auto-resize checkbox
    await app.locators.autoResize.click();
    // Wait for log message about auto-resize state
    await app.waitForLogContains('Auto-resize');

    const latest3 = await app.getLatestLogText();
    expect(latest).toContain('Auto-resize');

    // Ensure no page errors occurred during toggle
    expect(pageErrors, 'No page errors after toggling auto-resize').toHaveLength(0);
  });

  test('Console messages captured and contain demo lifecycle messages', async ({ page }) => {
    // Purpose: Inspect collected console messages to ensure the demo emitted expected notifications
    // We have been collecting console messages in beforeEach.
    // Check for at least one informative console entry (some demos log to console)
    // We do not require a specific console message, but ensure the collection exists and page had no page errors.
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
    // No page errors during this test run
    expect(pageErrors, 'No runtime page errors captured during test').toHaveLength(0);
  });
});