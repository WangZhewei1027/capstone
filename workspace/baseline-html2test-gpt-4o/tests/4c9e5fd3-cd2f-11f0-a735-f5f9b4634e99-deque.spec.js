import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e5fd3-cd2f-11f0-a735-f5f9b4634e99.html';

/**
 * Page object representing the Deque demo page.
 * Encapsulates selectors and common interactions to keep tests readable.
 */
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addFrontButton = page.locator('button', { hasText: 'Add to Front' });
    this.addRearButton = page.locator('button', { hasText: 'Add to Rear' });
    this.removeFrontButton = page.locator('button', { hasText: 'Remove from Front' });
    this.removeRearButton = page.locator('button', { hasText: 'Remove from Rear' });
    this.dequeDisplay = page.locator('#dequeDisplay');
    this.dequeItems = page.locator('#dequeDisplay div');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterValue(value) {
    await this.input.fill(value);
  }

  async clickAddFront() {
    await this.addFrontButton.click();
  }

  async clickAddRear() {
    await this.addRearButton.click();
  }

  async clickRemoveFront() {
    await this.removeFrontButton.click();
  }

  async clickRemoveRear() {
    await this.removeRearButton.click();
  }

  async getDisplayedItems() {
    return await this.dequeItems.allTextContents();
  }

  async displayedCount() {
    return await this.dequeItems.count();
  }
}

