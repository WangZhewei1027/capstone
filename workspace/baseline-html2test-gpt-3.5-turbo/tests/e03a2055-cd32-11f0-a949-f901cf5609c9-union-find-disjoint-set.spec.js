import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2055-cd32-11f0-a949-f901cf5609c9.html';

// Page object encapsulating common interactions with the Union-Find demo
class UnionFindPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sizeInput = page.locator('#sizeInput');
    this.initBtn = page.locator('#initBtn');
    this.operationsDiv = page.locator('#operations');
    this.unionX = page.locator('#unionX');
    this.unionY = page.locator('#unionY');
    this.unionBtn = page.locator('#unionBtn');
    this.findX = page.locator('#findX');
    this.findBtn = page.locator('#findBtn');
    this.showSetsBtn = page.locator('#showSetsBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.output = page.locator('#output');
    this.setGroups = page.locator('#output .set-group');
    this.setItems = page.locator('#output .set-item');
  }

  // Initialize the Union-Find with a given size (clicks Initialize)
  async initialize(size = 10) {
    await this.sizeInput.fill(String(size));
    await this.initBtn.click();
  }

  // Perform a union operation by filling X and Y and clicking Union
  async union(x, y) {
    await this.unionX.fill(String(x));
    await this.unionY.fill(String(y));
    await this.unionBtn.click();
  }

  // Perform a find operation by filling X and clicking Find
  async find(x) {
    await this.findX.fill(String(x));
    await this.findBtn.click();
  }

  // Click show sets
  async showSets() {
    await this.showSetsBtn.click();
  }

  // Click reset
  async reset() {
    await this.resetBtn.click();
  }

  // Get current output text
  async outputText() {
    return await this.output.textContent();
  }

  // Returns array of groups, each group is array of element text values as strings
  async getGroups() {
    const groups = [];
    const groupCount = await this.setGroups.count();
    for (let i = 0; i < groupCount; i++) {
      const group = this.setGroups.nth(i);
      const items = group.locator('.set-item');
      const itemCount = await items.count();
      const vals = [];
      for (let j = 0; j < itemCount; j++) {
        vals.push((await items.nth(j).textContent()).trim());
      }
      groups.push(vals);
    }
    return groups;
  }
}

