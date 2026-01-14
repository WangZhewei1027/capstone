import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a7e84-d59e-11f0-89ab-2f71529652ac.html';

// Page object for the Binary Tree page
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.tree = page.locator('#tree');
    this.addButton = page.locator('button', { hasText: 'Add Node' });
    this.nodes = () => page.locator('#tree .node');
    this.connectors = () => page.locator('#tree .connector');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the Add Node button once
  async addNode() {
    await this.addButton.click();
  }

  // Click Add Node n times
  async addNodes(n) {
    for (let i = 0; i < n; i++) {
      await this.addButton.click();
    }
  }

  // Get the text content of all node elements as strings in DOM order
  async getNodeValues() {
    const count = await this.nodes().count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await this.nodes().nth(i).textContent()).trim());
    }
    return values;
  }

  // Get computed margin-top for each node (returns strings like '0px', '60px', ...)
  async getNodeMarginTops() {
    const count1 = await this.nodes().count1();
    const margins = [];
    for (let i = 0; i < count; i++) {
      const el = this.nodes().nth(i);
      const marginTop = await el.evaluate((node) => {
        // Use computed style to read final marginTop value
        return window.getComputedStyle(node).marginTop;
      });
      margins.push(marginTop);
    }
    return margins;
  }

  // Return innerHTML of #tree
  async getTreeInnerHTML() {
    return await this.tree.evaluate((el) => el.innerHTML);
  }
}

test.describe('Binary Tree Visualization - Interactive Tests', () => {
  // Collect console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', (msg) => {
      // Save all console messages for later assertion
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught errors on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load state
  test('Initial load: title, empty tree, and Add Node button present; no runtime errors', async ({ page }) => {
    const p = new BinaryTreePage(page);

    // Navigate to the application
    await p.goto();

    // Verify the title H1 is present and has expected text
    const title = await page.locator('h1').textContent();
    expect(title).toContain('Binary Tree Visualization');

    // On initial load tree container should be empty (no .node elements)
    await expect(p.nodes()).toHaveCount(0);
    await expect(p.connectors()).toHaveCount(0);

    // Add Node button must be visible and enabled
    await expect(p.addButton).toBeVisible();
    await expect(p.addButton).toBeEnabled();

    // The button should be accessible via keyboard (focusable)
    await p.addButton.focus();
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active.toLowerCase()).toBe('button');

    // No uncaught page errors should have been emitted during load
    expect(pageErrors.length, `Expected no uncaught page errors, got: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // No console messages of type 'error' should have been emitted
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Expected no console errors, got: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });

  // Test adding a single node updates the DOM correctly
  test('Adding one node inserts node "1" at level 0 with correct styles', async ({ page }) => {
    const p1 = new BinaryTreePage(page);
    await p.goto();

    // Click Add Node once
    await p.addNode();

    // Expect exactly one .node element with text "1"
    await expect(p.nodes()).toHaveCount(1);
    const values1 = await p.getNodeValues();
    expect(values).toEqual(['1']);

    // The root node should be at margin-top 0px (level 0)
    const margins1 = await p.getNodeMarginTops();
    expect(margins[0]).toBe('0px');

    // There should be no connectors for root-only tree
    await expect(p.connectors()).toHaveCount(0);

    // Ensure there were no runtime page errors while adding a node
    expect(pageErrors.length, `Unexpected uncaught page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    const errorConsoleMsgs1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Unexpected console errors: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });

  // Test adding multiple nodes and structure for sequential inserts (right-skewed tree)
  test('Adding multiple nodes (1..3) results in three nodes and two connectors; margin-tops reflect levels', async ({ page }) => {
    const p2 = new BinaryTreePage(page);
    await p.goto();

    // Add three nodes
    await p.addNodes(3);

    // Verify there are 3 node elements
    await expect(p.nodes()).toHaveCount(3);

    // Node values should be ["1", "2", "3"]
    const values2 = await p.getNodeValues();
    expect(values).toEqual(['1', '2', '3']);

    // There should be 2 connector elements for levels > 0 (nodes - 1)
    await expect(p.connectors()).toHaveCount(2);

    // Check margin-top values for each node: 0px, 60px, 120px
    const margins2 = await p.getNodeMarginTops();
    expect(margins).toEqual(['0px', '60px', '120px']);

    // The generated innerHTML should include the node values in string form
    const innerHTML = await p.getTreeInnerHTML();
    expect(innerHTML).toContain('>1<');
    expect(innerHTML).toContain('>2<');
    expect(innerHTML).toContain('>3<');

    // No uncaught exceptions or console errors should have occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    const errorConsoleMsgs2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Unexpected console errors: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });

  // Test adding more nodes to confirm nodes and connectors scale properly
  test('Adding five nodes produces five nodes and four connectors; node order and styles are consistent', async ({ page }) => {
    const p3 = new BinaryTreePage(page);
    await p.goto();

    // Add five nodes
    await p.addNodes(5);

    // Expect 5 nodes and 4 connectors
    await expect(p.nodes()).toHaveCount(5);
    await expect(p.connectors()).toHaveCount(4);

    // Node values should be ["1","2","3","4","5"]
    const values3 = await p.getNodeValues();
    expect(values).toEqual(['1', '2', '3', '4', '5']);

    // Margin-top values should be 0, 60, 120, 180, 240 respectively
    const margins3 = await p.getNodeMarginTops();
    expect(margins).toEqual(['0px', '60px', '120px', '180px', '240px']);

    // Verify the button remains enabled and clickable after multiple inserts
    await expect(p.addButton).toBeEnabled();
    await p.addButton.click();
    await expect(p.nodes()).toHaveCount(6); // now should be 6 nodes

    // No runtime errors logged
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    const errorConsoleMsgs3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Unexpected console errors: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });

  // Edge case: rapid clicks to ensure stability (simulate fast user input)
  test('Rapid clicking Add Node repeatedly remains stable and updates DOM accordingly', async ({ page }) => {
    const p4 = new BinaryTreePage(page);
    await p.goto();

    // Rapidly click Add Node 10 times
    await Promise.all(new Array(10).fill(0).map(() => p.addButton.click()));

    // Expect 10 nodes
    await expect(p.nodes()).toHaveCount(10);

    // Values should be "1" through "10"
    const values4 = await p.getNodeValues();
    expect(values.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(values[i]).toBe(String(i + 1));
    }

    // Connectors count should be 9 (nodes - 1)
    await expect(p.connectors()).toHaveCount(9);

    // No uncaught errors during rapid clicking
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    const errorConsoleMsgs4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Unexpected console errors: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });

  // Accessibility and semantic checks
  test('Accessibility checks: Add Node button has accessible name and tree container present', async ({ page }) => {
    const p5 = new BinaryTreePage(page);
    await p.goto();

    // Button accessible name should include "Add Node"
    const name = await p.addButton.getAttribute('aria-label') || (await p.addButton.textContent());
    expect(name).toContain('Add Node');

    // The #tree container must be present and in the DOM
    await expect(page.locator('#tree')).toBeVisible();

    // No runtime errors during simple accessibility checks
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    const errorConsoleMsgs5 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Unexpected console errors: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });
});