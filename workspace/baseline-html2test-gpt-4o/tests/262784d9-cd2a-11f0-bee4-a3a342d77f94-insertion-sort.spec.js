import { test, expect } from '@playwright/test';

// Page Object for the Insertion Sort demo page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/html2test/html/262784d9-cd2a-11f0-bee4-a3a342d77f94.html';
    this.sortButton = page.locator('#sortButton');
    this.arrayContainer = page.locator('#arrayContainer');
    this.arrayItems = page.locator('.array-item');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Click the Sort Array button
  async clickSort() {
    await this.sortButton.click();
  }

  // Return the text values of the array items as numbers
  async getArrayValues() {
    return await this.page.$$eval('.array-item', (els) =>
      els.map((e) => Number(e.textContent.trim()))
    );
  }

  // Return the number of array items in the DOM
  async getItemsCount() {
    return await this.arrayItems.count();
  }

  // Return whether the sort button is visible and enabled
  async isSortButtonVisible() {
    return await this.sortButton.isVisible();
  }

  async isSortButtonEnabled() {
    return await this.sortButton.isEnabled();
  }

  // Clear the array container via DOM manipulation (simulates a user or other script clearing the container)
  async clearArrayContainer() {
    await this.page.evaluate(() => {
      const container = document.getElementById('arrayContainer');
      if (container) container.innerHTML = '';
    });
  }

  // Get element handles for the current array items (useful to check node identity changes)
  async getArrayHandles() {
    return await this.page.$$('.array-item');
  }
}

test.describe('Insertion Sort Visualization - Functional Tests', () => {
  let pageErrors;
  let consoleMessages;

  // Setup before each test: instantiate page object, navigate, and collect console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect console messages (including errors) for later assertions
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test the initial page state: items present in original order and button visible
  test('Initial load: array items displayed in original order and Sort button visible', async ({
    page,
  }) => {
    const app = new InsertionSortPage(page);
    // Navigate to the exact page under test
    await app.goto();

    // Verify sort button is visible and enabled
    await expect(app.sortButton).toBeVisible();
    await expect(app.sortButton).toBeEnabled();

    // Verify initial array items count and their values match the HTML source order
    const count = await app.getItemsCount();
    expect(count).toBe(8);

    const values = await app.getArrayValues();
    expect(values).toEqual([10, 3, 7, 4, 1, 9, 15, 8]);

    // Ensure there are no uncaught page errors and no console errors on initial load
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking the sort button sorts the array and updates the DOM appropriately
  test('Clicking the Sort button updates the DOM to show a sorted array', async ({ page }) => {
    const app = new InsertionSortPage(page);
    await app.goto();

    // Capture element handles before sorting to assert DOM nodes are replaced
    const beforeHandles = await app.getArrayHandles();

    // Click the button to sort
    await app.clickSort();

    // After click, the array should be sorted ascending
    const sortedValues = await app.getArrayValues();
    expect(sortedValues).toEqual([1, 3, 4, 7, 8, 9, 10, 15]);

    // There should still be the same number of items (8), just reordered/recreated
    const afterCount = await app.getItemsCount();
    expect(afterCount).toBe(8);

    // Element handles should differ (displayArray replaces container.innerHTML = '')
    const afterHandles = await app.getArrayHandles();
    // If new nodes were created, handles should not be strictly equal to previous ones
    let anySameHandle = false;
    const minLen = Math.min(beforeHandles.length, afterHandles.length);
    for (let i = 0; i < minLen; i++) {
      if (beforeHandles[i]._remoteObjectId === afterHandles[i]._remoteObjectId) {
        anySameHandle = true;
        break;
      }
    }
    // We expect that displayArray cleared and recreated nodes, so they should not be the same
    expect(anySameHandle).toBe(false);

    // Ensure no page errors or console errors occurred during the interaction
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test that clicking the sort button multiple times is idempotent and does not break the UI
  test('Clicking Sort multiple times remains idempotent and stable', async ({ page }) => {
    const app = new InsertionSortPage(page);
    await app.goto();

    // First click
    await app.clickSort();
    const firstSorted = await app.getArrayValues();
    expect(firstSorted).toEqual([1, 3, 4, 7, 8, 9, 10, 15]);

    // Second click - should remain sorted and not duplicate entries
    await app.clickSort();
    const secondSorted = await app.getArrayValues();
    expect(secondSorted).toEqual([1, 3, 4, 7, 8, 9, 10, 15]);

    // Verify item count stayed the same
    const countAfter = await app.getItemsCount();
    expect(countAfter).toBe(8);

    // Check no errors surfaced on repeated interactions
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: simulate the container being empty before clicking Sort, ensure displayArray repopulates correctly
  test('If array container is cleared, clicking Sort repopulates the sorted array', async ({ page }) => {
    const app = new InsertionSortPage(page);
    await app.goto();

    // Clear the container as if a user or script removed the items
    await app.clearArrayContainer();

    // Ensure container is empty now
    expect(await app.getItemsCount()).toBe(0);

    // Click sort - the handler uses a local constant array and should repopulate the DOM
    await app.clickSort();

    // After click, the sorted values should be present
    const valuesAfter = await app.getArrayValues();
    expect(valuesAfter).toEqual([1, 3, 4, 7, 8, 9, 10, 15]);

    // Ensure DOM now has items again
    expect(await app.getItemsCount()).toBe(8);

    // Check that no errors occurred while repopulating from an empty container
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility and visibility checks
  test('Accessibility & visibility: the Sort button is focusable and operable via keyboard', async ({
    page,
  }) => {
    const app = new InsertionSortPage(page);
    await app.goto();

    // Focus the button and press Enter to trigger the click handler
    await app.sortButton.focus();
    await page.keyboard.press('Enter');

    // After keyboard activation, array should be sorted
    const values = await app.getArrayValues();
    expect(values).toEqual([1, 3, 4, 7, 8, 9, 10, 15]);

    // Ensure the button remains visible and enabled after the action
    expect(await app.isSortButtonVisible()).toBe(true);
    expect(await app.isSortButtonEnabled()).toBe(true);

    // Ensure no console or page errors occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});