import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262736b0-cd2a-11f0-bee4-a3a342d77f94.html';

/**
 * Page Object for the Linked List demo page.
 * Encapsulates common interactions and queries to keep tests readable.
 */
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.list = page.locator('#linked-list');
    this.input = page.locator('#nodeValue');
    this.addButton = page.locator('button', { hasText: 'Add Node' });
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Add a node by typing into the input and clicking the button
  async addNode(value) {
    await this.input.fill(String(value));
    await this.addButton.click();
  }

  // Click add button without filling input (useful for alert test)
  async clickAddEmpty() {
    await this.addButton.click();
  }

  // Return the texts of node elements in order
  async getNodeValues() {
    const nodes = this.list.locator('.node');
    const count = await nodes.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await nodes.nth(i).innerText()).trim());
    }
    return values;
  }

  // Count node elements
  async nodeCount() {
    return this.list.locator('.node').count();
  }

  // Count arrow <span> elements used to render arrows between nodes
  async arrowCount() {
    // arrows are created as <span> elements directly inside the list
    return this.list.locator('span').count();
  }

  // Get raw innerHTML of list container (for initial-state testing)
  async listInnerHTML() {
    return this.page.locator('#linked-list').innerHTML();
  }

  // Get the current value of the input
  async inputValue() {
    return this.input.inputValue();
  }
}

test.describe('Linked List Demo - Interactive tests', () => {
  // Containers to collect runtime errors and console errors for each test
  let pageErrors = [];
  let consoleErrors = [];

  // Setup listener and navigate before each test
  test.beforeEach(async ({ page }) => {
    // reset arrays
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      // store error messages for assertions in afterEach or test bodies
      pageErrors.push(err);
    });

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // After each test we assert there were no unexpected runtime errors or console errors
  test.afterEach(async () => {
    // Assert there were no uncaught page errors
    expect(pageErrors.length, `Expected no page errors but found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    // Assert there were no console errors
    expect(consoleErrors.length, `Expected no console error messages but found ${consoleErrors.length}`).toBe(0);
  });

  test('Initial load: header and empty linked list container', async ({ page }) => {
    // Purpose: Verify the page loads and the linked list is initially empty
    const app = new LinkedListPage(page);

    // Validate document title contains the expected text
    await expect(page).toHaveTitle(/Linked List Demo/);

    // Header exists and has expected text
    const header = page.locator('h1');
    await expect(header).toHaveText('Simple Linked List Visualization');

    // The list container should initially have no .node elements
    const initialNodeCount = await app.nodeCount();
    expect(initialNodeCount).toBe(0);

    // And its innerHTML should be empty string
    const innerHTML = await app.listInnerHTML();
    expect(innerHTML.trim()).toBe('');
  });

  test('Adding a single node updates the DOM and clears the input', async ({ page }) => {
    // Purpose: Ensure adding one node creates a node element, the value matches,
    // and the input is cleared after adding.
    const app = new LinkedListPage(page);

    await app.addNode('Alpha');

    // After adding, there should be exactly one .node element
    expect(await app.nodeCount()).toBe(1);

    // The node text should be 'Alpha'
    const values = await app.getNodeValues();
    expect(values).toEqual(['Alpha']);

    // The input should be cleared after adding
    expect(await app.inputValue()).toBe('');
  });

  test('Adding multiple nodes preserves order and renders arrows between nodes', async ({ page }) => {
    // Purpose: Verify multiple additions result in a sequence of nodes with arrows
    const app = new LinkedListPage(page);

    // Add three nodes in sequence
    await app.addNode('First');
    await app.addNode('Second');
    await app.addNode('Third');

    // Node count should be 3
    expect(await app.nodeCount()).toBe(3);

    // Arrow count should be nodes - 1 = 2
    expect(await app.arrowCount()).toBe(2);

    // Values should be exactly in insertion order
    const values = await app.getNodeValues();
    expect(values).toEqual(['First', 'Second', 'Third']);
  });

  test('Edge case: adding duplicate values and numeric-like strings', async ({ page }) => {
    // Purpose: Verify list accepts duplicate values and stringified numbers
    const app = new LinkedListPage(page);

    // Add duplicates and numeric-like values
    await app.addNode('42');
    await app.addNode('42');
    await app.addNode('Hello');
    await app.addNode('42');

    // Node count should be 4
    expect(await app.nodeCount()).toBe(4);

    // Verify the sequence preserves insertion order including duplicates
    const values = await app.getNodeValues();
    expect(values).toEqual(['42', '42', 'Hello', '42']);

    // Arrows should be 3
    expect(await app.arrowCount()).toBe(3);
  });

  test('Attempting to add with empty input triggers an alert dialog with expected message', async ({ page }) => {
    // Purpose: Ensure user is alerted when trying to add a node with no input.
    const app = new LinkedListPage(page);

    // Ensure input is empty
    await app.input.fill('');
    expect(await app.inputValue()).toBe('');

    // Listen once for the dialog and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickAddEmpty()
    ]);

    // Dialog message should match the alert in the application
    expect(dialog.message()).toBe('Please enter a value for the node.');
    await dialog.accept();

    // Confirm that no nodes were added after dismissing the alert
    expect(await app.nodeCount()).toBe(0);
  });

  test('Visual structure: nodes are styled with .node class and arrows are text nodes', async ({ page }) => {
    // Purpose: Check that created node elements have the expected CSS class
    const app = new LinkedListPage(page);

    await app.addNode('Node1');
    await app.addNode('Node2');

    // Validate that each node element has the 'node' class
    const nodesLocator = page.locator('#linked-list .node');
    const count = await nodesLocator.count();
    expect(count).toBe(2);

    for (let i = 0; i < count; i++) {
      const classAttr = await nodesLocator.nth(i).getAttribute('class');
      expect(classAttr).toContain('node');
    }

    // Validate arrow elements are plain spans and contain the arrow glyph
    const arrowLocator = page.locator('#linked-list span');
    const arrowCount = await arrowLocator.count();
    expect(arrowCount).toBe(1);
    const arrowText = (await arrowLocator.nth(0).innerText()).trim();
    expect(arrowText).toBe('→');
  });
});