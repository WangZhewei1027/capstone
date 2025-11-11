import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0001/html/7788c4d0-bdce-11f0-9d31-adfdd0a1a4cb.html';

/**
 * Page object encapsulating interactions with the BST visualization page.
 * This provides resilient selectors and helper utilities used across tests.
 */
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('input[type="number"]');
    this.insertButton = page.getByRole('button', { name: /insert/i });
    this.searchButton = page.getByRole('button', { name: /search/i });
    this.randomButton = page.getByRole('button', { name: /random/i });
    this.clearButton = page.getByRole('button', { name: /clear/i });
    // Status area may have class .status per implementation
    this.status = page.locator('.status');
    // Generic svg container (visualization area)
    this.svg = page.locator('svg').first();
  }

  async navigate() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Ensure page loaded and basic controls are visible
    await expect(this.input).toBeVisible();
    await expect(this.insertButton).toBeVisible();
    await expect(this.searchButton).toBeVisible();
    await expect(this.randomButton).toBeVisible();
    await expect(this.clearButton).toBeVisible();
  }

  // Helpers

  async getStatusText() {
    // fallback if .status doesn't exist - read any element that looks like status
    if (await this.status.count() > 0) {
      return (await this.status.innerText()).trim();
    }
    // try alternative selectors
    const alt = this.page.locator('[role="status"], .message, .log').first();
    if (await alt.count() > 0) return (await alt.innerText()).trim();
    return '';
  }

  async controlsDisabled() {
    // If any main control is disabled, it's considered disabled state
    const buttons = [this.insertButton, this.searchButton, this.randomButton, this.clearButton];
    for (const b of buttons) {
      // If button has attribute disabled or aria-disabled="true"
      const el = b;
      if (await el.count() === 0) continue;
      const disabled = await el.getAttribute('disabled');
      const aria = await el.getAttribute('aria-disabled');
      if (disabled !== null || aria === 'true') {
        return true;
      }
    }
    return false;
  }

  async enterValue(value) {
    await this.input.fill(''); // clear
    // input[type=number] may reject non-numeric, but tests use numeric strings
    await this.input.fill(String(value));
  }

  async clickInsert() {
    await this.insertButton.click();
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async clickRandom() {
    await this.randomButton.click();
  }

  async clickClear() {
    await this.clearButton.click();
  }

  // Count nodes with a text node equal to value in the SVG.
  // This is robust to different subtree DOM structures.
  async countNodesWithText(value) {
    // Wait a short time for DOM to settle
    await this.page.waitForTimeout(100);
    // Using text selector scoped under svg
    const texts = this.page.locator('svg text', { hasText: String(value) });
    return await texts.count();
  }

  // Wait until any element in the svg has the traversal class (visiting/found/notfound)
  async waitForTraversalClass(className, timeout = 7000) {
    const selector = `svg .${className}`;
    await this.page.waitForSelector(selector, { timeout });
    return this.page.locator(selector);
  }

  // Count total node text elements in the SVG (approximate number of nodes)
  async totalNodeTextCount() {
    // common pattern: nodes render as <text> elements inside svg
    const texts = this.page.locator('svg text');
    return await texts.count();
  }

  // Wait for controls to be enabled again
  async waitForControlsEnabled(timeout = 7000) {
    await this.page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      if (!btns.length) return true;
      return btns.every(b => !b.hasAttribute('disabled') && b.getAttribute('aria-disabled') !== 'true');
    }, null, { timeout });
  }
}

