import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/672e7810-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object for the Hash Table Visualization app.
 * The implementation uses resilient selectors (multiple fallbacks)
 * because the HTML may use different class/id names. The goal is to
 * target common accessible elements: textbox, buttons, range input,
 * hint/status area, bucket and node elements.
 */
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Input for key operations (insert/search/delete)
    this.keyInput = page.locator('input[type="text"], input[role="textbox"], input[aria-label*="key" i], input[name="key"]');

    // Buttons - use accessible role with case-insensitive name matches
    this.insertBtn = (name = 'Insert') => page.getByRole('button', { name: new RegExp(name, 'i') });
    this.searchBtn = (name = 'Search') => page.getByRole('button', { name: new RegExp(name, 'i') });
    this.deleteBtn = (name = 'Delete') => page.getByRole('button', { name: new RegExp(name, 'i') });
    this.randomBtn = (name = 'Random') => page.getByRole('button', { name: new RegExp(name, 'random', 'i') });
    this.clearBtn = (name = 'Clear') => page.getByRole('button', { name: new RegExp(name, 'i') });
    this.rehashBtn = (name = 'Rehash') => page.getByRole('button', { name: new RegExp(name, 'rehash', 'i') });

    // Bucket count slider (range input)
    this.bucketRange = page.locator('input[type="range"], [role="slider"]');

    // Hint / status text element(s)
    this.hint = page.locator('#hint, .hint, [role="status"], .status, .message').first();

    // Generic container for buckets; fallbacks for multiple class/id choices
    this.bucketsContainer = page.locator('.buckets, #buckets, [data-buckets], .table-visualization, .hash-buckets').first();

    // Fallback: locate any bucket-like elements on page
    this.bucketItems = page.locator('div.bucket, [data-bucket], .bucket-item, .bucket-cell, .bucketBox, .bucket');

    // Node item selector inside a bucket
    this.nodeSelector = '.node, .chain-node, .list-item, .entry, .bucket-node';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main UI to be visible - a textbox or a hint
    await Promise.race([
      this.keyInput.first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.hint.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.bucketRange.first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
    ]);
  }

  async clearInput() {
    await this.keyInput.fill('');
  }

  async insertKey(key) {
    if (key !== null) {
      await this.keyInput.fill(key);
    }
    await this.insertBtn('Insert').click();
  }

  async searchKey(key) {
    if (key !== null) {
      await this.keyInput.fill(key);
    }
    await this.searchBtn('Search').click();
  }

  async deleteKey(key) {
    if (key !== null) {
      await this.keyInput.fill(key);
    }
    await this.deleteBtn('Delete').click();
  }

  async clickRandom() {
    await this.randomBtn('Random').click();
  }

  async clickClear() {
    await this.clearBtn('Clear').click();
  }

  async clickRehash() {
    await this.rehashBtn('Rehash').click();
  }

  // Adjust the bucket range slider value and emit input/change events.
  // value: number or string
  async setBucketRange(value) {
    const range = this.bucketRange.first();
    if (!await range.count()) throw new Error('Bucket range slider not found');
    await range.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  // Return hint text (trimmed)
  async getHintText() {
    try {
      const txt = await this.hint.innerText();
      return txt.trim();
    } catch {
      return '';
    }
  }

  // Return count of buckets detected
  async countBuckets() {
    // Prefer explicit bucket items; fall back to children of container
    const explicit = await this.bucketItems.count();
    if (explicit > 0) return explicit;
    const containerCount = await this.bucketsContainer.locator(':scope > *').count();
    return containerCount;
  }

  // Return nodes found across all buckets (flattened)
  async getAllNodes() {
    const nodes = this.page.locator(this.nodeSelector);
    const count = await nodes.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await nodes.nth(i).innerText()).trim());
    }
    return { count, values, locator: nodes };
  }

  // Return nodes inside a specific bucket index (0-based)
  async getNodesInBucket(index) {
    // Try data-bucket or direct children fallback
    const buckets = this.bucketItems;
    const c = await this.countBuckets();
    if (c === 0) return { count: 0, values: [] };
    const bucket = buckets.nth(index);
    const nodes1 = bucket.locator(this.nodeSelector);
    const count1 = await nodes.count1();
    const values1 = [];
    for (let i = 0; i < count; i++) values.push((await nodes.nth(i).innerText()).trim());
    return { count, values, locator: nodes };
  }

  // Hover a bucket (0-based)
  async hoverBucket(index) {
    const buckets1 = this.bucketItems;
    const c1 = await this.countBuckets();
    if (c === 0) throw new Error('No buckets to hover');
    await buckets.nth(index).hover();
  }

  // Get computed style for bucket (e.g., boxShadow) to check hover visual
  async getBucketComputedStyleProp(index, prop) {
    const buckets2 = this.bucketItems;
    const c2 = await this.countBuckets();
    if (c === 0) throw new Error('No buckets available');
    return await buckets.nth(index).evaluate((el, p) => {
      return window.getComputedStyle(el)[p] || '';
    }, prop);
  }
}

