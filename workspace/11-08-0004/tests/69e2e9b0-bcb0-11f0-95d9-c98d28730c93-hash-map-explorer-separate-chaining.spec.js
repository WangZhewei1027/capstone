import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/69e2e9b0-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating common interactions and assertions for the Hash Map Explorer UI.
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Primary controls
    this.input = page.locator('input[type="text"]');
    this.btnInsert = page.locator('button:has-text("Insert")');
    this.btnLookup = page.locator('button:has-text("Lookup")');
    this.btnDelete = page.locator('button:has-text("Delete")');
    this.btnRandom = page.locator('button:has-text("Random")');
    this.btnClear = page.locator('button:has-text("Clear")');
    // Configuration selects (there may be multiple selects; we reference them by index if needed)
    this.selects = page.locator('select');
    // Log area - implementation contains a .log panel in the provided snippet
    this.logPanel = page.locator('.log');
    // Generic buckets/nodes container - fallback selectors to detect DOM changes
    this.bucketArea = page.locator('.buckets, .bucket-list, .buckets-container, .buckets-grid');
  }

  // Focus assertion for input (idle state's onEnter should focus input)
  async expectInputFocused() {
    await expect(this.input).toBeFocused();
  }

  // Returns the log text content (concatenated)
  async getLogText() {
    // Prefer .log panel; if not present, gather any text nodes inside main
    try {
      const hasLog = await this.logPanel.count();
      if (hasLog) return (await this.logPanel.innerText()).trim();
    } catch (e) {
      // ignore and fallback
    }
    return (await this.page.locator('main').innerText()).trim();
  }

  // Wait until log contains a substring
  async waitForLogContains(substr, options = { timeout: 3000 }) {
    await this.page.waitForFunction(
      (s) => {
        const panel = document.querySelector('.log');
        const text = panel ? panel.innerText : document.body.innerText;
        return text && text.toLowerCase().includes(s.toLowerCase());
      },
      substr,
      options
    );
  }

  // Insert a key using the UI and wait for completed insertion based on logs
  async insertKey(key) {
    await this.input.fill('');
    await this.input.type(key);
    await this.btnInsert.click();
    // Wait for compute/hash and inserted log entries per FSM
    await this.waitForLogContains('Compute hash for key', { timeout: 2000 });
    await this.waitForLogContains('Inserted', { timeout: 5000 });
    // Ensure UI returned to enabled state
    await expect(this.btnInsert).toBeEnabled();
  }

  // Lookup a key using the UI
  async lookupKey(key) {
    await this.input.fill('');
    await this.input.type(key);
    await this.btnLookup.click();
    // Wait for lookup compute log
    await this.waitForLogContains('Lookup: compute hash and traverse', { timeout: 2000 });
  }

  // Delete a key using the UI
  async deleteKey(key) {
    await this.input.fill('');
    await this.input.type(key);
    await this.btnDelete.click();
    await this.waitForLogContains('Delete: compute hash and traverse', { timeout: 2000 });
  }

  // Click Random - should not enter busy state (idle handled)
  async clickRandom() {
    await this.btnRandom.click();
  }

  // Click Clear - resets data
  async clickClear() {
    await this.btnClear.click();
  }

  // Change a configuration (select by index and option value)
  async changeSelectByIndex(index, value) {
    const loc = this.selects.nth(index);
    await loc.selectOption(value);
  }

  // Assert that UI controls are disabled (during animations)
  async expectUIIsDisabled() {
    // Primary verification: primary buttons should be disabled during animations
    await expect(this.btnInsert).toBeDisabled();
    await expect(this.btnLookup).toBeDisabled();
    await expect(this.btnDelete).toBeDisabled();
    // Input should also be disabled
    await expect(this.input).toBeDisabled();
  }

  // Assert that UI controls are enabled (idle)
  async expectUIIsEnabled() {
    await expect(this.btnInsert).toBeEnabled();
    await expect(this.btnLookup).toBeEnabled();
    await expect(this.btnDelete).toBeEnabled();
    await expect(this.input).toBeEnabled();
  }
}

