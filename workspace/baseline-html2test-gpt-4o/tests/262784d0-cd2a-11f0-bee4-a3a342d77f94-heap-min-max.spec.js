import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d0-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object Model for the Heap page to encapsulate common interactions and queries
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#heap-value';
    this.minButtonText = 'Insert Min-Heap';
    this.maxButtonText = 'Insert Max-Heap';
    this.minContainer = '#min-heap';
    this.maxContainer = '#max-heap';
    this.nodeSelector = '.heap-node';
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input with given value (string or number)
  async fillValue(value) {
    // Clear then fill to mimic user action
    await this.page.fill(this.inputSelector, '');
    await this.page.fill(this.inputSelector, String(value));
  }

  // Click the Insert Min-Heap button
  async clickInsertMin() {
    await this.page.click(`text=${this.minButtonText}`);
  }

  // Click the Insert Max-Heap button
  async clickInsertMax() {
    await this.page.click(`text=${this.maxButtonText}`);
  }

  // Returns the text contents of current nodes in min-heap in DOM order
  async getMinNodeValues() {
    return this._getNodeValues(this.minContainer);
  }

  // Returns the text contents of current nodes in max-heap in DOM order
  async getMaxNodeValues() {
    return this._getNodeValues(this.maxContainer);
  }

  // Helper to count nodes inside a container
  async countNodes(containerSelector) {
    return await this.page.locator(`${containerSelector} ${this.nodeSelector}`).count();
  }

  // Private helper to read values of nodes inside a container
  async _getNodeValues(containerSelector) {
    const locator = this.page.locator(`${containerSelector} ${this.nodeSelector}`);
    const count = await locator.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await locator.nth(i).innerText());
    }
    return values;
  }
}

