import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a5770-d59e-11f0-89ab-2f71529652ac.html';

/**
 * Page object model for the Linked List visualization page.
 * Encapsulates selectors and common operations to keep tests readable.
 */
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#nodeValue');
    this.addButton = page.getByRole('button', { name: 'Add Node' });
    this.removeButton = page.getByRole('button', { name: 'Remove Last Node' });
    this.linkedListContainer = page.locator('#linkedList');
    this.nodeLocator = page.locator('#linkedList .node');
    this.arrowLocator = page.locator('#linkedList .arrow');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for DOM content loaded so initial elements are present
    await this.page.waitForLoadState('domcontentloaded');
  }

  async addNode(value) {
    await this.input.fill(String(value));
    await this.addButton.click();
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async removeNode() {
    await this.removeButton.click();
  }

  async getNodeCount() {
    return await this.nodeLocator.count();
  }

  async getArrowCount() {
    return await this.arrowLocator.count();
  }

  async getNodeTextAt(index) {
    return await this.nodeLocator.nth(index).innerText();
  }

  async isInputEmpty() {
    return (await this.input.inputValue()) === '';
  }

  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }
}

test.describe('Linked List Visualization - Interactive Behavior', () => {
  // Arrays to capture console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  // Attach listeners in beforeEach to collect errors from the page
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location ? msg.location() : undefined,
          });
        }
      } catch (e) {
        // If any unexpected issue arises while reading console message, record it
        consoleErrors.push({ text: `Error reading console message: ${String(e)}` });
      }
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });
  });

  // After each test verify there were no unexpected console errors or page errors.
  // This helps detect runtime exceptions caused by the page's scripts.
  test.afterEach(async () => {
    // Assert no console errors were emitted
    expect(consoleErrors, `Expected no console.error messages, but found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    // Assert no uncaught page errors were emitted
    expect(pageErrors, `Expected no page errors, but found: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Initial page load shows title, input and buttons with an empty list', async ({ page }) => {
    // Purpose: Validate the default UI elements are present and the list is empty on load.
    const app = new LinkedListPage(page);
    await app.goto();

    // Page title and heading check
    await expect(page).toHaveTitle(/Linked List Visualization/);
    await expect(page.locator('h1')).toHaveText('Linked List Visualization');

    // Input and buttons are visible
    await expect(app.input).toBeVisible();
    await expect(app.addButton).toBeVisible();
    await expect(app.removeButton).toBeVisible();

    // Placeholder text present
    expect(await app.getInputPlaceholder()).toBe('Enter node value');

    // No nodes or arrows initially
    await expect(app.nodeLocator).toHaveCount(0);
    await expect(app.arrowLocator).toHaveCount(0);
  });

  test('Adding a single node updates the DOM: node present, no arrow, input cleared', async ({ page }) => {
    // Purpose: Ensure adding a node with a value renders exactly one node and clears input
    const app1 = new LinkedListPage(page);
    await app.goto();

    // Add a node with value 10
    await app.addNode(10);

    // One node should be present with text '10'
    await expect(app.nodeLocator).toHaveCount(1);
    expect(await app.getNodeTextAt(0)).toBe('10');

    // No arrow should exist when only one node is present
    await expect(app.arrowLocator).toHaveCount(0);

    // Input should be cleared after adding
    expect(await app.isInputEmpty()).toBe(true);
  });

  test('Adding multiple nodes shows arrows between them and preserves insertion order', async ({ page }) => {
    // Purpose: Validate that multiple additions append nodes, arrows count = nodes - 1, and order is preserved
    const app2 = new LinkedListPage(page);
    await app.goto();

    // Add several nodes
    await app.addNode(1);
    await app.addNode(2);
    await app.addNode(3);

    // Expect three nodes in order
    await expect(app.nodeLocator).toHaveCount(3);
    expect(await app.getNodeTextAt(0)).toBe('1');
    expect(await app.getNodeTextAt(1)).toBe('2');
    expect(await app.getNodeTextAt(2)).toBe('3');

    // Expect two arrows for three nodes
    await expect(app.arrowLocator).toHaveCount(2);
  });

  test('Removing nodes removes the last node and updates arrows accordingly', async ({ page }) => {
    // Purpose: Verify remove operation deletes only the last node and adjusts arrows
    const app3 = new LinkedListPage(page);
    await app.goto();

    // Build list of three nodes
    await app.addNode(100);
    await app.addNode(200);
    await app.addNode(300);

    // Confirm initial counts
    await expect(app.nodeLocator).toHaveCount(3);
    await expect(app.arrowLocator).toHaveCount(2);

    // Remove last node (300)
    await app.removeNode();
    await expect(app.nodeLocator).toHaveCount(2);
    expect(await app.getNodeTextAt(0)).toBe('100');
    expect(await app.getNodeTextAt(1)).toBe('200');
    await expect(app.arrowLocator).toHaveCount(1);

    // Remove last node (200)
    await app.removeNode();
    await expect(app.nodeLocator).toHaveCount(1);
    expect(await app.getNodeTextAt(0)).toBe('100');
    await expect(app.arrowLocator).toHaveCount(0);
  });

  test('Removing nodes when the list is empty does not throw and leaves the list empty', async ({ page }) => {
    // Purpose: Edge-case: calling remove on an empty list should be safe (no exceptions) and keep list empty
    const app4 = new LinkedListPage(page);
    await app.goto();

    // Ensure empty state
    await expect(app.nodeLocator).toHaveCount(0);

    // Click remove multiple times to exercise edge case
    await app.removeNode();
    await app.removeNode();

    // Still empty and no exceptions were emitted (checked by afterEach)
    await expect(app.nodeLocator).toHaveCount(0);
    await expect(app.arrowLocator).toHaveCount(0);
  });

  test('Clicking Add Node with an empty input triggers an alert with the expected message', async ({ page }) => {
    // Purpose: Verify client-side validation path: empty input should show an alert dialog
    const app5 = new LinkedListPage(page);
    await app.goto();

    // Ensure the input is empty
    await app.input.fill('');
    // Listen for dialog event and assert message
    const dialogPromise = page.waitForEvent('dialog');

    // Click the add button which should trigger an alert
    await app.clickAdd();

    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a value for the node.');
    // Accept the alert to continue
    await dialog.accept();

    // Ensure no node was added as a result
    await expect(app.nodeLocator).toHaveCount(0);
  });

  test('Accessibility and semantics: buttons are accessible via role and have expected names', async ({ page }) => {
    // Purpose: Ensure affordances are discoverable by assistive tech (basic check)
    const app6 = new LinkedListPage(page);
    await app.goto();

    // Buttons should be accessible by role and name
    const addBtn = page.getByRole('button', { name: 'Add Node' });
    const removeBtn = page.getByRole('button', { name: 'Remove Last Node' });

    await expect(addBtn).toBeVisible();
    await expect(removeBtn).toBeVisible();

    // Input should be focusable
    await app.input.focus();
    expect(await app.input.evaluate((el) => document.activeElement === el)).toBe(true);
  });
});