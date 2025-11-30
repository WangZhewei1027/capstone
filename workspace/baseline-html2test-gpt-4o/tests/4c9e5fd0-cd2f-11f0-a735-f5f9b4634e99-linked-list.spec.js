import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e5fd0-cd2f-11f0-a735-f5f9b4634e99.html';

/**
 * Page Object for the Linked List page.
 * Encapsulates selectors and common interactions so tests are expressive and maintainable.
 */
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#linkedListContainer');
    this.input = page.locator('#nodeValue');
    // The "Add Node" button does not have an id; find it by text.
    this.addButton = page.locator('button', { hasText: 'Add Node' });
    this.title = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Add a node via the UI: fill input and click the add button.
  async addNode(value) {
    await this.input.fill(value);
    await this.addButton.click();
  }

  // Returns locator for node elements
  nodes() {
    return this.container.locator('.node');
  }

  // Returns locator for arrow elements (→)
  arrows() {
    return this.container.locator('.arrow');
  }

  // Return text contents of all nodes as an array
  async nodeTexts() {
    const count = await this.nodes().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.nodes().nth(i).textContent());
    }
    return texts;
  }

  // Count of container children (useful to assert ordering node-arrow-node-...)
  async containerChildrenCount() {
    return await this.page.locator('#linkedListContainer > *').count();
  }

  // Current value in input
  async inputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Linked List Visualizer - UI and behavior', () => {
  // Will collect console.error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console events and capture messages with severity 'error'
    page.on('console', (msg) => {
      // Capture any console message of type 'error'
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    const linkedListPage = new LinkedListPage(page);
    await linkedListPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // After each test assert that there were no console errors or page errors.
    // The application should run without throwing ReferenceError, SyntaxError, TypeError,
    // or producing console.error messages during normal operation.
    // If there are errors, fail the test and show the captured messages.
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Prepare a descriptive failure message
      const errorDetails = [
        ...(consoleErrors.length ? ['Console errors:'] : []),
        ...consoleErrors.map((e, i) => `${i + 1}. ${e.text} @ ${JSON.stringify(e.location)}`),
        ...(pageErrors.length ? ['Page errors:'] : []),
        ...pageErrors.map((e, i) => `${i + 1}. ${e.toString()}`),
      ].join('\n');

      // Fail the test with the collected error details
      throw new Error(`Unexpected runtime errors detected:\n${errorDetails}`);
    }

    // Remove all listeners to avoid leaks (best-effort; Playwright will clean up pages between tests)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('Initial load: title, input and add button are visible and list is empty', async ({ page }) => {
    // Purpose: Verify the initial state of the application after page load.
    const linkedListPage = new LinkedListPage(page);

    // Title is present and meaningful
    await expect(linkedListPage.title).toBeVisible();
    await expect(linkedListPage.title).toHaveText(/Linked List Visualizer/i);

    // Input is visible and has correct placeholder
    await expect(linkedListPage.input).toBeVisible();
    await expect(linkedListPage.input).toHaveAttribute('placeholder', 'Enter node value');

    // Add button is visible
    await expect(linkedListPage.addButton).toBeVisible();
    await expect(linkedListPage.addButton).toHaveText(/Add Node/);

    // Container should be empty (no nodes, no arrows)
    await expect(linkedListPage.nodes()).toHaveCount(0);
    await expect(linkedListPage.arrows()).toHaveCount(0);

    // Input should start empty
    expect(await linkedListPage.inputValue()).toBe('');
  });

  test('Add a single node: node is displayed, input cleared, no arrows present', async ({ page }) => {
    // Purpose: Ensure adding a node shows it in the container, input is cleared, and no arrow appears.
    const linkedListPage = new LinkedListPage(page);

    // Add one node with value 'A'
    await linkedListPage.addNode('A');

    // There should be exactly one node with text 'A'
    await expect(linkedListPage.nodes()).toHaveCount(1);
    const texts = await linkedListPage.nodeTexts();
    expect(texts).toEqual(['A']);

    // No arrows for a single node
    await expect(linkedListPage.arrows()).toHaveCount(0);

    // Input should be cleared after adding
    expect(await linkedListPage.inputValue()).toBe('');
  });

  test('Add multiple nodes: nodes appear in order with arrows between them', async ({ page }) => {
    // Purpose: Validate that multiple appends build a proper linked-list visual:
    // node, arrow, node, arrow, node...
    const linkedListPage = new LinkedListPage(page);

    const values = ['Node1', 'Node2', 'Node3'];

    // Add nodes sequentially via the UI
    for (const v of values) {
      await linkedListPage.addNode(v);
    }

    // Node count should be 3 and arrow count should be 2
    await expect(linkedListPage.nodes()).toHaveCount(values.length);
    await expect(linkedListPage.arrows()).toHaveCount(values.length - 1);

    // Verify the displayed text of each node is in order
    const texts = await linkedListPage.nodeTexts();
    expect(texts).toEqual(values);

    // Verify the container children alternate node -> arrow -> node ...
    const childrenCount = await linkedListPage.containerChildrenCount();
    // For N nodes there should be 2N-1 children (N nodes + N-1 arrows)
    expect(childrenCount).toBe(values.length * 2 - 1);

    // Additional check: ensure each arrow's textContent is the arrow symbol
    const arrowCount = await linkedListPage.arrows().count();
    for (let i = 0; i < arrowCount; i++) {
      const arrowText = await linkedListPage.arrows().nth(i).textContent();
      expect(arrowText.trim()).toBe('→');
    }
  });

  test('Submitting empty value does not add a node (edge case)', async ({ page }) => {
    // Purpose: Ensure that clicking Add Node with empty input produces no change.
    const linkedListPage = new LinkedListPage(page);

    // Ensure starting state empty
    await expect(linkedListPage.nodes()).toHaveCount(0);

    // Click add with empty input (input is already empty)
    await linkedListPage.addButton.click();

    // No nodes should have been added
    await expect(linkedListPage.nodes()).toHaveCount(0);

    // Try with whitespace only - since the implementation checks if (value),
    // whitespace is truthy and will be added. This asserts the actual behavior (no patching).
    await linkedListPage.input.fill('   ');
    await linkedListPage.addButton.click();

    // Whitespace node is expected because the page's logic uses a simple truthiness check.
    await expect(linkedListPage.nodes()).toHaveCount(1);
    const textsAfterWhitespace = await linkedListPage.nodeTexts();
    // The node will contain the whitespace characters; trim to verify presence of content (non-empty)
    expect(textsAfterWhitespace[0].length).toBeGreaterThan(0);
  });

  test('Add nodes with special characters and long values: content is rendered as-is', async ({ page }) => {
    // Purpose: Validate that arbitrary string values (emoji, long strings, special chars) are displayed.
    const linkedListPage = new LinkedListPage(page);

    const specialValue = '💡→ Special & <chars> "test"';
    const longValue = 'L'.repeat(200);

    await linkedListPage.addNode(specialValue);
    await linkedListPage.addNode(longValue);

    // Validate two nodes present
    await expect(linkedListPage.nodes()).toHaveCount(2);

    const texts = await linkedListPage.nodeTexts();
    // The implementation sets textContent, so HTML special chars shouldn't be interpreted as markup.
    expect(texts[0]).toBe(specialValue);
    expect(texts[1]).toBe(longValue);
  });

  test('Rapid consecutive additions maintain order and correct arrow counts', async ({ page }) => {
    // Purpose: Ensure quick user interactions don't break the ordering or arrow creation.
    const linkedListPage = new LinkedListPage(page);

    const values = ['1', '2', '3', '4', '5'];

    // Rapidly add values without awaiting intermediate DOM checks
    for (const v of values) {
      await linkedListPage.input.fill(v);
      // Click immediately
      await linkedListPage.addButton.click();
    }

    // Validate final state
    await expect(linkedListPage.nodes()).toHaveCount(values.length);
    await expect(linkedListPage.arrows()).toHaveCount(values.length - 1);
    const texts = await linkedListPage.nodeTexts();
    expect(texts).toEqual(values);
  });
});