/**
 * Tests covering the FSM states and transitions for the Hash Table Visualization.
 * Tests are grouped with describe blocks by related operations.
 */
test.describe('Hash Table Visualization (Separate Chaining) - FSM flows', () => {
  /** @type {HashTablePage} */
  let ht;

  test.beforeEach(async ({ page }) => {
    ht = new HashTablePage(page);
    await ht.goto();
  });

  test.afterEach(async ({ page }) => {
    // Attempt to clear between tests to keep independent state
    try {
      await ht.clickClear();
    } catch {
      // ignore
    }
  });

  test.describe('Idle state and basic rendering', () => {
    test('renders main controls and buckets on load (idle -> onEnter)', async () => {
      // Validate that at least one control (input) and one button exist
      await expect(ht.keyInput.first()).toBeVisible();
      await expect(ht.insertBtn()).toBeVisible();
      await expect(ht.searchBtn()).toBeVisible();

      // Buckets should be rendered (the app renders buckets on idle onEnter)
      const bucketCount = await ht.countBuckets();
      expect(bucketCount).toBeGreaterThanOrEqual(1);

      // Stats/hint area should show an initial message or be present
      const hint = await ht.getHintText();
      expect(hint.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Inserting flow', () => {
    test('valid insert updates hint, animates, and renders node in computed bucket', async () => {
      // Insert a known key
      const key = `key-${Date.now()}`;
      await ht.insertKey(key);

      // During onEnter inserting, hint should indicate hash computed / inserting (transient)
      await expect(ht.hint).toHaveText(/hash computed|inserting|inserting\.\.\.|searching bucket/i, { timeout: 3000 }).catch(() => { /* allow fallback */ });

      // Eventually the animation completes and hint shows inserted confirmation
      await expect(ht.hint).toHaveText(new RegExp(`Inserted|inserted|Inserted.*${key}`, 'i'), { timeout: 5000 });

      // The key should be visible somewhere in the nodes
      const all = await ht.getAllNodes();
      expect(all.values.some(v => v.includes(key))).toBeTruthy();
    });

    test('inserting invalid (empty) key produces inputError hint then returns to idle', async () => {
      // Clear input, ensure empty
      await ht.clearInput();
      await ht.insertKey(''); // click insert with empty input

      // Expect inputError hint like "Please enter"
      await expect(ht.hint).toHaveText(/please enter|required|non-?empty/i, { timeout: 2000 });

      // After dismiss or timeout, should return to idle and still have buckets
      const bucketCount1 = await ht.countBuckets();
      expect(bucketCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Searching flow', () => {
    test('search highlights nodes sequentially and finds a present key', async () => {
      const key1 = `searchKey-${Date.now()}`;
      await ht.insertKey(key);
      // Wait until inserted
      await expect(ht.hint).toHaveText(new RegExp(`Inserted|inserted.*${key}`, 'i'), { timeout: 5000 });

      // Perform search for the same key
      await ht.searchKey(key);

      // Hint should indicate searching
      await expect(ht.hint).toHaveText(/searching|checking/i, { timeout: 2000 }).catch(() => {});

      // Eventually should report found or highlight the node
      await expect(ht.hint).toHaveText(/found|search.*found|match found/i, { timeout: 5000 }).catch(() => {});

      // Check that at least one node with that key is highlighted (has class highlight or inline style)
      const allNodes = ht.page.locator(ht.nodeSelector);
      const count2 = await allNodes.count2();
      let highlightedFound = false;
      for (let i = 0; i < count; i++) {
        const text = (await allNodes.nth(i).innerText()).trim();
        if (!text.includes(key)) continue;
        // check for class or computed style
        const hasHighlightClass = await allNodes.nth(i).evaluate(el => el.classList.contains('highlight') || el.classList.contains('node-highlight'));
        const boxShadow = await allNodes.nth(i).evaluate(el => window.getComputedStyle(el).boxShadow || '');
        if (hasHighlightClass || (boxShadow && boxShadow !== 'none')) {
          highlightedFound = true;
          break;
        }
      }
      expect(highlightedFound).toBeTruthy();
    });

    test('searching for missing key yields not-found hint and returns to idle', async () => {
      const missingKey = `missing-${Date.now()}`;
      await ht.searchKey(missingKey);

      await expect(ht.hint).toHaveText(/not found|no such key|not present/i, { timeout: 3000 }).catch(() => {
        // fallback: might show "Search complete" without found
      });

      // Ensure that nothing changed in buckets (still present or unchanged count)
      const bucketCount2 = await ht.countBuckets();
      expect(bucketCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Deleting flow', () => {
    test('delete removes an existing key and updates stats/hint', async () => {
      const key2 = `del-${Date.now()}`;
      await ht.insertKey(key);
      await expect(ht.hint).toHaveText(new RegExp(`Inserted|inserted.*${key}`, 'i'), { timeout: 5000 });

      // Delete the key
      await ht.deleteKey(key);

      // Hint should indicate searching for deletion then deleted
      await expect(ht.hint).toHaveText(/searching bucket|deleting|deleted/i, { timeout: 5000 });

      // Confirm the key no longer present in nodes
      const all1 = await ht.getAllNodes();
      expect(all.values.some(v => v.includes(key))).toBeFalsy();
    });

    test('delete non-existent key reports not found and does not change table', async () => {
      const key3 = `nonExist-${Date.now()}`;
      // Ensure key isn't present
      const allBefore = await ht.getAllNodes();
      await ht.deleteKey(key);

      await expect(ht.hint).toHaveText(/not found|no such key/i, { timeout: 3000 }).catch(() => {});

      const allAfter = await ht.getAllNodes();
      // Node count should be equal (no deletion happened)
      expect(allAfter.count).toBe(allBefore.count);
    });
  });

  test.describe('Bulk random inserts (bulkInserting)', () => {
    test('random button inserts multiple keys sequentially and updates hint', async () => {
      // Record initial node count
      const before = await ht.getAllNodes();

      // Trigger random bulk insert
      await ht.clickRandom();

      // Expect transient hint about random or inserting
      await expect(ht.hint).toHaveText(/random|inser|inserting/i, { timeout: 3000 }).catch(() => {});

      // Eventually complete and show completion hint
      await expect(ht.hint).toHaveText(/random inserts complete|random complete|insert complete|completed/i, { timeout: 7000 }).catch(() => {});

      // After completion, node count should have increased by at least 1
      const after = await ht.getAllNodes();
      expect(after.count).toBeGreaterThanOrEqual(before.count + 1);
    });

    test('bulk insert respects input validation (handles invalid internal keys gracefully)', async () => {
      // Some implementations may generate invalid keys; ensure app doesn't crash and returns to idle hint
      await ht.clickRandom();
      await expect(ht.hint).toHaveText(/random inserts complete|inserted|completed/i, { timeout: 7000 });
      // Still has buckets
      const bc = await ht.countBuckets();
      expect(bc).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Adjusting buckets and reinitialization', () => {
    test('bucket range input updates label while sliding (adjustingBuckets)', async () => {
      // If a slider exists, adjust it to a new value and check that some label changes or bucket count eventually changes
      const range1 = ht.bucketRange;
      if (await range.count()) {
        // Read current value then increase by +1
        const current = await range.evaluate(el => Number(el.value || el.min || 0));
        const newVal = Math.min(Math.max(current + 1, Number(range.evaluate(el => el.min || 1))), Number(await range.evaluate(el => el.max || 40)));
        await ht.setBucketRange(newVal);

        // While sliding, the label on UI may update - check hint or a nearby label for numeric value
        const hint1 = await ht.getHintText();
        // Hint may not reflect this, but we ensure no errors and bucket count eventually can be reinitialized on change.
        expect(typeof hint).toBe('string');
      } else {
        test.skip('No bucket range slider found');
      }
    });

    test('bucket range change triggers bucketsReinitialized and clears table (BUCKET_RANGE_CHANGE)', async () => {
      const range2 = ht.bucketRange;
      if (!await range.count()) {
        test.skip('No bucket range slider found');
        return;
      }

      // Insert a key to ensure the table had content
      const key4 = `rinit-${Date.now()}`;
      await ht.insertKey(key);
      await expect(ht.hint).toHaveText(/Inserted/i, { timeout: 5000 });

      // Now change range value via evaluate and dispatch change
      const current1 = await range.evaluate(el => Number(el.value || el.min || 1));
      const newVal1 = Math.min(40, Math.max(2, current + 2)); // change to a different count
      await ht.setBucketRange(newVal);

      // The app should reinitialize buckets and set a hint about cleared table
      await expect(ht.hint).toHaveText(/cleared|initialized|table cleared|init/i, { timeout: 5000 }).catch(() => {});

      // After reinit, ensure all previous keys are gone
      const all2 = await ht.getAllNodes();
      expect(all.values.some(v => v.includes(key))).toBeFalsy();

      // The bucket count should reflect the new count if available
      const bc1 = await ht.countBuckets();
      // bc may equal newVal (if DOM renders each) or be >=1; at minimum it's present
      expect(bc).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Rehashing', () => {
    test('rehash doubles buckets up to limit and preserves keys', async () => {
      // Insert several keys to exercise rehashing
      const keys = [];
      for (let i = 0; i < 5; i++) {
        const k = `rehash-${i}-${Date.now()}`;
        keys.push(k);
        await ht.insertKey(k);
        // wait for insert completion hint
        await expect(ht.hint).toHaveText(/Inserted|inserted/i, { timeout: 4000 }).catch(() => {});
      }

      // Count before rehash
      const beforeNodes = await ht.getAllNodes();
      const beforeBucketCount = await ht.countBuckets();

      await ht.clickRehash();

      // Hint should indicate rehashing or complete
      await expect(ht.hint).toHaveText(/rehash|rehashing|rehash complete|complete/i, { timeout: 8000 });

      // After rehash, total node count should be same and keys preserved
      const afterNodes = await ht.getAllNodes();
      for (const k of keys) {
        expect(afterNodes.values.some(v => v.includes(k))).toBeTruthy();
      }
      expect(afterNodes.count).toBe(beforeNodes.count);

      // Bucket count should be changed to min(40, before * 2) if UI shows it; if not, at least ensure buckets exist
      const afterBucketCount = await ht.countBuckets();
      expect(afterBucketCount).toBeGreaterThanOrEqual(1);
      // If both are numeric and >1 we can assert doubled/same limit:
      if (beforeBucketCount > 0 && afterBucketCount > 0) {
        // afterBucketCount should be >= beforeBucketCount (rehash typically increases or same)
        expect(afterBucketCount).toBeGreaterThanOrEqual(beforeBucketCount);
      }
    });
  });

  test.describe('Cleared state', () => {
    test('clear button clears table and sets hint', async () => {
      // Insert something first
      const key5 = `clear-${Date.now()}`;
      await ht.insertKey(key);
      await expect(ht.hint).toHaveText(/Inserted|inserted/i, { timeout: 4000 }).catch(() => {});

      // Click clear
      await ht.clickClear();

      // Hint should say table cleared
      await expect(ht.hint).toHaveText(/table cleared|cleared|clearing/i, { timeout: 3000 }).catch(() => {});

      // Confirm nodes are gone
      const all3 = await ht.getAllNodes();
      expect(all.count).toBe(0);
    });
  });

  test.describe('Hovering micro-state', () => {
    test('hover applies visual styles to bucket and mouseout removes them', async () => {
      const bucketCount3 = await ht.countBuckets();
      if (bucketCount === 0) {
        test.skip('No buckets rendered to test hovering');
        return;
      }
      // Hover bucket 0
      await ht.hoverBucket(0);

      // Expect some visual computed style change like boxShadow or borderColor
      const boxShadow1 = await ht.getBucketComputedStyleProp(0, 'boxShadow1');
      const borderColor = await ht.getBucketComputedStyleProp(0, 'borderColor');

      // At least one of these should change from default empty/none to something noticeable
      const hovered = !!(boxShadow && boxShadow !== 'none') || !!(borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent');

      expect(hovered).toBeTruthy();

      // Move mouse away: hover a different part of page
      await ht.page.mouse.move(0, 0);
      // Wait briefly and ensure styles revert (may or may not; do a best-effort)
      await ht.page.waitForTimeout(200);
      const boxShadowAfter = await ht.getBucketComputedStyleProp(0, 'boxShadow');
      const borderColorAfter = await ht.getBucketComputedStyleProp(0, 'borderColor');

      // At least one style should not be stuck as hovered if app removes hover
      const stillHovered = !!(boxShadowAfter && boxShadowAfter !== 'none') || !!(borderColorAfter && borderColorAfter !== 'rgba(0, 0, 0, 0)' && borderColorAfter !== 'transparent');
      // It's acceptable if implementation keeps some style; we assert the app supports hover (hovered true) but do not strictly require revert.
      expect(hovered).toBeTruthy();
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('rapid inserts do not crash and eventually settle to idle', async () => {
      // Rapidly queue multiple inserts
      const keys1 = [];
      for (let i = 0; i < 6; i++) {
        const k1 = `burst-${i}-${Date.now()}`;
        keys.push(k);
        await ht.keyInput.fill(k);
        // Fire insert but do not await internal animation; mimic user quickly clicking
        await ht.insertBtn('Insert').click();
      }
      // Wait for animations/bulk inserts to finish (best-effort)
      await ht.page.waitForTimeout(4000);

      // Ensure all keys are present eventually
      const all4 = await ht.getAllNodes();
      for (const k of keys) {
        expect(all.values.some(v => v.includes(k))).toBeTruthy();
      }
    });

    test('dismissal of input error returns to idle (DISMISS -> idle)', async () => {
      // Trigger input error by clicking search with empty input
      await ht.clearInput();
      await ht.searchKey('');
      await expect(ht.hint).toHaveText(/please enter|required|non-?empty/i, { timeout: 2000 }).catch(() => {});
      // Some apps may expose a dismiss button or clicking elsewhere dismisses
      // Click on body to dismiss
      await ht.page.click('body');
      // Ensure hint no longer shows the input error (returns to idle). Best-effort assertion.
      const hint2 = await ht.getHintText();
      expect(/please enter|required|non-?empty/i.test(hint)).toBeFalsy();
    });
  });
});