test.describe('Union-Find (Disjoint Set) Visualizer - e03a2055-cd32-11f0-a949-f901cf5609c9', () => {
  // Collect console errors and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Reset any autoplay dialogs by accepting automatically if shown
    page.on('dialog', async dialog => {
      // Accept any alert/confirm to allow tests to continue
      await dialog.accept();
    });
  });

  // Test initial page load and default state
  test('Initial load: elements present, operations hidden, output empty', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'load' });

    const uf = new UnionFindPage(page);

    // Verify static controls exist
    await expect(uf.sizeInput).toBeVisible();
    await expect(uf.initBtn).toBeVisible();
    await expect(uf.output).toBeVisible();

    // Operations section should be hidden by default
    await expect(uf.operationsDiv).toHaveCSS('display', 'none');

    // Output should initially be empty or whitespace only
    const text = (await uf.outputText()) || '';
    expect(text.trim()).toBe('');

    // Assert no unexpected console errors or page errors occurred during load
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    expect(pageErrors, `Page errors: ${pageErrors.join('\n')}`).toEqual([]);
  });

  // Group tests that exercise the main workflows after initialization
  test.describe('After initialization', () => {
    test('Initialize with valid size displays operations and individual sets', async ({ page }) => {
      const consoleErrors1 = [];
      const pageErrors1 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf1 = new UnionFindPage(page);

      // Initialize with default 10 elements
      await uf.initialize(10);

      // Operations should be visible
      await expect(uf.operationsDiv).toHaveCSS('display', 'block');

      // Output should contain initialization message
      const out = await uf.outputText();
      expect(out).toContain('✅ Initialized Union-Find structure with 10 elements (0 to 9).');

      // Because each element is alone, we expect 10 set-group elements
      const groups1 = await uf.getGroups();
      expect(groups.length).toBe(10);

      // Confirm that each group contains a single element with correct labels 0..9
      const flattened = groups.flat().map(s => s.trim());
      for (let i = 0; i < 10; i++) {
        expect(flattened).toContain(String(i));
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Union two elements merges their sets and updates DOM', async ({ page }) => {
      const consoleErrors2 = [];
      const pageErrors2 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf2 = new UnionFindPage(page);
      await uf.initialize(10);

      // Perform union of 2 and 3
      await uf.union(2, 3);

      // After union, expect a log message about merging
      const outAfterUnion = await uf.outputText();
      expect(outAfterUnion).toContain('🔗 Union done: merged sets containing 2 and 3.');

      // The sets should now have one fewer group: 9 groups
      const groups2 = await uf.getGroups();
      expect(groups.length).toBe(9);

      // Find group that contains '2' and ensure it also contains '3'
      const groupWith2 = groups.find(g => g.includes('2'));
      expect(groupWith2).toBeDefined();
      expect(groupWith2).toContain('3');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Unioning already connected elements logs informational message and keeps sets unchanged', async ({ page }) => {
      const consoleErrors3 = [];
      const pageErrors3 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf3 = new UnionFindPage(page);
      await uf.initialize(10);

      // union 5 and 6, then union 5 and 6 again
      await uf.union(5, 6);
      const groupsAfterFirst = await uf.getGroups();
      expect(groupsAfterFirst.length).toBe(9);

      await uf.union(5, 6); // should log that they're already in same set
      const outText = await uf.outputText();
      expect(outText).toContain('ℹ️ Elements 5 and 6 are already in the same set.');

      // Groups count remains the same after attempting the redundant union
      const groupsAfterSecond = await uf.getGroups();
      expect(groupsAfterSecond.length).toBe(groupsAfterFirst.length);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Union with identical elements logs a skip warning and does not merge', async ({ page }) => {
      const consoleErrors4 = [];
      const pageErrors4 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf4 = new UnionFindPage(page);
      await uf.initialize(10);

      // Attempt union where x === y
      await uf.union(4, 4);

      const out1 = await uf.outputText();
      expect(out).toContain('⚠️ Union operation skipped: elements are the same (4).');

      // Ensure sets still 10 (no change)
      const groups3 = await uf.getGroups();
      expect(groups.length).toBe(10);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Find operation reports representative root correctly after unions', async ({ page }) => {
      const consoleErrors5 = [];
      const pageErrors5 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf5 = new UnionFindPage(page);
      await uf.initialize(10);

      // union 2 and 3, then find 3 should refer to representative 2 (per implementation)
      await uf.union(2, 3);

      await uf.find(3);
      const out2 = await uf.outputText();
      // Output should mention find operation and the root (likely 2)
      expect(out).toContain('🔎 Find operation: element 3 belongs to set represented by');

      // Extract the representative from the last line (simple check that a digit appears)
      const matches = out.match(/represented by (\d+)/);
      expect(matches).not.toBeNull();
      const rep = Number(matches[1]);
      // Representative must be either 2 or 3 depending on internal balancing; ensure correctness by verifying group membership
      const groups4 = await uf.getGroups();
      const groupOf3 = groups.find(g => g.includes('3'));
      expect(groupOf3).toBeDefined();
      expect(groupOf3).toContain(String(rep));

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Show All Sets button re-displays current grouping without errors', async ({ page }) => {
      const consoleErrors6 = [];
      const pageErrors6 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf6 = new UnionFindPage(page);
      await uf.initialize(6);

      // Make some unions
      await uf.union(0, 1);
      await uf.union(2, 3);

      // Now click show sets to force a re-render of sets
      await uf.showSets();

      const out3 = await uf.outputText();
      // Should list sets and include "Set 1" etc and set-item spans for elements
      expect(out).toContain('There are');
      const groups5 = await uf.getGroups();
      expect(groups.length).toBeLessThanOrEqual(6);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Reset hides operations and clears structure', async ({ page }) => {
      const consoleErrors7 = [];
      const pageErrors7 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf7 = new UnionFindPage(page);
      await uf.initialize(5);

      // Reset the structure
      await uf.reset();

      // Operations should be hidden
      await expect(uf.operationsDiv).toHaveCSS('display', 'none');

      // Output should contain reset message
      const out4 = await uf.outputText();
      expect(out).toContain('🗑️ Reset done. Please initialize a new Union-Find structure.');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // Tests for edge cases and error handling paths
  test.describe('Edge cases and validation', () => {
    test('Initializing with invalid size triggers alert and does not initialize', async ({ page }) => {
      const consoleErrors8 = [];
      const pageErrors8 = [];
      const dialogs = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      // Collect dialogs shown
      page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        await dialog.accept();
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf8 = new UnionFindPage(page);

      // Enter invalid size 0 and click initialize
      await uf.sizeInput.fill('0');
      await uf.initBtn.click();

      // An alert is expected: "Please enter a valid number of elements between 1 and 30."
      // Ensure at least one dialog was shown
      expect(dialogs.length).toBeGreaterThanOrEqual(1);
      const lastDialog = dialogs[dialogs.length - 1];
      expect(lastDialog.message).toContain('Please enter a valid number of elements between 1 and 30.');

      // Operations should remain hidden and output should not contain initialization message
      await expect(uf.operationsDiv).toHaveCSS('display', 'none');
      const out5 = await uf.outputText();
      expect(out).not.toContain('Initialized Union-Find structure');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Union with out-of-bounds element logs a warning and does not throw', async ({ page }) => {
      const consoleErrors9 = [];
      const pageErrors9 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.goto(APP_URL, { waitUntil: 'load' });
      const uf9 = new UnionFindPage(page);

      await uf.initialize(5); // valid elements 0..4

      // Attempt union with an out-of-range element 6
      await uf.union(6, 1);

      // Output should contain out-of-bounds warning
      const out6 = await uf.outputText();
      expect(out).toContain('⚠️ Element 6 is out of bounds (0 to 4).');

      // Ensure structure still exists and groups count remains 5
      const groups6 = await uf.getGroups();
      expect(groups.length).toBe(5);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // Final test to ensure no unexpected runtime errors occur during typical usage
  test('No uncaught page errors or console errors during typical scenarios', async ({ page }) => {
    const consoleErrors10 = [];
    const pageErrors10 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await page.goto(APP_URL, { waitUntil: 'load' });
    const uf10 = new UnionFindPage(page);

    // Run a sequence of typical operations
    await uf.initialize(8);
    await uf.union(1, 2);
    await uf.union(3, 4);
    await uf.union(1, 4);
    await uf.find(4);
    await uf.showSets();
    await uf.reset();

    // There should be no console errors or uncaught page errors
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    expect(pageErrors, `Page errors: ${pageErrors.join('\n')}`).toEqual([]);
  });
});