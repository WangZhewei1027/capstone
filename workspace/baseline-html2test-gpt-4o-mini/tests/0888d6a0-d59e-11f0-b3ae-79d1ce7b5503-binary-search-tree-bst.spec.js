import { test, expect } from '@playwright/test';

// URL of the page under test
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a0-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object Model for the BST demo page
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#nodeValue');
    this.addButton = page.getByRole('button', { name: 'Add Node' });
    this.bstContainer = page.locator('#bst');
    this.nodeSelector = '.node';
    this.nodeContainerSelector = '.node-container';
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the input to be present to ensure page loaded
    await expect(this.input).toBeVisible();
  }

  // Fill input and click Add Node button
  async addNode(value) {
    await this.input.fill(String(value));
    await this.addButton.click();
  }

  // Click add button without changing input (useful for empty input tests)
  async clickAdd() {
    await this.addButton.click();
  }

  // Get text contents of all nodes in document order
  async getAllNodeValues() {
    const nodes = await this.page.locator(this.nodeSelector).allTextContents();
    // Trim each string (safety)
    return nodes.map((t) => t.trim());
  }

  // Return number of node elements
  async getNodeCount() {
    return await this.page.locator(this.nodeSelector).count();
  }

  // Return number of node-container elements (represents rows/subtrees created)
  async getNodeContainerCount() {
    return await this.page.locator(this.nodeContainerSelector).count();
  }

  // Read the placeholder of the input
  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  // Read input value
  async getInputValue() {
    return await this.input.inputValue();
  }

  // Return inner HTML of bst container (for debug/structure assertions)
  async getBSTInnerHTML() {
    return await this.bstContainer.innerHTML();
  }
}

test.describe('Binary Search Tree (BST) Demonstration - UI and behavior', () => {
  // Arrays to capture console errors and uncaught page errors
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type "error"
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Capture unhandled exceptions reported to the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // In case tests left dialogs open, try to close them to not affect other tests
    // (Playwright will usually handle dialogs; this is a safety measure)
    try {
      await page.close();
    } catch (e) {
      // ignore
    }
  });

  // Test initial page load and default state of the application
  test('Initial load: UI elements present and BST empty', async ({ page }) => {
    const bst = new BSTPage(page);
    await bst.goto();

    // Verify heading is present
    await expect(page.locator('h1')).toHaveText('Binary Search Tree (BST) Demonstration');

    // Input and button visibility and attributes
    await expect(bst.input).toBeVisible();
    await expect(bst.addButton).toBeVisible();
    const placeholder = await bst.getInputPlaceholder();
    expect(placeholder).toBe('Enter a number');

    // BST container should be present but empty initially (no .node elements)
    const nodeCount = await bst.getNodeCount();
    expect(nodeCount).toBe(0);
    const containerHTML = await bst.getBSTInnerHTML();
    // Should be empty string (or whitespace), but ensure there are no node divs
    expect(containerHTML).not.toContain('class="node"');

    // Ensure no runtime console errors or page errors occurred while loading
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test adding a single node creates the root and clears the input
  test('Add a single number creates a root node and clears the input', async ({ page }) => {
    const bst1 = new BSTPage(page);
    await bst.goto();

    // Insert value 50
    await bst.addNode(50);

    // One .node element should exist with the correct text
    const nodeValues = await bst.getAllNodeValues();
    expect(nodeValues).toEqual(['50']);

    // Node container count should be at least 1
    const containerCount = await bst.getNodeContainerCount();
    expect(containerCount).toBeGreaterThanOrEqual(1);

    // Input should be cleared after successful insertion
    const inputValueAfter = await bst.getInputValue();
    expect(inputValueAfter).toBe('');

    // No console or page errors should have been emitted
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test building a larger BST and verify all nodes appear in the DOM
  test('Insert multiple nodes (left and right children) - nodes appear and count matches', async ({ page }) => {
    const bst2 = new BSTPage(page);
    await bst.goto();

    // Insert a sequence to create left and right branches
    const values = [50, 30, 70, 20, 40, 60, 80];
    for (const v of values) {
      await bst.addNode(v);
    }

    // All inserted values should appear somewhere in the DOM as .node elements
    const nodeValues1 = await bst.getAllNodeValues();
    // Since nodes are displayed within nested containers, order might vary in depth-driven traversal,
    // but every inserted value must be present.
    for (const v of values) {
      expect(nodeValues).toContain(String(v));
    }

    // Node count must equal number of inserted values
    const count = await bst.getNodeCount();
    expect(count).toBe(values.length);

    // The BST should have multiple node-container elements (each subtree creates containers)
    const containerCount1 = await bst.getNodeContainerCount();
    expect(containerCount).toBeGreaterThanOrEqual(3);

    // No runtime errors expected during these operations
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test behavior when adding invalid input: expect an alert dialog with specific text
  test('Adding invalid input shows alert and does not modify the BST', async ({ page }) => {
    const bst3 = new BSTPage(page);
    await bst.goto();

    // Ensure BST is empty at start
    expect(await bst.getNodeCount()).toBe(0);

    // Prepare to capture the dialog event triggered by alert()
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      bst.clickAdd(), // click with empty input which triggers alert
    ]);

    // Verify alert message
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a valid number');

    // Dismiss the dialog
    await dialog.dismiss();

    // Verify BST unchanged (still empty)
    expect(await bst.getNodeCount()).toBe(0);

    // No console or page errors should be present simply from showing an alert
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test inserting duplicate values: per implementation, equal values go to the right branch (else -> right)
  test('Inserting duplicate values results in multiple nodes with same text (duplicates go to the right)', async ({ page }) => {
    const bst4 = new BSTPage(page);
    await bst.goto();

    // Insert two identical values
    await bst.addNode(100);
    await bst.addNode(100);

    // There should be two .node elements both with text '100'
    const nodeValues2 = await bst.getAllNodeValues();
    // Count occurrences of '100'
    const occurrences = nodeValues.filter((t) => t === '100').length;
    expect(occurrences).toBe(2);

    // Node count should be 2
    expect(await bst.getNodeCount()).toBe(2);

    // No console or page errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility / attribute checks for interactive elements
  test('Accessibility and attributes: input has appropriate type and button has accessible name', async ({ page }) => {
    const bst5 = new BSTPage(page);
    await bst.goto();

    // Input should be of type number
    const inputType = await page.locator('#nodeValue').getAttribute('type');
    expect(inputType).toBe('number');

    // Button should be discoverable by accessible name
    const addButton = page.getByRole('button', { name: 'Add Node' });
    await expect(addButton).toBeVisible();

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Sanity check: adding many nodes doesn't throw runtime page errors
  test('Stress test: add many nodes sequentially and ensure no runtime errors', async ({ page }) => {
    const bst6 = new BSTPage(page);
    await bst.goto();

    // Insert a sequence of ascending numbers
    const values1 = Array.from({ length: 15 }, (_, i) => i + 1);
    for (const v of values) {
      await bst.addNode(v);
    }

    // Node count should match
    expect(await bst.getNodeCount()).toBe(values.length);

    // Ensure all values present
    const nodeValues3 = await bst.getAllNodeValues();
    for (const v of values) {
      expect(nodeValues).toContain(String(v));
    }

    // Assert that adding many nodes did not produce console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});