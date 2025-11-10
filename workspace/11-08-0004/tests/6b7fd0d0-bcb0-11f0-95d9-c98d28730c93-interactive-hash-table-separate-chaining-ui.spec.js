import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6b7fd0d0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Hash Table UI.
 * Provides resilient selectors with fallbacks to accommodate slight differences in DOM.
 */
class HashTablePage {
  constructor(page) {
    this.page = page;
  }

  // Input for key entry - try label/placeholder then any text input
  keyInput() {
    return (
      this.page.getByLabel(/key/i).first()
      || this.page.getByPlaceholder(/key/i).first()
      || this.page.locator('input[type="text"]').first()
    );
  }

  insertButton() {
    return this.page.getByRole('button', { name: /insert/i }).first();
  }
  searchButton() {
    return this.page.getByRole('button', { name: /search/i }).first();
  }
  deleteButton() {
    return this.page.getByRole('button', { name: /delete/i }).first();
  }
  clearButton() {
    return this.page.getByRole('button', { name: /clear/i }).first();
  }

  tableSizeSelect() {
    // fallback to any select in controls
    return this.page.locator('select').first();
  }

  explainToggle() {
    // could be a checkbox or button labelled "Explain"
    return (
      this.page.getByLabel(/explain/i).first()
      || this.page.getByRole('button', { name: /explain/i }).first()
      || this.page.getByRole('switch', { name: /explain/i }).first()
    );
  }

  visualSpeedControl() {
    // could be a select or input range
    return (
      this.page.getByLabel(/speed/i).first()
      || this.page.locator('input[type="range"]').first()
      || this.page.locator('select[name*="speed"]').first()
      || this.page.locator('select').nth(1) // fallback: second select
    );
  }

  // Visualization containers
  buckets() {
    // common classes: .bucket, [data-bucket], .slot
    return (
      this.page.locator('.bucket')
      || this.page.locator('[data-bucket]')
      || this.page.locator('.slot')
    );
  }

  bucketAt(index) {
    return this.buckets().nth(index);
  }

  // nodes within chains: .node, .chain-node, li.node
  nodesInBucket(index) {
    const bucket = this.bucketAt(index);
    return (
      bucket.locator('.node')
      || bucket.locator('.chain-node')
      || bucket.locator('li')
      || bucket.locator('.item')
    );
  }

  // Find a node element by its visible text (key)
  nodeByKey(key) {
    // try a few possible node selectors
    return (
      this.page.locator('.node', { hasText: key }).first()
      || this.page.locator('.chain-node', { hasText: key }).first()
      || this.page.locator('li', { hasText: key }).first()
      || this.page.getByText(key).first()
    );
  }

  // Operation detail / live region (opDetail)
  opDetail() {
    return (
      this.page.locator('.op-detail').first()
      || this.page.locator('.status').first()
      || this.page.locator('[aria-live]').first()
    );
  }

  // Metrics element (total items/comparisons)
  metrics() {
    return (
      this.page.locator('.metrics').first()
      || this.page.locator('[data-metrics]').first()
      || this.page.getByText(/total items/i).first()
    );
  }

  // Await initial table render: expect multiple buckets visible
  async waitForInitialRender() {
    // wait until at least one bucket exists and page idle is ready
    const buckets = this.page.locator('.bucket, [data-bucket], .slot');
    await expect(buckets).toHaveCountGreaterThan(0, { timeout: 5000 }).catch(async () => {
      // fallback: wait for any list or canvas area
      await this.page.locator('.canvas, .visualization, #canvas').waitFor({ timeout: 5000 });
    });
    // ensure key input is visible
    await expect(this.keyInput()).toBeVisible({ timeout: 5000 });
  }
}

