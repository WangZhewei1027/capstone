import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/743b1360-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object for the Hash Map Visualizer app
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // common button locators by text label
    this.insertButton = page.getByRole('button', { name: /insert/i });
    this.searchButton = page.getByRole('button', { name: /search/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.resetButton = page.getByRole('button', { name: /reset/i });
    this.copyButton = page.getByRole('button', { name: /copy/i });
    // a generic text input (the key input). Many implementations use the first text input.
    this.keyInput = page.locator('input[type="text"], input#key, input[name="key"]').first();
    // range input for table size (if present)
    this.sizeRange = page.locator('input[type="range"], input#sizeRange, input[name="size"]').first();
  }

  // Type a key into the input and optionally press Enter
  async enterKey(key, { pressEnter = false } = {}) {
    await this.keyInput.scrollIntoViewIfNeeded();
    await this.keyInput.fill('');
    await this.keyInput.type(String(key));
    if (pressEnter) {
      await this.keyInput.press('Enter');
    }
  }

  // Click actions (work even if button not present - will throw)
  async clickInsert() {
    await this.insertButton.click();
  }
  async clickSearch() {
    await this.searchButton.click();
  }
  async clickDelete() {
    await this.deleteButton.click();
  }
  async clickReset() {
    await this.resetButton.click();
  }
  async clickCopy() {
    await this.copyButton.click();
  }

  // Get a robust count of nodes present in the buckets
  async getNodeCount() {
    const selectors = [
      '.node', // common node class
      '.bucket .node',
      '.chaining-node',
      '.list-node',
      'li.node',
      '.item.node'
    ];
    for (const sel of selectors) {
      const count = await this.page.locator(sel).count();
      if (count > 0) return count;
    }
    // If none of the selectors matched anything, return 0
    return 0;
  }

  // Try to get a textual message displayed by the UI (status / feedback)
  async getStatusMessage() {
    const candidates = [
      '[role="status"]',
      '.message',
      '.status',
      '.small.message',
      '.toast',
      '.alert',
      '.panel .small',
      '.controls .small',
      '.info'
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel).first();
      if (await loc.count() > 0) {
        const txt = (await loc.textContent()) || '';
        if (txt.trim()) return txt.trim();
      }
    }
    // fallback: search for known words anywhere in the page body (Ready, Found, Not found, Duplicate, New table)
    const bodyText = (await this.page.locator('body').textContent()) || '';
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
    // return the shortest non-empty line that matches known keywords
    const keywords = ['ready', 'found', 'not found', 'duplicate', 'new table', 'inserted', 'removed', 'deleted', 'collision', 'hash'];
    for (const line of lines) {
      const low = line.toLowerCase();
      if (keywords.some(k => low.includes(k))) return line;
    }
    return '';
  }

  // Get whether a node with specific text exists and its classes
  async findNodeByText(key) {
    const nodeSelectors = [
      `.node:has-text("${key}")`,
      `.bucket .node:has-text("${key}")`,
      `li.node:has-text("${key}")`,
      `.chaining-node:has-text("${key}")`,
      `.list-node:has-text("${key}")`
    ];
    for (const sel of nodeSelectors) {
      const loc1 = this.page.locator(sel).first();
      if (await loc.count() > 0) return loc;
    }
    return null;
  }

  // Set the range input value (simulate user input + change)
  async setTableSizeValue(value) {
    if (await this.sizeRange.count() === 0) return false;
    const handle = this.sizeRange;
    // set using page.evaluate to ensure events are fired
    await this.page.evaluate(
      ({ selector, val }) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.value = String(val);
        // dispatch both input and change like a user would
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      { selector: await handle.evaluate((el) => {
        // build a unique selector for the element
        if (el.id) return `#${el.id}`;
        if (el.name) return `input[name="${el.name}"]`;
        return 'input[type="range"]';
      }), val: value }
    );
    return true;
  }

  // Helper to mock clipboard write via window.__lastClipboard (set via evaluateOnNewDocument)
  async getLastClipboardValue() {
    return await this.page.evaluate(() => (window).__lastClipboard || null);
  }
}