test.describe('Deque Demonstration - End-to-End Tests', () => {
  // Collect console messages and page errors for each test to assert none unexpectedly occurred.
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Observe console log events and page errors. We do not alter page behavior; we simply record them.
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page exactly as-is.
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert there were no console errors and no uncaught page errors.
    const errorConsole = consoleMessages.filter((m) => typeof m.type === 'function' && m.type() === 'error');
    // If errors exist, include their texts in the assertion message to aid debugging.
    expect(errorConsole.length, `Console error messages: ${errorConsole.map(m => m.text()).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });

  test('Initial page load shows controls and an empty deque', async ({ page }) => {
    // Verify page title and primary controls are present and visible.
    const dp = new DequePage(page);
    await expect(page).toHaveTitle('Deque Demonstration');
    await expect(dp.input).toBeVisible();
    await expect(dp.addFrontButton).toBeVisible();
    await expect(dp.addRearButton).toBeVisible();
    await expect(dp.removeFrontButton).toBeVisible();
    await expect(dp.removeRearButton).toBeVisible();

    // The deque display should be present but initially empty (no child divs).
    await expect(dp.dequeDisplay).toBeVisible();
    const count = await dp.displayedCount();
    expect(count).toBe(0);
    // Input has correct placeholder
    await expect(dp.input).toHaveAttribute('placeholder', 'Enter value');
  });

  test('Adding elements to the rear appends items in order', async ({ page }) => {
    // Add 'A' then 'B' to rear and verify visual order and count.
    const dp = new DequePage(page);
    await dp.enterValue('A');
    await dp.clickAddRear();
    let items = await dp.getDisplayedItems();
    expect(items).toEqual(['A']);
    // The implementation does not clear the input, so it should still contain 'A'.
    await expect(dp.input).toHaveValue('A');

    // Change value to 'B' and add to rear
    await dp.enterValue('B');
    await dp.clickAddRear();
    items = await dp.getDisplayedItems();
    expect(items).toEqual(['A', 'B']);
    expect(await dp.displayedCount()).toBe(2);
  });

  test('Adding elements to the front prepends items', async ({ page }) => {
    // Start fresh: ensure empty deque and add to front twice to check prepend behavior.
    const dp = new DequePage(page);
    // Sanity: ensure empty at start of this test
    expect(await dp.displayedCount()).toBe(0);

    await dp.enterValue('1');
    await dp.clickAddFront();
    let items = await dp.getDisplayedItems();
    expect(items).toEqual(['1']);

    await dp.enterValue('0');
    await dp.clickAddFront();
    items = await dp.getDisplayedItems();
    // '0' should be at the front followed by '1'
    expect(items).toEqual(['0', '1']);
    expect(await dp.displayedCount()).toBe(2);
  });

  test('Removing from the front removes the first element and updates display', async ({ page }) => {
    // Add three items, remove front, and verify order updates accordingly.
    const dp = new DequePage(page);
    await dp.enterValue('first');
    await dp.clickAddRear();
    await dp.enterValue('second');
    await dp.clickAddRear();
    await dp.enterValue('third');
    await dp.clickAddRear();

    let items = await dp.getDisplayedItems();
    expect(items).toEqual(['first', 'second', 'third']);
    expect(await dp.displayedCount()).toBe(3);

    // Remove from front should remove 'first'
    await dp.clickRemoveFront();
    items = await dp.getDisplayedItems();
    expect(items).toEqual(['second', 'third']);
    expect(await dp.displayedCount()).toBe(2);

    // Remove front twice to empty
    await dp.clickRemoveFront();
    await dp.clickRemoveFront();
    items = await dp.getDisplayedItems();
    expect(items).toEqual([]);
    expect(await dp.displayedCount()).toBe(0);
  });

  test('Removing from the rear removes the last element and updates display', async ({ page }) => {
    // Add three items, remove rear, and verify order updates accordingly.
    const dp = new DequePage(page);
    await dp.enterValue('one');
    await dp.clickAddRear();
    await dp.enterValue('two');
    await dp.clickAddRear();
    await dp.enterValue('three');
    await dp.clickAddRear();

    let items = await dp.getDisplayedItems();
    expect(items).toEqual(['one', 'two', 'three']);
    expect(await dp.displayedCount()).toBe(3);

    // Remove from rear should remove 'three'
    await dp.clickRemoveRear();
    items = await dp.getDisplayedItems();
    expect(items).toEqual(['one', 'two']);
    expect(await dp.displayedCount()).toBe(2);

    // Remove rear twice to empty
    await dp.clickRemoveRear();
    await dp.clickRemoveRear();
    items = await dp.getDisplayedItems();
    expect(items).toEqual([]);
    expect(await dp.displayedCount()).toBe(0);
  });

  test('Empty input does not add an element when clicking add buttons', async ({ page }) => {
    // Ensure clicking add with empty input does not modify the deque.
    const dp = new DequePage(page);
    // Ensure empty input
    await dp.enterValue('');
    expect(await dp.displayedCount()).toBe(0);

    await dp.clickAddRear();
    expect(await dp.displayedCount()).toBe(0);

    await dp.clickAddFront();
    expect(await dp.displayedCount()).toBe(0);
  });

  test('Removing when deque is empty does nothing and does not produce uncaught errors', async ({ page }) => {
    // This test verifies that remove actions on an empty deque are safe and no page errors occur.
    const dp = new DequePage(page);
    // Ensure empty deque
    expect(await dp.displayedCount()).toBe(0);

    // Click remove buttons; the implementation should check isEmpty() and do nothing.
    await dp.clickRemoveFront();
    await dp.clickRemoveRear();

    // Still empty
    expect(await dp.displayedCount()).toBe(0);

    // Also check there are no console errors or page errors captured (afterEach will assert too).
    // We explicitly assert here as an additional check within the test's scope.
    // Note: consoleMessages and pageErrors are asserted again in afterEach.
  });

  test('DOM structure for each deque item is a div with the item text', async ({ page }) => {
    // Add items and validate that each is represented by a div inside #dequeDisplay with exact text
    const dp = new DequePage(page);
    await dp.enterValue('alpha');
    await dp.clickAddRear();
    await dp.enterValue('beta');
    await dp.clickAddRear();

    const items = dp.dequeItems;
    await expect(items).toHaveCount(2);
    const texts = await items.allTextContents();
    expect(texts).toEqual(['alpha', 'beta']);

    // Ensure each node is indeed a div element (nodeName check)
    const nodeNames = await page.$$eval('#dequeDisplay div', nodes => nodes.map(n => n.nodeName));
    // nodeName should be uppercase 'DIV' in browsers
    expect(nodeNames.every(n => n === 'DIV')).toBe(true);
  });
});