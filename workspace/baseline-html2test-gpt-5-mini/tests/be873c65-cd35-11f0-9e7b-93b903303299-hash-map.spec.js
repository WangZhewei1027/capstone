import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be873c65-cd35-11f0-9e7b-93b903303299.html';

// Page object helper for the Hash Map demo
class HashMapPage {
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.putBtn = page.locator('#putBtn');
    this.getBtn = page.locator('#getBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.fillBtn = page.locator('#fillBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.forceResizeBtn = page.locator('#forceResizeBtn');
    this.speed = page.locator('#speed');
    this.stepMode = page.locator('#stepMode');
    this.capacityEl = page.locator('#capacity');
    this.sizeEl = page.locator('#size');
    this.loadEl = page.locator('#load');
    this.thresholdEl = page.locator('#threshold');
    this.buckets = page.locator('#buckets .bucket');
    this.log = page.locator('#log');
    this.source = page.locator('#source');
  }

  // helper to click Put with specified key/value
  async putKeyValue(key, value) {
    await this.keyInput.fill(String(key));
    await this.valueInput.fill(String(value));
    await this.putBtn.click();
    // after put, UI updates size and buckets; wait for some log message indicating completion
    await this.page.waitForTimeout(50); // small wait for async highlights to start/finish
  }

  async getKey(key) {
    await this.keyInput.fill(String(key));
    await this.getBtn.click();
  }

  async deleteKey(key) {
    await this.keyInput.fill(String(key));
    await this.deleteBtn.click();
  }

  // find a node element containing the given key text
  nodeByKey(key) {
    return this.page.locator('.node .k', { hasText: String(key) }).locator('..'); // parent .node
  }

  // returns the bucket element by index
  bucketByIndex(idx) {
    return this.page.locator(`.bucket[data-index="${idx}"]`);
  }

  // read numeric stats
  async getStats() {
    const capacity = Number((await this.capacityEl.textContent()).trim());
    const size = Number((await this.sizeEl.textContent()).trim());
    const load = Number((await this.loadEl.textContent()).trim());
    const threshold = Number((await this.thresholdEl.textContent()).trim());
    return { capacity, size, load, threshold };
  }
}