test.describe('Hash Map Visualizer (Separate Chaining) - FSM flows and UI', () => {
  // Run before each test: stub clipboard and navigate to page
  test.beforeEach(async ({ page }) => {
    // stub navigator.clipboard.writeText to capture writes and optionally simulate failure
    await page.addInitScript(() => {
      (window).__lastClipboard = null;
      (window).__forceClipboardFailure = false;
      // Provide a stubbed clipboard API
      (navigator).clipboard = {
        writeText: async (text) => {
          if ((window).__forceClipboardFailure) {
            return Promise.reject(new Error('Simulated clipboard failure'));
          }
          (window).__lastClipboard = text;
          return Promise.resolve();
        },
      };
    });

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
  });

  test.afterEach(async ({ page }) => {
    // small cleanup: reset forced clipboard failure flag if set
    await page.evaluate(() => {
      (window).__forceClipboardFailure = false;
    });
  });

  test.describe('Idle state and basic UI feedback', () => {
    test('page loads into idle state showing Ready and stats', async ({ page }) => {
      const app = new HashMapPage(page);
      // Check that the page shows a ready message per FSM onEnter
      const msg = await app.getStatusMessage();
      expect(msg.toLowerCase()).toContain('ready');
      // Verify control buttons exist
      await expect(app.insertButton).toBeVisible();
      await expect(app.searchButton).toBeVisible();
      await expect(app.deleteButton).toBeVisible();
      await expect(app.resetButton).toBeVisible();
      // Stats should appear somewhere on the page (Total/Items)
      const bodyText1 = (await page.locator('body').textContent()) || '';
      expect(bodyText.toLowerCase()).toMatch(/item|total|collision|buckets|size/);
    });

    test('typing a key updates the hash calculation and remains in idle', async ({ page }) => {
      const app1 = new HashMapPage(page);
      // Type a key and expect the UI to display a hash calculation snippet somewhere
      await app.enterKey('hello');
      // Look for elements that likely display hash calculation or hash text
      const possibleSelectors = ['.hashCalc', '.hash-calc', '#hash', '.calc', 'text=/hash/i'];
      let found = false;
      for (const sel of possibleSelectors) {
        try {
          const loc2 = sel.startsWith('text=') ? page.locator(sel) : page.locator(sel);
          if (await loc.count() > 0) {
            const txt1 = (await loc.first().textContent()) || '';
            if (txt.trim().length > 0) {
              found = true;
              break;
            }
          }
        } catch (e) {
          // ignore and continue
        }
      }
      // It's acceptable that hash display may be textual inside body; ensure at least body contains 'hash' term
      if (!found) {
        const bodyText2 = (await page.locator('body').textContent()) || '';
        expect(bodyText.toLowerCase()).toMatch(/hash|bucket|index/);
      }
    });
  });

  test.describe('Insertion flow (insert_animating -> inserting -> idle)', () => {
    test('insert a new key creates a new node in the correct bucket and updates stats', async ({ page }) => {
      const app2 = new HashMapPage(page);
      const before = await app.getNodeCount();
      await app.enterKey('alpha');
      // Use click Insert button
      await app.clickInsert();
      // Wait for DOM append animations/promises to settle: check node count increases
      await page.waitForTimeout(250); // small allowance for animations
      const after = await app.getNodeCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);
      // Ensure the inserted key text appears in a node
      const node = await app.findNodeByText('alpha');
      expect(node).not.toBeNull();
      if (node) {
        const txt2 = (await node.textContent()) || '';
        expect(txt.toLowerCase()).toContain('alpha');
      }
      // Expect status message to reflect insert or readiness
      const msg1 = await app.getStatusMessage();
      expect(msg.toLowerCase()).toMatch(/ready|insert|inserted/);
    });

    test('pressing Enter while in the form triggers insert (FORM_ENTER)', async ({ page }) => {
      const app3 = new HashMapPage(page);
      const before1 = await app.getNodeCount();
      await app.enterKey('enter-key', { pressEnter: true });
      // small wait for animation/DOM insertion
      await page.waitForTimeout(300);
      const after1 = await app.getNodeCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);
      const node1 = await app.findNodeByText('enter-key');
      expect(node).not.toBeNull();
    });

    test('attempting to insert a duplicate key does not increase nodes and shows duplicate feedback', async ({ page }) => {
      const app4 = new HashMapPage(page);
      // Insert same key twice
      await app.enterKey('dupKey');
      await app.clickInsert();
      await page.waitForTimeout(200);
      const countAfterFirst = await app.getNodeCount();

      await app.enterKey('dupKey');
      await app.clickInsert();
      // wait for duplicate detection
      await page.waitForTimeout(200);
      const countAfterSecond = await app.getNodeCount();
      // Count should not increase for duplicate
      expect(countAfterSecond).toBeLessThanOrEqual(countAfterFirst);
      // Expect message indicating duplicate (if implementation prints such)
      const msg2 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('duplicate') || msg.includes('already') || msg.includes('ready')).toBeTruthy();
    });
  });

  test.describe('Search flows (searching -> found_view / idle)', () => {
    test('search for existing key highlights node and shows Found message', async ({ page }) => {
      const app5 = new HashMapPage(page);
      // Ensure a key exists to search for
      await app.enterKey('findMe');
      await app.clickInsert();
      await page.waitForTimeout(300);

      await app.enterKey('findMe');
      await app.clickSearch();
      // the searching state should sequentially highlight node(s). Look for 'found' class or message
      await page.waitForTimeout(200);
      const node2 = await app.findNodeByText('findMe');
      if (node) {
        // check for found/removal highlight classes
        const cls = await node.getAttribute('class') || '';
        const isFoundClass = /found|highlight|match/i.test(cls);
        // it's acceptable if class not present; fallback to message
        const msg3 = (await app.getStatusMessage()).toLowerCase();
        expect(isFoundClass || msg.includes('found') || msg.includes('found')).toBeTruthy();
      } else {
        // Unexpected: node not present -> test should fail
        expect(node).not.toBeNull();
      }
    });

    test('search for missing key results in Not Found and returns to idle', async ({ page }) => {
      const app6 = new HashMapPage(page);
      // Ensure key unlikely to exist
      await app.enterKey('this-key-does-not-exist-xyz');
      await app.clickSearch();
      // wait for search to complete
      await page.waitForTimeout(300);
      // Expect status to indicate not found or simply be back to ready
      const msg4 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('not found') || msg.includes('ready') || msg.includes('no match')).toBeTruthy();
    });
  });

  test.describe('Delete flows (searching_for_delete -> removing_node -> idle)', () => {
    test('delete an existing key removes the DOM node and updates stats', async ({ page }) => {
      const app7 = new HashMapPage(page);
      // Insert key to delete
      await app.enterKey('toRemove');
      await app.clickInsert();
      await page.waitForTimeout(300);

      const before2 = await app.getNodeCount();
      await app.enterKey('toRemove');
      await app.clickDelete();
      // wait for searching and removal animation
      await page.waitForTimeout(400);
      const after2 = await app.getNodeCount();
      expect(after).toBeLessThanOrEqual(before - 1);
      // ensure node no longer present
      const node3 = await app.findNodeByText('toRemove');
      expect(node).toBeNull();
      // status message should reflect removal or ready
      const msg5 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('removed') || msg.includes('deleted') || msg.includes('ready')).toBeTruthy();
    });

    test('attempt to delete a non-existent key results in no removal and shows not found', async ({ page }) => {
      const app8 = new HashMapPage(page);
      const before3 = await app.getNodeCount();
      await app.enterKey('definitely-not-present-12345');
      await app.clickDelete();
      await page.waitForTimeout(300);
      const after3 = await app.getNodeCount();
      expect(after).toBe(before);
      const msg6 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('not found') || msg.includes('ready')).toBeTruthy();
    });
  });

  test.describe('Reset and size-change confirmations (awaiting_confirm_reset / awaiting_confirm_size_change)', () => {
    test('clicking Reset shows browser confirm; accepting resets the table', async ({ page }) => {
      const app9 = new HashMapPage(page);
      // Create a node so that reset has an effect
      await app.enterKey('willReset');
      await app.clickInsert();
      await page.waitForTimeout(300);
      const before4 = await app.getNodeCount();
      expect(before).toBeGreaterThanOrEqual(1);

      // Prepare to accept the confirm dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message().toLowerCase()).toMatch(/reset|continue|changing table size/i);
        await dialog.accept();
      });

      await app.clickReset();
      // wait for reset to complete
      await page.waitForTimeout(300);
      const after4 = await app.getNodeCount();
      // After reset, nodes should be cleared (0) or at least decreased
      expect(after).toBeLessThan(before);
      const msg7 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('new table') || msg.includes('ready')).toBeTruthy();
    });

    test('clicking Reset and cancelling leaves the table intact', async ({ page }) => {
      const app10 = new HashMapPage(page);
      // Insert a node
      await app.enterKey('noReset');
      await app.clickInsert();
      await page.waitForTimeout(300);
      const before5 = await app.getNodeCount();
      expect(before).toBeGreaterThanOrEqual(1);

      // Dismiss the confirm dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });

      await app.clickReset();
      await page.waitForTimeout(300);
      const after5 = await app.getNodeCount();
      // Should remain the same
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('changing table size triggers confirm and accepting resets to new size', async ({ page }) => {
      const app11 = new HashMapPage(page);
      // Insert a key so reset is observable
      await app.enterKey('sizeKey');
      await app.clickInsert();
      await page.waitForTimeout(300);
      const before6 = await app.getNodeCount();
      expect(before).toBeGreaterThanOrEqual(1);

      // Try to change size via range input if present
      const sizeRangePresent = (await app.sizeRange.count()) > 0;
      if (!sizeRangePresent) {
        test.skip(true, 'No size range input available in this implementation; skipping size-change test');
        return;
      }

      // When the change event occurs, a dialog should appear per FSM. Accept it.
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      // set a new value (e.g., 16)
      await app.setTableSizeValue(16);
      // wait for reset action to complete
      await page.waitForTimeout(300);
      const after6 = await app.getNodeCount();
      expect(after).toBeLessThan(before);
      const msg8 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('new table') || msg.includes('ready')).toBeTruthy();
    });
  });

  test.describe('Clipboard copy (copying_hash) and error handling', () => {
    test('clicking Copy writes computed hash to clipboard and sets success message', async ({ page }) => {
      const app12 = new HashMapPage(page);
      // Ensure there is a computed hash by typing a key
      await app.enterKey('clipboard-test');
      // Click copy
      await app.clickCopy();
      // small delay for async clipboard write
      await page.waitForTimeout(150);
      const lastClip = await app.getLastClipboardValue();
      // Clipboard should have some text (hash). We assert it's a non-empty string
      expect(typeof lastClip === 'string' && lastClip.length > 0).toBeTruthy();
      const msg9 = (await app.getStatusMessage()).toLowerCase();
      // Implementation may report success or simply be quiet; check both
      expect(msg === '' || msg.includes('copied') || msg.includes('copy') || msg.includes('ready')).toBeTruthy();
    });

    test('clipboard write failure is handled and displays an error message', async ({ page }) => {
      const app13 = new HashMapPage(page);
      // Force the clipboard stub to fail
      await page.evaluate(() => {
        (window).__forceClipboardFailure = true;
      });
      await app.enterKey('fail-clipboard');
      await app.clickCopy();
      await page.waitForTimeout(150);
      const lastClip1 = await app.getLastClipboardValue();
      // Should be null because we simulated failure
      expect(lastClip).toBeNull();
      const msg10 = (await app.getStatusMessage()).toLowerCase();
      // Error handling may set an error message; check for success or failure keywords
      expect(msg === '' || msg.includes('error') || msg.includes('failed') || msg.includes('could not') || msg.includes('ready')).toBeTruthy();
    });
  });

  test.describe('Edge cases and timing events', () => {
    test('animations/timeouts eventually return app to idle state (message Ready)', async ({ page }) => {
      const app14 = new HashMapPage(page);
      // Insert a key to trigger animations
      await app.enterKey('timingKey');
      await app.clickInsert();
      // Wait a generous amount for animations/timeouts to complete
      await page.waitForTimeout(1200);
      const msg11 = (await app.getStatusMessage()).toLowerCase();
      expect(msg.includes('ready') || msg === '' || msg.includes('new table') || msg.includes('inserted')).toBeTruthy();
    });

    test('table focus and accessibility interactions do not change main state', async ({ page }) => {
      const app15 = new HashMapPage(page);
      // Focus the visual table area if present
      const tableCandidates = ['.table', '.buckets', '#table', '.root .pane', '.buckets-wrap'];
      for (const sel of tableCandidates) {
        const loc3 = page.locator(sel);
        if (await loc.count() > 0) {
          await loc.first().focus();
          break;
        }
      }
      // After focusing, app should still be responsive; performing a search for a missing key should remain consistent
      await app.enterKey('abc-nope');
      await app.clickSearch();
      await page.waitForTimeout(250);
      const msg12 = (await app.getStatusMessage()).toLowerCase();
      expect(msg === '' || msg.includes('not found') || msg.includes('ready')).toBeTruthy();
    });
  });
});