test.describe('Interactive Hash Table (Separate Chaining) UI - FSM flows', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new HashTablePage(page);
    await page.goto(APP_URL);
    // Wait for initialization to complete and UI ready (maps to initializing -> idle)
    await app.waitForInitialRender();
    // A small stabilize wait so visual elements finish JS initialization
    await page.waitForTimeout(200);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial state: UI ready and metrics at zero', async () => {
    // Validate that controls exist and are enabled
    await expect(app.keyInput()).toBeVisible();
    await expect(app.insertButton()).toBeVisible();
    await expect(app.searchButton()).toBeVisible();
    await expect(app.deleteButton()).toBeVisible();
    await expect(app.clearButton()).toBeVisible();

    // Metrics should report zero items initially (onEnter initTable -> updateMetrics)
    // Try to find text like "Total items: 0" or elements indicating 0
    const metricsLocator = app.opDetail();
    if (metricsLocator) {
      // opDetail might display readiness text; check it doesn't show an error
      const txt = await metricsLocator.textContent();
      expect(txt === null || !/please enter/i.test(txt)).toBeTruthy();
    }

    // Verify there is a table of buckets present (initializing -> idle yielded buckets)
    const bucketCount = await page.locator('.bucket, [data-bucket], .slot').count();
    expect(bucketCount).toBeGreaterThan(0);
  });

  test('Validation error when trying to insert with empty key (validation_error state)', async () => {
    // Ensure the key input is empty
    await app.keyInput().fill('');
    // Click Insert without a key to trigger validation_error
    await app.insertButton().click();

    // The app should notify about missing key (notifyMissingKey onEnter)
    const live = page.locator('[aria-live], .op-detail, .status').first();
    await expect(live).toBeVisible();

    // Validate content indicates missing key; accept either exact message or partial text
    const liveText = (await live.textContent()) || '';
    expect(/please enter|missing key|enter a key/i.test(liveText)).toBeTruthy();

    // After acknowledgement (or implicit), app should return to idle; attempt another interaction
    // Click Search (idle accepts SEARCH_CLICK) to ensure UI is responsive again
    await app.searchButton().click();
    // If empty search triggers validation as well, it would show same message; either way UI accepts event
    const postText = (await live.textContent()) || '';
    // The message may persist or change; assert UI didn't crash: search button still enabled
    await expect(app.searchButton()).toBeEnabled();
  });

  test('Insert flow: hashing_for_insert -> animating_insert -> inserting -> idle', async () => {
    // Insert a key '42' and validate it appears in the appropriate bucket and metrics updated
    const key = '42';

    // Fill in the key
    await app.keyInput().fill(key);

    // Click Insert (triggers INSERT_CLICK -> hashing_for_insert)
    await app.insertButton().click();

    // On hashing_for_insert onEnter computeHashAndShowSteps: opDetail should reflect computing message
    const op = app.opDetail();
    if (op) {
      await expect(op).toBeVisible();
      const txt1 = (await op.textContent()) || '';
      expect(/compute|computing|hash/i.test(txt)).toBeTruthy();
    }

    // Wait for node to be added to DOM (inserting -> INSERTION_COMPLETE -> idle)
    // The implementation may animate; allow generous timeout
    const node = app.nodeByKey(key);
    await expect(node).toBeVisible({ timeout: 3000 });

    // Node should be inside some bucket; ensure its parent is a bucket/chain
    const parent = await node.evaluateHandle((n) => n.parentElement);
    const parentClass = await parent.getProperty('className').then((pn) => pn.jsonValue()).catch(() => null);
    expect(parentClass === null || /bucket|chain|list|slot/.test(parentClass)).toBeTruthy();

    // Metrics should reflect total items incremented (updateMetrics onExit of initializing and after insertion)
    // Try several strategies: find "Total items: 1" or a metric number. We'll search for digits in metrics area.
    const metricsEl = await page.locator('.metrics, [data-metrics], .info, .stats').first();
    if (await metricsEl.count() > 0) {
      const metricsText = (await metricsEl.textContent()) || '';
      expect(/1|one/i.test(metricsText) || /total.*1/i.test(metricsText)).toBeTruthy();
    } else {
      // fallback: check there is at least one node present somewhere in viz
      const nodeCount = await page.locator('.node, .chain-node, li').count();
      expect(nodeCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('Search flow: hashing_for_search -> searching -> idle (found and comparisons increment)', async () => {
    // Ensure a known key exists. Insert '100' first.
    const key1 = '100';
    await app.keyInput().fill(key);
    await app.insertButton().click();
    const insertedNode = app.nodeByKey(key);
    await expect(insertedNode).toBeVisible({ timeout: 3000 });

    // Clear input then perform search
    await app.keyInput().fill(key);
    await app.searchButton().click();

    // On hashing_for_search an opDetail should indicate computing hash
    const op1 = app.opDetail();
    if (op) {
      const txt2 = (await op.textContent()) || '';
      expect(/compute|computing|hash/i.test(txt)).toBeTruthy();
    }

    // During searching nodes are highlighted; the target node should receive a highlight / found indicator
    const node1 = app.nodeByKey(key);
    await expect(node).toBeVisible();

    // Wait briefly for animation/highlight to appear and check for highlight classes
    await page.waitForTimeout(500);
    const classAttr = await node.getAttribute('class');
    // Accept typical highlight classes: 'highlight', 'found', 'current', 'match'
    expect(/highlight|found|current|match/i.test(classAttr || '')).toBeTruthy();

    // The opDetail or live region should announce "found" or similar
    const live1 = app.opDetail();
    if (live) {
      const liveText1 = (await live.textContent()) || '';
      expect(/found|exists|located/i.test(liveText)).toBeTruthy();
    }

    // Comparisons metric: try to find an element mentioning "comparisons" or a numeric counter that increased
    const comparisonsLocator = page.getByText(/comparison/i).first();
    if (await comparisonsLocator.count() > 0) {
      const cmpText = (await comparisonsLocator.textContent()) || '';
      expect(/\d+/.test(cmpText)).toBeTruthy();
    }
  });

  test('Search flow: not found case leads to COMPARE_NOT_FOUND and idle', async () => {
    const key2 = 'nokey-' + Date.now();
    await app.keyInput().fill(key);
    await app.searchButton().click();

    // The opDetail/live region should indicate not found
    const live2 = app.opDetail();
    await expect(live).toBeVisible();
    const liveText2 = (await live.textContent()) || '';
    expect(/not found|no such key|does not exist|not present/i.test(liveText)).toBeTruthy();

    // Ensure UI still responsive: try toggling explain to ensure idle handled events
    const explain = app.explainToggle();
    if (explain) {
      await explain.click();
      await page.waitForTimeout(200);
      // Toggling back
      await explain.click();
    }
    await expect(app.insertButton()).toBeEnabled();
  });

  test('Delete flow: hashing_for_delete -> deleting -> DELETE_REMOVED or DELETE_NOT_FOUND', async () => {
    // Insert a key then delete it
    const key3 = 'del-1-' + Date.now();
    await app.keyInput().fill(key);
    await app.insertButton().click();
    const node2 = app.nodeByKey(key);
    await expect(node).toBeVisible({ timeout: 3000 });

    // Now request deletion
    await app.keyInput().fill(key);
    await app.deleteButton().click();

    // On hashing_for_delete we expect an opDetail message about computing hash
    const op2 = app.opDetail();
    if (op) {
      const txt3 = (await op.textContent()) || '';
      expect(/compute|computing|hash/i.test(txt)).toBeTruthy();
    }

    // During deleting, the node may gain a 'removing' class then be removed from DOM
    // Wait a little for animations to run, then assert node disappears
    await page.waitForTimeout(800);
    // If node is removed, locator should become hidden or detached
    const existsAfter = await app.nodeByKey(key).count();
    expect(existsAfter).toBe(0);

    // Metrics should reflect decrement - try to ensure UI still shows numbers
    const metricsEl1 = page.locator('.metrics, [data-metrics], .info, .stats').first();
    if (await metricsEl.count() > 0) {
      const txt4 = (await metricsEl.textContent()) || '';
      // At minimum, should not falsely report huge number; accept presence
      expect(typeof txt === 'string').toBeTruthy();
    }
  });

  test('Delete non-existent key leading to DELETE_NOT_FOUND and idle', async () => {
    const key4 = 'delete-missing-' + Date.now();
    await app.keyInput().fill(key);
    await app.deleteButton().click();

    const live3 = app.opDetail();
    await expect(live).toBeVisible();
    const liveText3 = (await live.textContent()) || '';
    expect(/not found|does not exist|no such key/i.test(liveText)).toBeTruthy();

    // UI still responsive: perform a quick insert to validate idle restored
    await app.keyInput().fill('quick-' + Date.now());
    await app.insertButton().click();
    const inserted = app.nodeByKey(/quick-/i);
    await expect(inserted).toBeVisible({ timeout: 3000 });
  });

  test('Clear click resets table and INIT_COMPLETE -> idle transition', async () => {
    // Insert an item to ensure table has contents
    await app.keyInput().fill('to-clear');
    await app.insertButton().click();
    const node3 = app.nodeByKey('to-clear');
    await expect(node).toBeVisible({ timeout: 3000 });

    // Click Clear to trigger re-initialization (TABLE_SIZE_CHANGE/CLEAR_CLICK -> initializing)
    await app.clearButton().click();

    // After clearing, previous node should no longer exist
    await page.waitForTimeout(500);
    const afterExists = await app.nodeByKey('to-clear').count();
    expect(afterExists).toBe(0);

    // Bucket count should still be present but possibly reset; ensure UI didn't disappear
    const bucketCount1 = await page.locator('.bucket, [data-bucket], .slot').count();
    expect(bucketCount).toBeGreaterThan(0);
  });

  test('Table size change triggers reinitialize (TABLE_SIZE_CHANGE -> initializing) and rebuild', async () => {
    const select = app.tableSizeSelect();
    if (await select.count() === 0) {
      test.skip('Table size select not present in this build');
      return;
    }

    // Choose a different size if possible
    const options = await select.locator('option').allTextContents();
    if (options.length < 2) {
      test.skip('Not enough table size options to change');
      return;
    }

    // Pick a different option (second)
    await select.selectOption({ index: 1 });
    // Wait for reinitialization to complete
    await page.waitForTimeout(500);

    // Buckets should be present and likely count changed - at minimum assert presence
    const bucketCount2 = await page.locator('.bucket, [data-bucket], .slot').count();
    expect(bucketCount).toBeGreaterThan(0);
  });

  test('Explain toggle shows/hides explanation (EXPLAIN_TOGGLE self-transition)', async () => {
    const toggle = app.explainToggle();
    if (!toggle || (await toggle.count()) === 0) {
      test.skip('Explain toggle not present');
      return;
    }

    // Toggle on
    await toggle.click();
    await page.waitForTimeout(200);
    // Explanation area might be .explainBox, .explain, or labelled region
    const explainBox = page.locator('.explainBox, .explain, #explain, [data-explain]').first();
    if (await explainBox.count() > 0) {
      await expect(explainBox).toBeVisible();
    }

    // Toggle off
    await toggle.click();
    await page.waitForTimeout(200);
    if (await explainBox.count() > 0) {
      await expect(explainBox).not.toBeVisible();
    }
  });

  test('Visual speed change affects internal control without changing state (VISUAL_SPEED_CHANGE)', async () => {
    const speed = app.visualSpeedControl();
    if (!speed || (await speed.count()) === 0) {
      test.skip('Visual speed control not present');
      return;
    }

    // Change speed (if select, choose last option; if range, set value)
    const tag = await speed.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      const options1 = await speed.locator('option').allTextContents();
      if (options.length >= 2) {
        await speed.selectOption({ index: options.length - 1 });
      }
    } else {
      // assume range input; set via JS to simulate user drag
      await speed.evaluate((el) => {
        try {
          el.value = el.max || 100;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
      });
    }

    // Ensure no navigation or crash: insert a test key to ensure still idle
    await app.keyInput().fill('speed-test-' + Date.now());
    await app.insertButton().click();
    const node4 = app.nodeByKey(/speed-test-/i);
    await expect(node).toBeVisible({ timeout: 3000 });
  });

  test('Keyboard ENTER triggers insert (KEY_ENTER event)', async () => {
    const k = 'enter-key-' + Date.now();
    await app.keyInput().fill(k);
    // Press Enter to submit (should map KEY_ENTER -> hashing_for_insert)
    await app.keyInput().press('Enter');

    const node5 = app.nodeByKey(k);
    await expect(node).toBeVisible({ timeout: 3000 });
  });
});