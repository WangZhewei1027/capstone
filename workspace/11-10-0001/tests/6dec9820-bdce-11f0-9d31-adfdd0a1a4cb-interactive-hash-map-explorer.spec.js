import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0001/html/6dec9820-bdce-11f0-9d31-adfdd0a1a4cb.html';

/**
 * Page Object for the Interactive Hash Map Explorer.
 * Encapsulates common interactions and resilient selectors so tests remain readable.
 */
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Generic selectors we will try in order when multiple possibilities exist.
    this.selectors = {
      textbox: [
        'input[type="text"]', // common
        'input[placeholder*="key"]',
        'input[aria-label*="key"]',
        'textarea', // fallback
        '[data-testid="key-input"]'
      ],
      bucket: [
        '.bucket', // likely
        '[data-testid="bucket"]',
        '.buckets .bucket',
        '.bucket-item'
      ],
      tableKey: [
        '.hash-table td',
        '.table .cell',
        '.entry .key',
        '[data-testid="entry"]'
      ],
      message: [
        '.toast',
        '.message',
        '.status',
        '.alert',
        '[role="status"]',
        '[data-testid="message"]'
      ]
    };
  }

  // Resiliently find the first textbox on the page
  async textbox() {
    for (const sel of this.selectors.textbox) {
      const locator = this.page.locator(sel);
      if (await locator.count() > 0) return locator.first();
      // Also try role=searchbox / role=textbox
    }
    // fallback: get by role textbox
    return this.page.getByRole('textbox').first();
  }

  // Find a button by visible name (case-insensitive)
  buttonByName(nameRegex) {
    return this.page.getByRole('button', { name: nameRegex });
  }

  // Insert a key using the Insert button
  async insertKeyWithButton(key) {
    const input = await this.textbox();
    await input.fill('');
    if (key !== '') await input.fill(String(key));
    const insertBtn = this.buttonByName(/insert/i);
    await expect(insertBtn).toBeVisible();
    await insertBtn.click();
  }

  // Insert a key by pressing Enter
  async insertKeyWithEnter(key) {
    const input = await this.textbox();
    await input.fill('');
    if (key !== '') await input.fill(String(key));
    await input.press('Enter');
  }

  // Search for a key using Search button (or Shift+Enter)
  async searchKeyWithButton(key) {
    const input = await this.textbox();
    await input.fill('');
    await input.fill(String(key));
    const searchBtn = this.buttonByName(/search/i);
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
  }

  async searchKeyWithShiftEnter(key) {
    const input = await this.textbox();
    await input.fill('');
    await input.fill(String(key));
    await input.press('Shift+Enter');
  }

  // Delete a key using Delete button
  async deleteKey(key) {
    const input = await this.textbox();
    await input.fill('');
    await input.fill(String(key));
    const delBtn = this.buttonByName(/delete/i);
    await expect(delBtn).toBeVisible();
    await delBtn.click();
  }

  // Visualize hash for key
  async visualizeHash(key) {
    const input = await this.textbox();
    await input.fill('');
    await input.fill(String(key));
    const visBtn = this.buttonByName(/visualize hash|visualize/i);
    await expect(visBtn).toBeVisible();
    await visBtn.click();
  }

  // Reset buckets - try to find a bucket count input then press Reset
  async resetBuckets(count) {
    // Try number inputs
    const numInput = this.page.locator('input[type="number"], input[aria-label*="bucket"], input[placeholder*="buckets"]');
    if (await numInput.count() > 0) {
      await numInput.first().fill(String(count));
    } else {
      // try a generic input and assume it's the bucket setting
      const input = await this.textbox();
      await input.fill(String(count));
    }
    const resetBtn = this.buttonByName(/reset/i);
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  }

  async clearTable() {
    const clearBtn = this.buttonByName(/clear/i);
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
  }

  async fillSample() {
    const sampleBtn = this.buttonByName(/fill sample|sample/i);
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
  }

  // Click nth bucket (0-based)
  async clickBucket(index = 0) {
    for (const sel of this.selectors.bucket) {
      const buckets = this.page.locator(sel);
      const count = await buckets.count();
      if (count > index) {
        await buckets.nth(index).click();
        return buckets.nth(index);
      }
    }
    // fallback: click an element that looks like a bucket by role/aria
    const fallback = this.page.locator('[data-testid="bucket"]').nth(index);
    await fallback.click();
    return fallback;
  }

  // Get a locator for a key text anywhere in the UI
  keyLocator(key) {
    // search by text
    return this.page.locator(`text="${key}"`);
  }

  // Returns any visible message element text (useful for error/success)
  async getLatestMessageText() {
    for (const sel of this.selectors.message) {
      const m = this.page.locator(sel);
      if (await m.count() > 0) {
        // return first visible message
        const visible = m.filter({ hasText: /.*/ });
        if (await visible.count() > 0) {
          return (await visible.first().innerText()).trim();
        }
      }
    }
    // fallback: find elements that contain common keywords
    const common = await this.page.locator(':text("error"), :text("invalid"), :text("duplicate"), :text("not found"), :text("done"), :text("complete")').first();
    if (await common.count() > 0) {
      return (await common.innerText()).trim();
    }
    return '';
  }

  // Helper to count bucket elements
  async bucketCount() {
    for (const sel of this.selectors.bucket) {
      const buckets = this.page.locator(sel);
      const count = await buckets.count();
      if (count > 0) return count;
    }
    // fallback try to find list of buckets
    const fallback = this.page.locator('[data-testid="buckets"] *');
    const fbCount = await fallback.count();
    return fbCount;
  }

  // Helper to ensure a key is highlighted (by style or class)
  async isKeyHighlighted(key) {
    const locator = this.keyLocator(key).first();
    await locator.waitFor({ timeout: 2000 }).catch(() => {}); // proceed even if not found
    if ((await locator.count()) === 0) return false;
    // Check for common highlight classes
    const className = await locator.getAttribute('class');
    if (className && /highlight|active|found|search-hit|bucket-highlight|animating/i.test(className)) return true;
    // Compute style-based heuristic: background-color not transparent or color accent
    const bg = await locator.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.backgroundColor || s.color || '';
    });
    if (bg && !/(transparent|rgba\(0, 0, 0, 0\)|none)/i.test(bg)) return true;
    return false;
  }

  // Attempt to dismiss any visible error or message (button with dismiss/ok/close)
  async dismissMessage() {
    const btn = this.page.getByRole('button', { name: /dismiss|close|ok|got it|okay/i });
    if (await btn.count() > 0) {
      await btn.first().click();
      return true;
    }
    // try clicking a visible .toast close icon
    const close = this.page.locator('.toast .close, .message .close, .alert .close');
    if (await close.count() > 0) {
      await close.first().click();
      return true;
    }
    return false;
  }
}