test.describe('Hash Map Interactive Demo - be873c65-cd35-11f0-9e7b-93b903303299', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // collect console messages and page errors for assertions
    pageErrors = [];
    consoleMessages = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // navigate to the app
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }) => {
    // Wait a tiny bit to allow any asynchronous highlights or logs to complete
    await page.waitForTimeout(50);

    // Assert there are no uncaught page errors (ReferenceError, TypeError, SyntaxError, etc.)
    // This checks that the runtime did not throw unexpected exceptions during the test.
    expect(pageErrors, 'No page errors should have been thrown').toEqual([]);

    // Assert there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors, 'No console.error messages expected').toEqual([]);
  });

  test('Initial load - page renders and default stats are correct', async ({ page }) => {
    const hm = new HashMapPage(page);

    // Verify the title is present
    await expect(page.locator('h1')).toHaveText('Hash Map — Interactive Demonstration');

    // Verify default stats: capacity 8, size 0, load 0.00, threshold 0.75
    await expect(hm.capacityEl).toHaveText('8');
    await expect(hm.sizeEl).toHaveText('0');
    await expect(hm.loadEl).toHaveText('0.00');
    await expect(hm.thresholdEl).toHaveText('0.75');

    // There should be 8 buckets rendered, each showing "(empty)"
    await expect(hm.buckets).toHaveCount(8);
    const emptyNodes = page.locator('#buckets .bucket .small-muted', { hasText: '(empty)' });
    await expect(emptyNodes).toHaveCount(8);

    // The source code pre should contain the class name "HashMap"
    await expect(hm.source).toContainText('class HashMap');

    // Log area should be present (may be empty)
    await expect(hm.log).toBeVisible();
  });

  test('Put a key-value pair updates DOM, stats, and shows Put log', async ({ page }) => {
    const hm1 = new HashMapPage(page);

    // Insert 'apple' -> 'red' using the UI
    await hm.putKeyValue('apple', 'red');

    // After insertion, size should be 1 and load updated
    await expect(hm.sizeEl).toHaveText('1');

    // A node with key 'apple' should exist and show the value 'red'
    const node = hm.nodeByKey('apple');
    await expect(node).toBeVisible();
    await expect(node.locator('.v')).toHaveText('red');

    // The log should contain the Put message; check partial text
    await expect(hm.log).toContainText('Put: apple -> red');

    // Clicking the node should attempt to copy and update the log with a "Copied" message (success or failure)
    await node.click();
    await expect(hm.log).toContainText('Copied');
  });

  test('Get existing and non-existing keys show appropriate log and highlights', async ({ page }) => {
    const hm2 = new HashMapPage(page);

    // Insert a key first
    await hm.putKeyValue('pear', 'green');

    // Get the existing key
    await hm.getKey('pear');
    // Expect the log to show the retrieved value
    await expect(hm.log).toContainText('Get: "pear" -> "green"').catch(async () => {
      // Sometimes formatting may differ; ensure it contains Get and the value
      await expect(hm.log).toContainText('Get:');
      await expect(hm.log).toContainText('green');
    });

    // Now try getting a key that does not exist
    await hm.getKey('nonexistent_key_12345');
    await expect(hm.log).toContainText('not found');
  });

  test('Delete an existing key removes node and updates stats; deleting missing key shows not found', async ({ page }) => {
    const hm3 = new HashMapPage(page);

    // Insert two keys
    await hm.putKeyValue('k1', 'v1');
    await hm.putKeyValue('k2', 'v2');

    // Ensure size is 2
    await expect(hm.sizeEl).toHaveText('2');

    // Delete k1
    await hm.deleteKey('k1');
    // Log should indicate deletion
    await expect(hm.log).toContainText('Deleted key "k1"');

    // Size should decrement to 1
    await expect(hm.sizeEl).toHaveText('1');

    // The node for k1 should no longer exist
    await expect(hm.nodeByKey('k1')).toHaveCount(0);

    // Deleting a non-existent key should show "not found" in log
    await hm.deleteKey('no-such-key');
    await expect(hm.log).toContainText('not found');
  });

  test('Clear button resets the map to initial capacity and empties buckets', async ({ page }) => {
    const hm4 = new HashMapPage(page);

    // Insert some entries
    await hm.putKeyValue('a', '1');
    await hm.putKeyValue('b', '2');
    await expect(hm.sizeEl).toHaveText('2');

    // Click Clear
    await hm.clearBtn.click();

    // After clear, size should be 0 and capacity reset to 8
    await expect(hm.sizeEl).toHaveText('0');
    await expect(hm.capacityEl).toHaveText('8');

    // All buckets should show (empty)
    const emptyNodes1 = page.locator('#buckets .bucket .small-muted', { hasText: '(empty)' });
    await expect(emptyNodes).toHaveCount(8);

    // Log should indicate cleared
    await expect(hm.log).toContainText('Cleared map');
  });

  test('Fill sample entries populates multiple buckets and updates size; force resize doubles capacity', async ({ page }) => {
    const hm5 = new HashMapPage(page);

    // Ensure clean state
    await hm.clearBtn.click();

    // Click Fill with sample entries (this runs async series of puts)
    await hm.fillBtn.click();

    // Wait for the expected number of sample entries to be inserted (12 samples)
    await page.waitForFunction(() => {
      const el = document.getElementById('size');
      return el && Number(el.textContent) >= 12;
    }, null, { timeout: 5000 });

    // Verify size shows at least 12
    const stats = await hm.getStats();
    expect(stats.size).toBeGreaterThanOrEqual(12);

    // Now force resize and verify capacity doubles from current capacity
    const prevCapacity = stats.capacity;
    await hm.forceResizeBtn.click();

    // After clicking, capacity element should reflect doubled capacity
    await expect(hm.capacityEl).toHaveText(String(prevCapacity * 2));

    // Log should mention forced resize
    await expect(hm.log).toContainText('Forced resize to capacity');
  });

  test('Random inserts add entries and update bucket contents; copy attempt logs result', async ({ page }) => {
    const hm6 = new HashMapPage(page);

    // Ensure starting fresh
    await hm.clearBtn.click();

    // Click "Insert random 20"
    await hm.randomBtn.click();

    // Wait until size is > 0 (random insertion is asynchronous)
    await page.waitForFunction(() => {
      const el1 = document.getElementById('size');
      return el && Number(el.textContent) > 0;
    }, null, { timeout: 5000 });

    // Ensure at least one .node exists in DOM
    const nodes = page.locator('#buckets .node');
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);

    // Click the first node to trigger the copy handler and check log message contains "Copied"
    await nodes.first().click();
    await expect(hm.log).toContainText('Copied');
  });

  test('Keyboard Enter triggers Put when focus is on input', async ({ page }) => {
    const hm7 = new HashMapPage(page);

    // Ensure clean state
    await hm.clearBtn.click();

    // Fill key and value and press Enter (keyboard)
    await hm.keyInput.fill('enterKey');
    await hm.valueInput.fill('enterVal');

    // Focus on valueInput and press Enter - should trigger put
    await hm.valueInput.focus();
    await page.keyboard.press('Enter');

    // Size should update to 1
    await expect(hm.sizeEl).toHaveText('1');

    // Node should be present
    await expect(hm.nodeByKey('enterKey')).toBeVisible();
  });
});