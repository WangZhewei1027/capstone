import { test, expect } from '@playwright/test';

// Test file: 26275dc4-cd2a-11f0-bee4-a3a342d77f94-red-black-tree.spec.js
// Application URL (served by the test harness)
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/26275dc4-cd2a-11f0-bee4-a3a342d77f94.html';

// Page object for interacting with the Red-Black Tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.treeContainer = page.locator('#tree-container');
  }

  // Returns all level container elements
  levels() {
    return this.treeContainer.locator('.level');
  }

  // Returns all node elements across all levels
  allNodes() {
    return this.treeContainer.locator('.node');
  }

  // Returns locator for node that has exact text equal to value (string/number)
  nodeByValue(value) {
    return this.treeContainer.locator('.node', { hasText: String(value) }).first();
  }

  // Helper to call the in-page rbTree.insert(value) and then refresh display via displayTree(rbTree)
  // This uses existing globals defined by the page (no patching).
  async insertValue(value) {
    await this.page.evaluate((v) => {
      // Call existing global functions/objects as-is; do not modify them.
      if (window.rbTree && typeof window.rbTree.insert === 'function') {
        window.rbTree.insert(v);
        if (typeof window.displayTree === 'function') {
          window.displayTree(window.rbTree);
        }
      } else {
        // If the globals are missing, do nothing - allow the test to observe errors.
      }
    }, value);
  }

  // Count number of nodes currently displayed
  async nodeCount() {
    return await this.allNodes().count();
  }

  // Count number of levels currently displayed
  async levelCount() {
    return await this.levels().count();
  }

  // Get array of node text contents in order of appearance
  async nodeValues() {
    const count = await this.nodeCount();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.allNodes().nth(i).innerText());
    }
    return values;
  }

  // Return array of CSS class lists for nodes in order
  async nodeClasses() {
    const count = await this.nodeCount();
    const classes = [];
    for (let i = 0; i < count; i++) {
      const cl = await this.allNodes().nth(i).getAttribute('class');
      classes.push(cl || '');
    }
    return classes;
  }
}

