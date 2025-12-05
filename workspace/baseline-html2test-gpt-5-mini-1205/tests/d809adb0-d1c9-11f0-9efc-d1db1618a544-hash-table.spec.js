import { test, expect } from '@playwright/test';

// Test file: d809adb0-d1c9-11f0-9efc-d1db1618a544-hash-table.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d809adb0-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object to encapsulate common interactions and queries
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs and buttons
    this.keyInput = page.locator('#keyInput');
    this.valInput = page.locator('#valInput');
    this.insertBtn = page.locator('#insertBtn');
    this.searchBtn = page.locator('#searchBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.sizeInput = page.locator('#sizeInput');
    this.resizeBtn = page.locator('#resizeBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.autoResize = page.locator('#autoResize');
    this.threshold = page.locator('#threshold');

    // Status elements
    this.bucketsCount = page.locator('#bucketsCount');
    this.elemsCount = page.locator('#elemsCount');
    this.collisionsCount = page.locator('#collisionsCount');
    this.loadFactor = page.locator('#loadFactor');

    // Visual area and log
    this.buckets = page.locator('#buckets');
    this.log = page.locator('#log');
  }

  // Helpers
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async fillKeyVal(key, value) {
    await this.keyInput.fill(key);
    await this.valInput.fill(value);
  }

  async clickInsert() {
    await this.insertBtn.click();
  }

  async clickSearch() {
    await this.searchBtn.click();
  }

  async clickDelete() {
    await this.deleteBtn.click();
  }

  async clickResize() {
    await this.resizeBtn.click();
  }

  async clickRandom() {
    await this.randomBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async setSize(n) {
    await this.sizeInput.fill(String(n));
  }

  async setThreshold(val) {
    await this.threshold.fill(String(val));
  }

  // Return locator for a node that contains key text (the .k span)
  nodeByKeyLocator(key) {
    // locate any .node element whose child .k has text equal to key
    return this.page.locator('.node').filter({ has: this.page.locator('.k', { hasText: key }) });
  }

  // Returns last log text (most recent is first child because log.prepend)
  lastLogText() {
    return this.log.locator('div').first().textContent();
  }

  // Count number of nodes with given key
  async hasKeyInDOM(key) {
    const locator = this.nodeByKeyLocator(key);
    return await locator.count() > 0;
  }
}

// Global listeners collections
let consoleErrors = [];
let pageErrors = [];

test.describe('Hash Table Interactive Demo — E2E', () => {
  // Setup a fresh page for each test and attach listeners to gather console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // capture console entries of type 'error'
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // capture unhandled page errors
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // navigate to the app
    const htPage = new HashTablePage(page);
    await htPage.goto();

    // Ensure basic UI elements are present before tests proceed
    await expect(htPage.keyInput).toBeVisible();
    await expect(htPage.insertBtn).toBeVisible();
    await expect(htPage.buckets).toBeVisible();
  });

  // After each test ensure there were no unexpected console/page errors.
  test.afterEach(async () => {
    // Assert that no uncaught page errors were emitted
    expect(pageErrors, `Expected no uncaught page errors, found: ${JSON.stringify(pageErrors)}`).toEqual([]);
    // Assert that there were no console.error messages
    expect(consoleErrors, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  test('Initial page load: seeded keys, stats and demo message present', async ({ page }) => {
    // Purpose: verify that the demo seeds some initial keys and updates the status area.
    const ht = new HashTablePage(page);

    // Buckets count should match default sizeInput value (8)
    await expect(ht.bucketsCount).toHaveText('8');

    // Elems count should reflect seeded entries (a, k, u, apple, banana) => 5
    await expect(ht.elemsCount).toHaveText('5');

    // Ensure at least one seeded key (e.g., "a") is present in the visual DOM
    const aNode = ht.nodeByKeyLocator('a');
    await expect(aNode).toHaveCountGreaterThan(0);

    // The log should contain the seeding informational message; verify presence
    const logText = await ht.log.textContent();
    expect(logText && logText.includes('Demo seeded with a few keys'), 'Expected demo seed log message').toBeTruthy();
  });

  test('Insert a new key updates DOM, counts and log', async ({ page }) => {
    // Purpose: test inserting a new key via inputs and the Insert button
    const ht = new HashTablePage(page);

    const initialElemsText = await ht.elemsCount.textContent();
    const initialElems = Number(initialElemsText || '0');

    await ht.fillKeyVal('testkey', '123');
    await ht.clickInsert();

    // After insertion, elements count should increment by 1
    await expect(ht.elemsCount).toHaveText(String(initialElems + 1));

    // The new key should appear in the DOM
    await expect(ht.nodeByKeyLocator('testkey')).toHaveCountGreaterThan(0);

    // Log should include insertion message for "testkey"
    const logContents = await ht.log.textContent();
    expect(logContents && logContents.includes('Inserted key "testkey"'), 'Insert log entry should exist').toBeTruthy();
  });

  test('Search existing key highlights node and logs found message', async ({ page }) => {
    // Purpose: test search functionality for a known seeded key ("apple")
    const ht = new HashTablePage(page);

    await ht.keyInput.fill('apple');
    await ht.clickSearch();

    // Expect a log entry indicating the key was found
    await expect(ht.log).toContainText('Found key "apple"');

    // The rendered .node for "apple" should receive the 'found' class (visual highlight)
    const appleNode = ht.nodeByKeyLocator('apple');
    await expect(appleNode).toHaveCountGreaterThan(0);
    // Check class attribute includes 'found' on at least one matched node
    const classAttr = await appleNode.first().getAttribute('class');
    expect(classAttr && classAttr.includes('found'), 'Expected apple node to include "found" class').toBeTruthy();
  });

  test('Search missing key logs not found message and indicates bucket', async ({ page }) => {
    // Purpose: validate search behavior for a non-existing key
    const ht = new HashTablePage(page);

    await ht.keyInput.fill('nonexistent_key_42');
    await ht.clickSearch();

    // Expect an error-style log indicating not found
    await expect(ht.log).toContainText('Key "nonexistent_key_42" not found');
  });

  test('Delete an existing key removes it from DOM and updates counts', async ({ page }) => {
    // Purpose: test deletion of an existing seeded key ("banana")
    const ht = new HashTablePage(page);

    // Ensure banana exists first
    const bananaLocator = ht.nodeByKeyLocator('banana');
    await expect(bananaLocator).toHaveCountGreaterThan(0);

    const beforeElems = Number(await ht.elemsCount.textContent() || '0');

    await ht.keyInput.fill('banana');
    await ht.clickDelete();

    // Expect log entry for removal
    await expect(ht.log).toContainText('Removed key "banana"');

    // Elements count should decrement by 1
    await expect(ht.elemsCount).toHaveText(String(beforeElems - 1));

    // Node with key banana should no longer be present
    await expect(ht.nodeByKeyLocator('banana')).toHaveCount(0);
  });

  test('Clear button empties table, resets counts and logs message', async ({ page }) => {
    // Purpose: verify clear functionality
    const ht = new HashTablePage(page);

    await ht.clickClear();

    // After clearing, elements and collisions should be zero
    await expect(ht.elemsCount).toHaveText('0');
    await expect(ht.collisionsCount).toHaveText('0');

    // The visual bucket chain should show '(empty)' entries
    // There should be at least one node with text content '(empty)'
    const anyEmpty = ht.page.locator('.node', { hasText: '(empty)' });
    await expect(anyEmpty).toHaveCountGreaterThan(0);

    // Log should include 'Table cleared'
    await expect(ht.log).toContainText('Table cleared');
  });

  test('Resize table via input triggers rehash and updates bucket count', async ({ page }) => {
    // Purpose: test manual resizing and rehash logging
    const ht = new HashTablePage(page);

    // Ensure table is cleared to make counting straightforward
    await ht.clickClear();
    await expect(ht.elemsCount).toHaveText('0');

    // Resize to 4
    await ht.setSize(4);
    await ht.clickResize();

    // Expect buckets count to update to 4
    await expect(ht.bucketsCount).toHaveText('4');

    // Log should include the rehash confirmation
    await expect(ht.log).toContainText('Table rehashed to new capacity: 4');
  });

  test('Auto-resize triggers when load factor exceeds threshold', async ({ page }) => {
    // Purpose: confirm auto-resize doubles capacity when threshold exceeded
    const ht = new HashTablePage(page);

    // Clear and set a small capacity to make auto-resize predictable
    await ht.clickClear();
    await ht.setSize(2);
    await ht.clickResize();
    await expect(ht.bucketsCount).toHaveText('2');

    // Ensure autoResize checkbox is checked (default true); set threshold to 0.5
    await expect(ht.autoResize).toBeChecked();
    await ht.setThreshold('0.5');

    // Insert two distinct keys to exceed load factor (size 2 / capacity 2 = 1 > 0.5)
    await ht.fillKeyVal('r1', '1');
    await ht.clickInsert();
    await ht.fillKeyVal('r2', '2');
    await ht.clickInsert();

    // The app logs an auto-resize message before rehash; wait for that log entry
    await expect(ht.log).toContainText('Auto-resizing to');

    // The rehash occurs asynchronously after 250ms; wait until bucketsCount increases (becomes 4)
    await expect(ht.bucketsCount).toHaveText('4', { timeout: 2000 });

    // Also confirm a rehash log line appears
    await expect(ht.log).toContainText('Table rehashed to new capacity: 4');
  });

  test('Random Insert button adds multiple entries', async ({ page }) => {
    // Purpose: verify random insertion adds multiple items to the table
    const ht = new HashTablePage(page);

    // Clear table first
    await ht.clickClear();
    await expect(ht.elemsCount).toHaveText('0');

    // Click Random (inserts 10 items)
    await ht.clickRandom();

    // After clicking, expect elements count to be at least 10 (should be exactly 10 when starting from 0)
    await expect(ht.elemsCount).toHaveText(/\d+/); // numeric
    const count = Number(await ht.elemsCount.textContent() || '0');
    expect(count >= 10, `Expected at least 10 elements after random insertion, got ${count}`).toBeTruthy();
  });

  test('Pressing Enter on inputs triggers insert (keyboard interaction)', async ({ page }) => {
    // Purpose: ensure Enter key triggers the Insert action when focused in inputs
    const ht = new HashTablePage(page);

    // Clear table to avoid interfering counts
    await ht.clickClear();
    await expect(ht.elemsCount).toHaveText('0');

    // Fill the key and value then press Enter on value input (event handler ties Enter to insert)
    await ht.keyInput.fill('enterKey');
    await ht.valInput.fill('55');
    await ht.valInput.press('Enter');

    // Element should be inserted
    await expect(ht.nodeByKeyLocator('enterKey')).toHaveCountGreaterThan(0);
    await expect(ht.elemsCount).toHaveText('1');

    // Log should contain insertion message
    await expect(ht.log).toContainText('Inserted key "enterKey"');
  });

  test('Edge case: inserting empty key produces an error log', async ({ page }) => {
    // Purpose: validate error handling when inserting with empty key
    const ht = new HashTablePage(page);

    // Ensure key input is empty
    await ht.keyInput.fill('');
    await ht.valInput.fill('whatever');
    await ht.clickInsert();

    // An error log should indicate to enter a non-empty key
    await expect(ht.log).toContainText('Please enter a non-empty key');
  });
});