test.describe('Heap (Min/Max) Visualization - Functional Tests', () => {
  let heapPage;
  // Collect console messages and page errors to assert no unexpected errors are emitted
  let consoleMessages;
  let pageErrors;
  let consoleListener;
  let pageErrorListener;

  test.beforeEach(async ({ page }) => {
    heapPage = new HeapPage(page);

    consoleMessages = [];
    pageErrors = [];

    // Listen for console events and collect them for assertions
    consoleListener = (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    };
    page.on('console', consoleListener);

    // Listen for uncaught page errors
    pageErrorListener = (err) => {
      // err is an Error object
      pageErrors.push(err.message);
    };
    page.on('pageerror', pageErrorListener);

    // Navigate to the application page
    await heapPage.goto();

    // Verify initial page load completed (basic sanity)
    await expect(page.locator('h1')).toHaveText('Heap (Min/Max) Visualization');
  });

  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid leaking across tests
    page.off('console', consoleListener);
    page.off('pageerror', pageErrorListener);
  });

  test('Initial load: input and buttons are present; heaps start empty', async ({ page }) => {
    // Purpose: Verify the initial DOM and default state before any interaction.

    // Input visibility and placeholder
    const input = page.locator(heapPage.inputSelector);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter a number');

    // Buttons are visible
    await expect(page.locator(`text=${heapPage.minButtonText}`)).toBeVisible();
    await expect(page.locator(`text=${heapPage.maxButtonText}`)).toBeVisible();

    // Heaps containers are visible and start with zero nodes
    await expect(page.locator('#min-heap').locator('.heap-node')).toHaveCount(0);
    await expect(page.locator('#max-heap').locator('.heap-node')).toHaveCount(0);

    // Ensure no console errors or uncaught page errors occurred on load
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Expected no console.error messages on load but found: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors on load but found: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Insert single value into Min-Heap updates DOM correctly', async ({ page }) => {
    // Purpose: Ensure inserting a single value populates the min-heap container with one node.

    await heapPage.fillValue(42);
    await heapPage.clickInsertMin();

    const minValues = await heapPage.getMinNodeValues();
    expect(minValues.length).toBe(1);
    expect(minValues[0]).toBe('42');

    // Max-heap should remain empty
    const maxCount = await heapPage.countNodes('#max-heap');
    expect(maxCount).toBe(0);

    // No runtime errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Insert multiple values into Min-Heap maintains min at root (bubble-up behavior)', async ({ page }) => {
    // Purpose: Verify bubbleUp reorders elements so the minimum becomes the root (first displayed node).

    // Insert 10 then 5 then 7 (5 should bubble to root)
    await heapPage.fillValue(10);
    await heapPage.clickInsertMin();
    await heapPage.fillValue(5);
    await heapPage.clickInsertMin();
    await heapPage.fillValue(7);
    await heapPage.clickInsertMin();

    const minValues = await heapPage.getMinNodeValues();
    // Root should be '5'
    expect(minValues[0]).toBe('5');
    // There should be 3 nodes displayed
    expect(minValues.length).toBe(3);

    // Ensure the values are present (array order reflects internal array)
    // Expect set equality for presence but check root specifically already above
    expect(minValues).toEqual(expect.arrayContaining(['5', '10', '7']));

    // No runtime errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Insert multiple values into Max-Heap maintains max at root (bubble-up behavior)', async ({ page }) => {
    // Purpose: Verify the MaxHeap bubbleUp produces the maximum at the root.

    await heapPage.fillValue(10);
    await heapPage.clickInsertMax();
    await heapPage.fillValue(20);
    await heapPage.clickInsertMax();
    await heapPage.fillValue(15);
    await heapPage.clickInsertMax();

    const maxValues = await heapPage.getMaxNodeValues();
    // Root should be '20'
    expect(maxValues[0]).toBe('20');
    expect(maxValues.length).toBe(3);
    expect(maxValues).toEqual(expect.arrayContaining(['20', '10', '15']));

    // No runtime errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: clicking insert with empty input does not insert NaN into heaps', async ({ page }) => {
    // Purpose: Ensure that empty input (parseInt -> NaN) is ignored as per the guard in insert functions.

    // Ensure both heaps are empty initially
    await expect(page.locator('#min-heap .heap-node')).toHaveCount(0);
    await expect(page.locator('#max-heap .heap-node')).toHaveCount(0);

    // Click insert with empty input for min-heap
    await heapPage.fillValue(''); // leave empty
    await heapPage.clickInsertMin();

    // Click insert with empty input for max-heap
    await heapPage.fillValue('');
    await heapPage.clickInsertMax();

    // Ensure still empty
    await expect(page.locator('#min-heap .heap-node')).toHaveCount(0);
    await expect(page.locator('#max-heap .heap-node')).toHaveCount(0);

    // No runtime errors (like unexpected TypeError when trying to insert NaN)
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting duplicate and negative values behave consistently for both heaps', async ({ page }) => {
    // Purpose: Check duplicates and negatives are allowed and displayed; ensure ordering by heap type.

    // Min-heap: insert duplicates and negative
    await heapPage.fillValue(5);
    await heapPage.clickInsertMin();
    await heapPage.fillValue(5);
    await heapPage.clickInsertMin();
    await heapPage.fillValue(-1);
    await heapPage.clickInsertMin();

    const minValues = await heapPage.getMinNodeValues();
    // Root should be '-1' after negative insertion
    expect(minValues[0]).toBe('-1');
    expect(minValues.length).toBe(3);
    // duplicates present
    expect(minValues.filter(v => v === '5').length).toBe(2);

    // Max-heap: insert duplicates and negative
    await heapPage.fillValue(-2);
    await heapPage.clickInsertMax();
    await heapPage.fillValue(-2);
    await heapPage.clickInsertMax();
    await heapPage.fillValue(-5);
    await heapPage.clickInsertMax();

    const maxValues = await heapPage.getMaxNodeValues();
    // Root should be the maximum among inserted negatives: '-2'
    expect(maxValues[0]).toBe('-2');
    expect(maxValues.length).toBe(3);
    // duplicates present
    expect(maxValues.filter(v => v === '-2').length).toBe(2);

    // No runtime errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Decimal input is parsed with parseInt (truncation) due to implementation using parseInt', async ({ page }) => {
    // Purpose: Ensure parseInt behavior is observable (e.g., "3.9" becomes 3).

    await heapPage.fillValue('3.9');
    await heapPage.clickInsertMin();

    const minValues = await heapPage.getMinNodeValues();
    expect(minValues.length).toBe(1);
    // parseInt('3.9') === 3, so DOM should show '3'
    expect(minValues[0]).toBe('3');

    // No runtime errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility & visibility: heap nodes are visible and have expected class', async ({ page }) => {
    // Purpose: Confirm visual classes applied to nodes and that they appear in the DOM.

    await heapPage.fillValue(1);
    await heapPage.clickInsertMin();
    await heapPage.fillValue(2);
    await heapPage.clickInsertMax();

    const minNode = page.locator('#min-heap .heap-node').first();
    const maxNode = page.locator('#max-heap .heap-node').first();

    await expect(minNode).toBeVisible();
    await expect(minNode).toHaveClass(/heap-node/);
    await expect(maxNode).toBeVisible();
    await expect(maxNode).toHaveClass(/heap-node/);

    // No runtime errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

});