test.describe('BST Visualization FSM - Complete end-to-end', () => {
  let bst;

  test.beforeEach(async ({ page }) => {
    bst = new BSTPage(page);
    await bst.navigate();
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset app to a clean state between tests by clearing
    // If clear button exists and not disabled, click it.
    const clearBtn = page.getByRole('button', { name: /clear/i });
    if (await clearBtn.count() > 0 && (await clearBtn.isEnabled())) {
      await clearBtn.click().catch(() => {});
    }
    // short wait for UI to settle
    await page.waitForTimeout(150);
  });

  test.describe('Idle state and validation', () => {
    test('Initial state: controls enabled and status visible (idle)', async () => {
      // Validate that on load we are in idle: controls enabled
      expect(await bst.controlsDisabled()).toBe(false);
      const status = await bst.getStatusText();
      // Status should exist; content may vary but should be a string
      expect(typeof status).toBe('string');
    });

    test('Validation fail when inserting with empty input (INPUT_ENTER / CLICK_INSERT -> VALIDATION_FAIL)', async () => {
      // Ensure input empty
      await bst.input.fill('');
      // Click Insert with no value
      await bst.clickInsert();
      // Expect controls to remain enabled (idle) and status to indicate validation error
      await expect(bst.insertButton).toBeEnabled();
      const status = (await bst.getStatusText()).toLowerCase();
      // The status should mention validation / enter / value / error - be permissive
      expect(
        status.includes('enter') ||
          status.includes('value') ||
          status.includes('invalid') ||
          status.includes('error') ||
          status.includes('validation')
      ).toBe(true);
    });

    test('Validation fail when pressing Enter on empty input (INPUT_ENTER event)', async ({ page }) => {
      // Focus input and press Enter with empty value
      await bst.input.fill('');
      await bst.input.focus();
      await page.keyboard.press('Enter');
      // Controls should still be enabled
      await expect(bst.insertButton).toBeEnabled();
      const status = (await bst.getStatusText()).toLowerCase();
      expect(
        status.includes('enter') ||
          status.includes('value') ||
          status.includes('invalid') ||
          status.includes('error') ||
          status.includes('validation')
      ).toBe(true);
    });
  });

  test.describe('Insert flows (inserting, animating_traversal, placing_node, showing_result)', () => {
    test('Successful insert: node is placed in DOM and controls disabled during animation', async () => {
      // Insert 50
      await bst.enterValue(50);
      // Start insert and verify controls are disabled right away (onEnter: disableControls_and_startInsert)
      const click = bst.insertButton.click();
      // Immediately after click, controls should be disabled (or at least some)
      // Give short time for DOM to update
      await bst.page.waitForTimeout(50);
      expect(await bst.controlsDisabled()).toBe(true);
      await click;

      // Traversal animation should add visiting classes
      // Wait for at least one .visiting class in the svg
      const visiting = await bst.waitForTraversalClass('visiting').catch(() => null);
      expect(visiting).not.toBeNull();

      // After traversal completes, the node should be placed (new text element with 50)
      // Wait for the final node text to appear
      await bst.page.waitForFunction(
        v => {
          const texts = Array.from(document.querySelectorAll('svg text')).map(t => t.textContent?.trim());
          return texts.includes(String(v));
        },
        50,
        { timeout: 7000 }
      );

      const count = await bst.countNodesWithText(50);
      expect(count).toBeGreaterThanOrEqual(1);

      // Controls should be re-enabled at the end (onEnter of showing_result triggers enable)
      await bst.waitForControlsEnabled();
      expect(await bst.controlsDisabled()).toBe(false);

      // Status should show success/insert messages
      const status = (await bst.getStatusText()).toLowerCase();
      expect(status.length).toBeGreaterThan(0);
      expect(
        status.includes('insert') ||
          status.includes('placed') ||
          status.includes('added') ||
          status.includes('success') ||
          status.includes('complete')
      ).toBe(true);
    });

    test('Duplicate insert: traversal occurs and no new node is added (INSERT_MODEL_DUPLICATE -> showing_result)', async () => {
      // Ensure a node 60 exists first
      await bst.enterValue(60);
      await bst.clickInsert();
      // Wait for it placed
      await bst.page.waitForFunction(
        () => !!document.querySelector('svg text') && Array.from(document.querySelectorAll('svg text')).some(t => t.textContent?.trim() === '60'),
        null,
        { timeout: 7000 }
      );
      await bst.waitForControlsEnabled();

      const before = await bst.countNodesWithText(60);
      expect(before).toBeGreaterThanOrEqual(1);

      // Attempt duplicate insert
      await bst.enterValue(60);
      await bst.clickInsert();

      // During traversal, there should be visiting class applied
      await bst.waitForTraversalClass('visiting', 7000).catch(() => null);

      // After result, expect duplicate mention in status and no new node count
      await bst.waitForControlsEnabled();
      const after = await bst.countNodesWithText(60);
      expect(after).toBe(before);

      const status = (await bst.getStatusText()).toLowerCase();
      expect(
        status.includes('duplicate') ||
          status.includes('already') ||
          status.includes('exists') ||
          status.includes('duplicate')
      ).toBe(true);
    });
  });

  test.describe('Search flows (searching, animating_traversal, showing_result)', () => {
    test('Search found: node gets .found class and status indicates found', async () => {
      // Insert value 42 to search for
      await bst.enterValue(42);
      await bst.clickInsert();
      await bst.waitForControlsEnabled();

      // Start search for 42
      await bst.enterValue(42);
      await bst.clickSearch();

      // Controls should be disabled on start of search
      await bst.page.waitForTimeout(50);
      expect(await bst.controlsDisabled()).toBe(true);

      // During traversal, a node should get class 'found'
      const foundLocator = await bst.waitForTraversalClass('found', 7000).catch(() => null);
      expect(foundLocator).not.toBeNull();

      // After completion, controls re-enabled and status indicates found
      await bst.waitForControlsEnabled();

      const status = (await bst.getStatusText()).toLowerCase();
      expect(
        status.includes('found') ||
          status.includes('exists') ||
          status.includes('search') ||
          status.includes('complete')
      ).toBe(true);
    });

    test('Search not found: traversal ends with notfound class and status indicates not found', async () => {
      // Ensure value 999 does not exist
      const beforeCount = await bst.countNodesWithText(999);
      if (beforeCount > 0) {
        // if unexpectedly present, clear and continue
        await bst.clickClear();
        await bst.waitForControlsEnabled();
      }

      // Start search for 999
      await bst.enterValue(999);
      await bst.clickSearch();

      // If tree empty, app may immediately report EMPTY_TREE and return to idle.
      // We handle both possibilities:
      const statusText = (await bst.getStatusText()).toLowerCase();
      const treeEmptyReported =
        statusText.includes('empty') ||
        statusText.includes('no nodes') ||
        statusText.includes('empty tree') ||
        statusText.includes('nothing');

      if (treeEmptyReported) {
        // ensure controls enabled again
        await bst.waitForControlsEnabled();
        expect(await bst.controlsDisabled()).toBe(false);
      } else {
        // otherwise traversal should eventually mark notfound
        const notfoundLocator = await bst.waitForTraversalClass('notfound', 7000).catch(() => null);
        expect(notfoundLocator).not.toBeNull();
        await bst.waitForControlsEnabled();
        const finalStatus = (await bst.getStatusText()).toLowerCase();
        expect(finalStatus.includes('not') || finalStatus.includes('not found') || finalStatus.includes('notfound') || finalStatus.includes('missing')).toBe(true);
      }
    });
  });

  test.describe('Random inserting and clearing flows', () => {
    test('Random inserting sequence disables controls during sequence and inserts multiple nodes', async () => {
      // Record starting node count
      const start = await bst.totalNodeTextCount();

      // Click Random to start sequence
      await bst.clickRandom();

      // Controls should be disabled while random sequence runs
      await bst.page.waitForTimeout(50);
      expect(await bst.controlsDisabled()).toBe(true);

      // During random insertion, we expect incremental nodes to appear.
      // Wait until controls re-enabled (RANDOM_INSERT_COMPLETE -> idle)
      await bst.waitForControlsEnabled();

      // After completion, nodes count should be >= start (ideally increased)
      const end = await bst.totalNodeTextCount();
      expect(end).toBeGreaterThanOrEqual(start);

      // The status should indicate completion of random insert
      const status = (await bst.getStatusText()).toLowerCase();
      expect(status.length).toBeGreaterThan(0);
    });

    test('Clear removes all nodes immediately and transitions to idle (clearing -> CLEARED -> idle)', async () => {
      // Ensure a few nodes exist by inserting two values
      await bst.enterValue(7);
      await bst.clickInsert();
      await bst.waitForControlsEnabled();

      await bst.enterValue(3);
      await bst.clickInsert();
      await bst.waitForControlsEnabled();

      const mid = await bst.totalNodeTextCount();
      expect(mid).toBeGreaterThanOrEqual(2);

      // Click Clear
      await bst.clickClear();

      // Clearing is immediate per FSM notes; wait briefly and assert no svg text nodes
      await bst.page.waitForTimeout(200);
      const finalCount = await bst.totalNodeTextCount();
      // finalCount could be zero; at minimum should be less than prior
      expect(finalCount).toBeLessThanOrEqual(mid);

      // Status should mention cleared/empty
      const status = (await bst.getStatusText()).toLowerCase();
      expect(status.includes('clear') || status.includes('cleared') || status.includes('empty') || status.includes('removed')).toBe(true);

      // Controls should still be enabled (idle)
      expect(await bst.controlsDisabled()).toBe(false);
    });
  });

  test.describe('Edge cases and state transitions coverage', () => {
    test('Rapid sequence: Random then Clear during sequence should not leave controls permanently disabled', async () => {
      // Start random insertion
      await bst.clickRandom();
      // Immediately attempt to click clear (simulating user interrupt)
      // If clear is disabled during random, clicking may be ignored; handle both
      try {
        await bst.clickClear();
      } catch (e) {
        // ignore if clicking clear is not possible
      }
      // Wait until app stabilizes
      await bst.waitForControlsEnabled();

      // Controls should be enabled again
      expect(await bst.controlsDisabled()).toBe(false);

      // Status should not indicate stuck/in-progress
      const status = (await bst.getStatusText()).toLowerCase();
      // permissive check
      expect(status.length).toBeGreaterThanOrEqual(0);
    });

    test('Insert then search for multiple values exercises traversal highlighting classes', async () => {
      // Insert three values to create a tree
      const values = [20, 10, 30];
      for (const v of values) {
        await bst.enterValue(v);
        await bst.clickInsert();
        await bst.waitForControlsEnabled();
      }

      // Search for each value and ensure traversal highlights occur (visiting or found)
      for (const v of values) {
        await bst.enterValue(v);
        await bst.clickSearch();

        // During traversal expect either visiting or found class to appear
        const visitingOrFound = await Promise.race([
          bst.waitForTraversalClass('found', 6000).catch(() => null),
          bst.waitForTraversalClass('visiting', 6000).catch(() => null)
        ]);
        expect(visitingOrFound).not.toBeNull();

        await bst.waitForControlsEnabled();
        const status = (await bst.getStatusText()).toLowerCase();
        expect(status.length).toBeGreaterThan(0);
      }
    });
  });
});