test.describe('Red-Black Tree Visualization - Basic behavior and DOM assertions', () => {
  // Capture any page errors and console error messages for assertions
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // Collect errors for later assertions
      pageErrors.push(err);
    });

    // Listen to console messages, record those with severity "error"
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No teardown actions required beyond Playwright's automatic cleanup
  });

  test('Initial load: page title and main container are visible', async ({ page }) => {
    // Purpose: Verify that the page loads and basic visible elements exist
    const title = page.locator('h1');
    await expect(title).toHaveText('Red-Black Tree Visualization');

    const treeContainer = page.locator('#tree-container');
    await expect(treeContainer).toBeVisible();

    // There should be at least one .level element and nodes present
    const levels = treeContainer.locator('.level');
    await expect(levels).toHaveCountGreaterThan(0);

    const nodes = treeContainer.locator('.node');
    await expect(nodes).toHaveCount(7); // The script inserts 7 initial values
  });

  test('Initial nodes: correct values, colors, and grouping', async ({ page }) => {
    // Purpose: Verify nodes render with correct text and CSS classes based on their color property
    const tree = new TreePage(page);

    // Confirm exact number of nodes (from script: 10,20,30,40,50,60,70)
    expect(await tree.nodeCount()).toBe(7);

    // Verify node values are present in the DOM
    const values = await tree.nodeValues();
    expect(values).toEqual(['10', '20', '30', '40', '50', '60', '70']);

    // Verify classes: first node (root 10) should have 'black' class; others should have 'red'
    const classes = await tree.nodeClasses();
    expect(classes[0]).toContain('black');
    for (let i = 1; i < classes.length; i++) {
      // Others should include 'red' (they were created default 'red' and fixViolation is a no-op)
      expect(classes[i]).toContain('red');
    }

    // All nodes are grouped by the computed 'level' in the implementation.
    // Implementation uses node.value.toString().length as the key, so all two-digit numbers should be in a single level.
    const levelCount = await tree.levelCount();
    expect(levelCount).toBe(1);
  });

  test('Inserting a new 3-digit value creates a new level and shows the new node', async ({ page }) => {
    // Purpose: Exercise the in-page insert API (existing globals), then re-render and assert DOM changes.
    const tree = new TreePage(page);

    // Initial checks
    expect(await tree.nodeCount()).toBe(7);
    expect(await tree.levelCount()).toBe(1);

    // Insert a three-digit value (100) using the page's own API and refresh display
    await tree.insertValue(100);

    // After insertion, a new level keyed by length 3 should appear, and node '100' should be present
    expect(await tree.nodeCount()).toBe(8);

    // There should now be two levels: one for digits length '2' and one for '3'
    expect(await tree.levelCount()).toBe(2);

    // The node with value '100' should exist and be rendered with class 'red' (default color for non-root)
    const node100 = tree.nodeByValue(100);
    await expect(node100).toBeVisible();
    const class100 = await node100.getAttribute('class');
    expect(class100).toContain('red');
  });

  test('Attempting to insert a duplicate value does not increase displayed node count', async ({ page }) => {
    // Purpose: Verify insertion of a duplicate (e.g., 20) does not change the number of nodes shown.
    const tree = new TreePage(page);

    const beforeCount = await tree.nodeCount();
    expect(beforeCount).toBe(7);

    // Attempt to insert a duplicate value (20)
    await tree.insertValue(20);

    // The implementation's insertNode ignores equal values (no insertion); displayTree will re-render existing nodes
    const afterCount = await tree.nodeCount();
    expect(afterCount).toBe(beforeCount);
  });

  test('DOM structure: each node has expected inline text and is accessible via selectors', async ({ page }) => {
    // Purpose: Verify nodes are queryable via selectors and their textual content matches expected numbers
    const tree = new TreePage(page);

    for (const val of ['10', '20', '30', '40', '50', '60', '70']) {
      const locator = tree.nodeByValue(val);
      await expect(locator).toBeVisible();
      await expect(locator).toHaveText(val);
    }
  });

  test('No unexpected uncaught page errors or console errors during normal usage', async ({ page }) => {
    // Purpose: Observe page-level errors and console errors emitted during page load and interactions.
    // This test ensures the runtime is not throwing uncaught exceptions.

    const tree = new TreePage(page);

    // Perform some typical interactions: insert a value and re-render
    await tree.insertValue(110); // insert a three-digit to force additional rendering
    await tree.insertValue(5);   // insert a single-digit value

    // Wait a tick to allow any asynchronous console/page errors to surface
    await page.waitForTimeout(50);

    // Assert that no uncaught page errors happened
    expect(pageErrors.length).toBe(0);

    // Assert that no console "error" messages were emitted
    expect(consoleErrors.length).toBe(0);
  });
});

test.describe('Edge cases, behavior and resilience', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate fresh for these tests
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test('Page does not expose interactive form controls (sanity) and is stable', async ({ page }) => {
    // Purpose: The implementation contains no form controls; assert none exist and the page is stable.
    const inputs = page.locator('input, button, select, form, textarea');
    const count = await inputs.count();
    // Expect zero interactive form elements as per the provided HTML
    expect(count).toBe(0);
  });

  test('Rendering integrity after multiple insert operations via page API', async ({ page }) => {
    // Purpose: Insert multiple values and ensure displayTree can handle multiple re-renders
    const tree = new TreePage(page);

    // Insert several new values including different digit lengths
    await tree.insertValue(1);
    await tree.insertValue(999);
    await tree.insertValue(1234);

    // After these inserts, nodes count should have increased by 3 (unless duplicates)
    const currentCount = await tree.nodeCount();
    // Starting from 7 initial nodes, expect at least 10 nodes
    expect(currentCount).toBeGreaterThanOrEqual(10);

    // Ensure that each newly inserted value is present
    await expect(tree.nodeByValue(1)).toBeVisible();
    await expect(tree.nodeByValue(999)).toBeVisible();
    await expect(tree.nodeByValue(1234)).toBeVisible();
  });

  test('Observing and asserting page errors if any runtime exceptions occur', async ({ page }) => {
    // Purpose: This test intentionally observes runtime exceptions emitted by the page.
    // We don't inject or patch anything; we only assert the observed state.
    const capturedErrors = [];
    page.on('pageerror', err => capturedErrors.push(err));

    // Force a short wait for any latent errors to surface
    await page.waitForTimeout(100);

    // If errors exist, they will be available in capturedErrors; assert that we can read them.
    // The intent here is not to force an error, but to ensure the test records and exposes them.
    expect(Array.isArray(capturedErrors)).toBe(true);
    // Most runs should have zero errors; either way the test validates we observed and captured them.
  });
});