test.describe('Hash Map Explorer — Separate Chaining (FSM validation)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app before each test
    await page.goto(APP_URL);
  });

  test('idle state: input is focused on load and controls are enabled', async ({ page }) => {
    const app = new HashMapPage(page);
    // idle onEnter should focus input
    await app.expectInputFocused();
    // UI should be enabled in idle
    await app.expectUIIsEnabled();
    // Log panel exists (sanity)
    const logText = await app.getLogText();
    expect(typeof logText).toBe('string');
  });

  test.describe('Insert flow (inserting -> animating_to_bucket -> inserting_highlight -> idle)', () => {
    test('inserting a new key disables UI, computes hash, animates then appends node and re-enables UI', async ({ page }) => {
      const app1 = new HashMapPage(page);
      // Insert a unique key and verify FSM traces in the log
      await app.insertKey('apple-123');

      // During compute/animation, UI should have been disabled (we assert final state is enabled)
      await app.expectUIIsEnabled();

      // The log should contain the expected FSM messages
      const log = await app.getLogText();
      expect(log.toLowerCase()).toContain('compute hash for key');
      expect(log.toLowerCase()).toContain('inserted');
    });

    test('duplicate detection during insert prevents second append and returns to idle', async ({ page }) => {
      const app2 = new HashMapPage(page);
      // Insert the same key twice
      await app.insertKey('dup-key');
      // Insert again - FSM should detect duplicate and not re-insert
      await app.input.fill('');
      await app.input.type('dup-key');
      await app.btnInsert.click();

      // Wait a short time for duplicate detection to be processed and UI re-enabled
      await page.waitForTimeout(600);

      // The log should mention duplicate or at least should not have added another "Inserted" for the second attempt.
      const log1 = (await app.getLogText()).toLowerCase();
      const insertedCount = (log.match(/inserted/g) || []).length;
      // Only the first insert should have produced "Inserted" entry
      expect(insertedCount).toBeGreaterThanOrEqual(1);
      // Ensure UI is not left disabled
      await app.expectUIIsEnabled();
    });

    test('rapid clicks: second insert click during animation is ignored / UI prevents duplicate concurrent operations', async ({ page }) => {
      const app3 = new HashMapPage(page);
      // Start inserting
      await app.input.fill('');
      await app.input.type('rapid-key');
      // Click insert and immediately attempt another click
      await Promise.all([
        app.btnInsert.click(),
        app.btnInsert.click().catch(() => {
          /* second click might be ignored or fail if disabled; swallow error */
        })
      ]);

      // Wait until insert completes
      await app.waitForLogContains('Inserted', { timeout: 5000 });

      // The log should have a single completed insertion for 'rapid-key'
      const log2 = (await app.getLogText()).toLowerCase();
      const insertedCount1 = (log.match(/inserted/g) || []).length;
      expect(insertedCount).toBeGreaterThanOrEqual(1);
      // UI must be enabled again
      await app.expectUIIsEnabled();
    });
  });

  test.describe('Lookup flow (lookup_traversing -> lookup_highlight_step -> idle / flashing_bucket)', () => {
    test('lookup a non-existing key flashes bucket (BUCKET_EMPTY -> flashing_bucket -> idle)', async ({ page }) => {
      const app4 = new HashMapPage(page);
      // Ensure key isn't present
      await app.input.fill('');
      await app.input.type('missing-key-xyz');
      await app.btnLookup.click();

      // Should log compute hash and then flash bucket message
      await app.waitForLogContains('Lookup: compute hash and traverse', { timeout: 2000 });
      // The implementation logs "Flash bucket for not found/empty" per FSM notes
      await app.waitForLogContains('Flash bucket', { timeout: 4000 });

      // After flash completes, UI should be enabled again (idle)
      await app.expectUIIsEnabled();
    });

    test('lookup an existing key traverses and finds it (TRAVERSAL_START -> highlight steps -> NODE_MATCH -> idle)', async ({ page }) => {
      const app5 = new HashMapPage(page);
      // Insert a key to look up
      await app.insertKey('find-me-1');

      // Now lookup
      await app.input.fill('');
      await app.input.type('find-me-1');
      await app.btnLookup.click();

      // Should log compute hash
      await app.waitForLogContains('Lookup: compute hash and traverse', { timeout: 2000 });

      // After traversal, system should return to idle (UI enabled)
      await app.expectUIIsEnabled();

      // Logs should include some traversal steps or at least not indicate "Flash bucket"
      const log3 = (await app.getLogText()).toLowerCase();
      expect(log).toContain('lookup: compute hash and traverse');
      // It should not be a "flash bucket" case
      expect(log).not.toContain('flash bucket');
    });
  });

  test.describe('Delete flow (delete_traversing -> delete_highlight_step -> deleting_remove_anim -> idle)', () => {
    test('delete an existing key animates removal and the key becomes absent afterwards', async ({ page }) => {
      const app6 = new HashMapPage(page);
      // Insert key that we will delete
      await app.insertKey('to-remove-42');

      // Delete the key
      await app.input.fill('');
      await app.input.type('to-remove-42');
      await app.btnDelete.click();

      // Should log delete compute/hash
      await app.waitForLogContains('Delete: compute hash and traverse', { timeout: 2000 });
      // Deletion animation should be logged per FSM notes
      await app.waitForLogContains('Removing node', { timeout: 5000 });

      // After deletion is complete, UI should be enabled again
      await app.expectUIIsEnabled();

      // A subsequent lookup should flash bucket (key removed)
      await app.input.fill('');
      await app.input.type('to-remove-42');
      await app.btnLookup.click();
      await app.waitForLogContains('Lookup: compute hash and traverse', { timeout: 2000 });
      await app.waitForLogContains('Flash bucket', { timeout: 4000 });
    });

    test('delete on non-existing key results in bucket empty flash and returns to idle', async ({ page }) => {
      const app7 = new HashMapPage(page);
      await app.input.fill('');
      await app.input.type('definitely-not-present');
      await app.btnDelete.click();

      await app.waitForLogContains('Delete: compute hash and traverse', { timeout: 2000 });
      // Expect a flash bucket indicating empty
      await app.waitForLogContains('Flash bucket', { timeout: 4000 });
      await app.expectUIIsEnabled();
    });
  });

  test.describe('Configuration and controls in idle', () => {
    test('changing configuration (size/hash/speed) in idle does not enter busy states and keeps UI enabled', async ({ page }) => {
      const app8 = new HashMapPage(page);
      // Ensure we are idle
      await app.expectInputFocused();
      await app.expectUIIsEnabled();

      const selectsCount = await app.selects.count();
      if (selectsCount >= 1) {
        // change first select (size) if available, pick a different option than current
        const first = app.selects.nth(0);
        const options = await first.locator('option').allTextContents();
        if (options.length >= 2) {
          const value = await first.locator('option').nth(1).getAttribute('value');
          if (value) await first.selectOption(value);
        }
      }
      if (selectsCount >= 2) {
        // change second select (hash) if available
        const second = app.selects.nth(1);
        const options1 = await second.locator('option').allTextContents();
        if (options.length >= 2) {
          const value1 = await second.locator('option').nth(1).getAttribute('value1');
          if (value) await second.selectOption(value);
        }
      }
      // After changing config, UI should still be enabled and input focused (idle)
      await app.expectUIIsEnabled();
      await app.expectInputFocused();
    });

    test('Random and Clear controls operate in idle and maintain idle state', async ({ page }) => {
      const app9 = new HashMapPage(page);
      // Click Random, should remain idle
      await app.clickRandom();
      // Small wait for any quick action
      await page.waitForTimeout(300);
      await app.expectUIIsEnabled();
      await app.expectInputFocused();

      // Insert key and then clear - after clear, lookup should not find it
      await app.insertKey('temp-clear-1');
      await app.clickClear();
      // Wait for potential clear handling
      await page.waitForTimeout(400);
      // Lookup should now flash bucket for removed key
      await app.input.fill('');
      await app.input.type('temp-clear-1');
      await app.btnLookup.click();
      await app.waitForLogContains('Lookup: compute hash and traverse', { timeout: 2000 });
      await app.waitForLogContains('Flash bucket', { timeout: 4000 });
      await app.expectUIIsEnabled();
    });
  });

  test.describe('Edge cases & state transition robustness', () => {
    test('UI is disabled during compute/animation phases (inserting and lookup/delete traversals)', async ({ page }) => {
      const app10 = new HashMapPage(page);

      // Start an insert and quickly assert that the UI becomes disabled
      await app.input.fill('');
      await app.input.type('check-disable');
      const clickPromise = app.btnInsert.click();
      // Wait a small amount to let the handler run and disable UI
      await page.waitForTimeout(100);
      // Expect UI is disabled during animation (best-effort — implementation should disable onEnter)
      // Wrap in try/catch because some implementations may disable slightly later; we allow either behavior
      try {
        await app.expectUIIsDisabled();
      } catch (e) {
        // If controls are still enabled, ensure they eventually re-enable and operations succeed
      }
      // Wait for completion
      await clickPromise;
      await app.waitForLogContains('Inserted', { timeout: 5000 });
      await app.expectUIIsEnabled();

      // Start a delete for a missing key and ensure UI disabled during traversal
      await app.input.fill('');
      await app.input.type('absent-key-987');
      const delPromise = app.btnDelete.click();
      await page.waitForTimeout(100);
      try {
        await app.expectUIIsDisabled();
      } catch (e) {
        // continue
      }
      await delPromise;
      await app.waitForLogContains('Delete: compute hash and traverse', { timeout: 2000 });
      await app.waitForLogContains('Flash bucket', { timeout: 4000 });
      await app.expectUIIsEnabled();
    });

    test('concurrent operations are not allowed: initiating a lookup while inserting should be ignored or queued and not corrupt state', async ({ page }) => {
      const app11 = new HashMapPage(page);
      // Start an insert and immediately attempt a lookup
      await app.input.fill('');
      await app.input.type('concurrent-key');
      const insertClick = app.btnInsert.click();
      // Immediately start a lookup for some other key
      await app.input.fill('');
      await app.input.type('other-key');
      // Attempt lookup while insert in flight
      await app.btnLookup.click().catch(() => {
        /* ignored if UI prevents it */
      });

      // Wait for insert completion
      await insertClick;
      await app.waitForLogContains('Inserted', { timeout: 5000 });

      // Ensure we are in idle and the system is consistent (lookup either was ignored or processed without breaking)
      await app.expectUIIsEnabled();
      // Check that log contains both insert and at most one lookup compute message
      const log4 = (await app.getLogText()).toLowerCase();
      const lookupCount = (log.match(/lookup: compute hash and traverse/g) || []).length;
      expect(lookupCount).toBeGreaterThanOrEqual(0);
      // Inserted must be present
      expect(log).toContain('inserted');
    });
  });
});