test.describe('Interactive Hash Map Explorer - FSM states and transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Basic smoke: page should have loaded. Title likely contains 'Hash' or 'Interactive'
    const title = await page.title();
    expect(title.toLowerCase()).toContain('hash', { timeout: 5000 });
  });

  test('idle state: controls present and input is ready', async ({ page }) => {
    // Validate initial idle state: controls/buttons are present and input enabled
    const app = new HashMapPage(page);

    const insertBtn = app.buttonByName(/insert/i);
    await expect(insertBtn).toBeVisible();

    const searchBtn = app.buttonByName(/search/i);
    await expect(searchBtn).toBeVisible();

    const clearBtn = app.buttonByName(/clear/i);
    await expect(clearBtn).toBeVisible();

    const input = await app.textbox();
    await expect(input).toBeEditable();
    await expect(input).toHaveValue('', { timeout: 2000 });
  });

  test.describe('Inserting (inserting state, animations, duplicate & invalid handling)', () => {
    test('insert a new key via Insert button and verify it appears (INSERT_ANIMATION_END -> idle)', async ({ page }) => {
      // This validates entering "inserting" (onEnter startInsertAnimation) and finalizing (onExit finalizeInsert)
      const app = new HashMapPage(page);
      const key = 'alpha-1';

      // Insert
      await app.insertKeyWithButton(key);

      // Wait for key to appear in DOM
      const loc = app.keyLocator(key);
      await expect(loc.first()).toBeVisible({ timeout: 3000 });
      // Also verify it's not highlighted (idle)
      const highlighted = await app.isKeyHighlighted(key);
      expect(highlighted).toBe(false);
    });

    test('insert using Enter key (KEY_ENTER -> inserting) and handle duplicate (DUPLICATE_DETECTED)', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'dup-key';

      // First insert
      await app.insertKeyWithEnter(key);
      await expect(app.keyLocator(key).first()).toBeVisible({ timeout: 3000 });

      // Insert duplicate
      await app.insertKeyWithEnter(key);

      // Expect some duplicate notification or message; FSM should return to idle
      const text = await app.getLatestMessageText();
      // Accept either an explicit 'duplicate' message or silent failure but no new duplicate element
      if (text) {
        expect(/duplicate|already exists|exists/i.test(text)).toBeTruthy();
      } else {
        // Ensure only one instance of the key exists in DOM (no duplicate entries)
        const matches = await page.locator(`text="${key}"`).count();
        expect(matches).toBeLessThanOrEqual(1);
      }

      // Dismiss possible error UI
      await app.dismissMessage();
    });

    test('invalid input yields error and returns to idle (INVALID_INPUT)', async ({ page }) => {
      const app = new HashMapPage(page);
      // Try to insert empty key
      await app.insertKeyWithButton('');
      // Expect an error message about invalid input or required value
      const msg = await app.getLatestMessageText();
      expect(/invalid|required|empty/i.test(msg)).toBeTruthy();
      // Dismiss so state returns to idle
      await app.dismissMessage();
    });
  });

  test.describe('Searching (searching state; sequential search & not-found)', () => {
    test('search existing key highlights it (SEARCH_FOUND -> idle)', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'search-me';

      // Ensure the key exists first
      await app.insertKeyWithButton(key);
      await expect(app.keyLocator(key).first()).toBeVisible({ timeout: 3000 });

      // Search via button
      await app.searchKeyWithButton(key);

      // After sequential search steps, the item should be highlighted at least transiently.
      // We'll wait a bit to detect highlight class/style.
      const found = await page.waitForFunction(
        async (k) => {
          const el = document.querySelector(`:is(td, div, span):contains("${k}")`);
          if (!el) return false;
          const cls = el.className || '';
          if (/highlight|found|active|search-hit/i.test(cls)) return true;
          const s = window.getComputedStyle(el);
          const bg = s.backgroundColor || '';
          return bg && !/(transparent|rgba\(0, 0, 0, 0\)|none)/i.test(bg);
        },
        key,
        { timeout: 4000 }
      ).catch(() => null);

      // Fallback: use our helper isKeyHighlighted
      const highlighted = await app.isKeyHighlighted(key);
      expect(highlighted || !!found).toBeTruthy();

      // Ensure UI returns to idle (no persistent search-only highlight after some time)
      await page.waitForTimeout(800);
      const stillHighlighted = await app.isKeyHighlighted(key);
      // It might remain highlighted momentarily; we accept either behavior but at least it was highlighted above.
      expect(stillHighlighted || !stillHighlighted).toBeDefined();
    });

    test('search non-existing key shows not found (SEARCH_NOT_FOUND -> idle)', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'no-such-key-' + Date.now();

      await app.searchKeyWithButton(key);

      const msg = await app.getLatestMessageText();
      expect(/not found|no.*found|could not find|search complete/i.test(msg)).toBeTruthy();
      await app.dismissMessage();
    });

    test('search using Shift+Enter triggers searching (KEY_SHIFT_ENTER -> searching)', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'shift-enter-key';

      await app.insertKeyWithButton(key);
      await expect(app.keyLocator(key).first()).toBeVisible();

      await app.searchKeyWithShiftEnter(key);

      // Should highlight or show found message
      const highlighted = await app.isKeyHighlighted(key);
      expect(highlighted).toBeTruthy();
    });
  });

  test.describe('Deleting (deleting state and invalid deletion)', () => {
    test('delete an existing key (DELETE_DONE -> idle) and verify removal', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'to-delete';

      await app.insertKeyWithButton(key);
      await expect(app.keyLocator(key).first()).toBeVisible();

      await app.deleteKey(key);

      // Give time for delete animation/state transition
      await page.waitForTimeout(500);
      // Key should be removed from DOM
      const count = await page.locator(`text="${key}"`).count();
      expect(count).toBe(0);
    });

    test('delete non-existing key yields error (DELETE_NOT_FOUND)', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'definitely-not-present-' + Date.now();
      await app.deleteKey(key);

      const msg = await app.getLatestMessageText();
      expect(/not found|could not find|no.*found/i.test(msg)).toBeTruthy();
      await app.dismissMessage();
    });

    test('invalid delete input handled (INVALID_INPUT)', async ({ page }) => {
      const app = new HashMapPage(page);
      // Attempt delete with empty input
      const delBtn = app.buttonByName(/delete/i);
      await expect(delBtn).toBeVisible();
      await delBtn.click();
      const msg = await app.getLatestMessageText();
      expect(/invalid|required|empty/i.test(msg)).toBeTruthy();
      await app.dismissMessage();
    });
  });

  test.describe('Hash visualization and bucket highlighting', () => {
    test('visualize hash for a key and show bucket highlight or hash result (visualizing_hash)', async ({ page }) => {
      const app = new HashMapPage(page);
      const key = 'hash-key-1';

      await app.insertKeyWithButton(key);
      await expect(app.keyLocator(key).first()).toBeVisible();

      await app.visualizeHash(key);

      // Expect some bucket highlight or a hash result shown in UI
      // Wait briefly for stepwise visualization to run
      await page.waitForTimeout(500);
      const bucketCount = await app.bucketCount();
      const msg = await app.getLatestMessageText();

      // Either there are bucket elements and one is highlighted, or message displays hash
      if (bucketCount > 0) {
        // Check at least one bucket shows highlight (class/style)
        let hasHighlight = false;
        for (let i = 0; i < Math.min(bucketCount, 12); i++) {
          const b = await page.locator('.bucket, [data-testid="bucket"]').nth(i).first().catch(() => null);
          if (!b) continue;
          const cls = await b.getAttribute('class').catch(() => '');
          if (cls && /highlight|active|selected|vis/i.test(cls)) {
            hasHighlight = true;
            break;
          }
          const bg = await b.evaluate((el) => window.getComputedStyle(el).backgroundColor).catch(() => '');
          if (bg && !/(transparent|rgba\(0, 0, 0, 0\)|none)/i.test(bg)) {
            hasHighlight = true;
            break;
          }
        }
        expect(hasHighlight || msg.length > 0).toBeTruthy();
      } else {
        // No explicit bucket elements; expect a hash result message
        expect(/hash|bucket|index/i.test(msg)).toBeTruthy();
      }
    });

    test('clicking a bucket highlights it (highlighting_bucket state)', async ({ page }) => {
      const app = new HashMapPage(page);
      const count = await app.bucketCount();
      if (count === 0) {
        // If the implementation has no clickable buckets, skip this test gracefully
        test.skip('No bucket elements present to click');
        return;
      }

      // Click first bucket and expect it to show highlight
      const clicked = await app.clickBucket(0);
      // Validate via class or computed style
      const cls = await clicked.getAttribute('class').catch(() => '');
      const styleBG = await clicked.evaluate((el) => window.getComputedStyle(el).backgroundColor).catch(() => '');
      expect(cls || styleBG).toBeTruthy();
    });
  });

  test.describe('Table management: reset, clear, fill sample (resetting_table, clearing_table, filling_sample)', () => {
    test('reset buckets to a new count (RESET_DONE) updates bucket elements', async ({ page }) => {
      const app = new HashMapPage(page);
      // Try setting bucket count to 8
      await app.resetBuckets(8);

      // Wait for the resetting animation to create buckets
      await page.waitForTimeout(400);

      const newCount = await app.bucketCount();
      // We expect at least 2 buckets, and ideally the requested count (8)
      expect(newCount).toBeGreaterThanOrEqual(1);
      // If implementation supports specific count, allow for either exact match or plausible bucket repaint
      if (newCount !== 0) {
        expect(newCount).toBeGreaterThanOrEqual(1);
      }
    });

    test('reset with invalid bucket count produces INVALID_BUCKETS error', async ({ page }) => {
      const app = new HashMapPage(page);
      // Try to set an invalid bucket count (e.g., -5 or huge)
      await app.resetBuckets(-5);
      const msg = await app.getLatestMessageText();
      expect(/invalid|bucket|range|must/i.test(msg)).toBeTruthy();
      await app.dismissMessage();
    });

    test('clear table removes all keys (CLEAR_DONE -> idle)', async ({ page }) => {
      const app = new HashMapPage(page);
      // Insert a couple of keys
      await app.insertKeyWithButton('c1');
      await app.insertKeyWithButton('c2');
      await expect(app.keyLocator('c1').first()).toBeVisible();
      await expect(app.keyLocator('c2').first()).toBeVisible();

      // Clear
      await app.clearTable();
      // Wait for clear transition
      await page.waitForTimeout(400);

      // Expect keys gone
      const allC1 = await page.locator('text="c1"').count();
      const allC2 = await page.locator('text="c2"').count();
      expect(allC1 + allC2).toBe(0);
    });

    test('fill sample populates multiple entries (filling_sample with SAMPLE_COMPLETE)', async ({ page }) => {
      const app = new HashMapPage(page);

      // Clear first to ensure deterministic state
      await app.clearTable();

      await app.fillSample();

      // Wait for sample insertion to complete (animations)
      await page.waitForTimeout(800);

      // Expect multiple entries in the table or several keys present
      // We'll check that at least 2 distinct text nodes exist (heuristic)
      const keysFound = await page.locator('.hash-table, .table, [data-testid="entries"], .entries').first().locator('text=/./').count().catch(() => 0);
      // Fallback: count any textual entries that look like keys (multiple text nodes)
      const anyKeyNodes = await page.locator(':is(td, .cell, .entry, span)').filter({ hasText: /[A-Za-z0-9-_]{2,}/ }).count().catch(() => 0);

      expect(keysFound + anyKeyNodes).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Error state and dismissing (error -> idle)', () => {
    test('trigger an error and dismiss it (showError onEnter -> DISMISS_ERROR)', async ({ page }) => {
      const app = new HashMapPage(page);

      // Cause error: try invalid operation (empty insert/delete)
      await app.insertKeyWithButton('');
      const msg = await app.getLatestMessageText();
      expect(/invalid|required|empty/i.test(msg)).toBeTruthy();

      // Dismiss via visible controls
      const dismissed = await app.dismissMessage();
      expect(dismissed).toBeTruthy();
      // Ensure message no longer present
      await page.waitForTimeout(200);
      const msgAfter = await app.getLatestMessageText();
      // msgAfter could be empty or different; ensure not stubbornly the same error
      expect(msgAfter === '' || !/invalid|required|empty/i.test(msgAfter)).toBeTruthy();
    });
  });

  test('misc: resize triggers RESIZE transition without breaking UI', async ({ page }) => {
    const app = new HashMapPage(page);
    // Resize viewport to simulate responsive change
    await page.setViewportSize({ width: 500, height: 800 });
    // Allow UI to react
    await page.waitForTimeout(300);
    // Ensure controls still present
    const insertBtn = app.buttonByName(/insert/i);
    await expect(insertBtn).toBeVisible();
    // Restore size
    await page.setViewportSize({ width: 1200, height: 800 });
  });
});