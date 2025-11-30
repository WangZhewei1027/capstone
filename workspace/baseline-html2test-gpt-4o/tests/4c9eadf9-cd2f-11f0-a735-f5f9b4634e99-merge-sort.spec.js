import { test, expect } from '@playwright/test';

// URL of the page under test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf9-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object Model for the Merge Sort page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startButton = page.getByRole('button', { name: 'Start Merge Sort' });
    this.arrayContainer = page.locator('#arrayContainer');
    this.arrayElements = () => page.locator('#arrayContainer .arrayElement');
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Click the Start Merge Sort button
  async clickStart() {
    await this.startButton.click();
  }

  // Get array values as numbers in visible order
  async getArrayValues() {
    const elems = this.arrayElements();
    const count = await elems.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await elems.nth(i).textContent();
      // Trim and convert to number when possible
      values.push(text ? text.trim() : '');
    }
    return values;
  }

  // Get count of array elements
  async getArrayCount() {
    return this.arrayElements().count();
  }
}

test.describe('Merge Sort Visualization - Integration Tests', () => {
  // Collect console and page errors for assertions
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];

  // Setup listeners before each test to capture console logs and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push({ type, text });
      }
    });

    page.on('pageerror', (error) => {
      // Capture unhandled exceptions from the page
      pageErrors.push(error);
    });
  });

  // After each test ensure we didn't get unexpected runtime errors
  test.afterEach(async () => {
    // No teardown actions needed beyond assertions in tests themselves.
    // Placeholder in case future cleanup is required.
  });

  // Test initial page load and default state
  test('Initial load displays the unsorted array and Start button is visible', async ({ page }) => {
    // Purpose: Verify the page loads, the Start button exists and is visible,
    // and the initial unsorted array is rendered in DOM in the expected order.
    const view = new MergeSortPage(page);
    await view.goto();

    // Check Start button is visible and accessible by role/name
    await expect(view.startButton).toBeVisible();
    await expect(view.startButton).toHaveText('Start Merge Sort');

    // Verify initial array elements count and content (unsorted order as in source)
    const values = await view.getArrayValues();
    // Expect exactly the unsorted array defined in the HTML implementation
    expect(values).toEqual(['38', '27', '43', '3', '9', '82', '10']);

    // Verify each element has the expected class and is visible
    const count = await view.getArrayCount();
    for (let i = 0; i < count; i++) {
      const el = page.locator('#arrayContainer .arrayElement').nth(i);
      await expect(el).toBeVisible();
      await expect(el).toHaveClass(/arrayElement/);
    }

    // Assert that there are no page runtime errors or console errors produced on load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test the merge sort interaction and DOM update
  test('Clicking Start Merge Sort sorts the array in ascending order and updates the DOM', async ({ page }) => {
    // Purpose: Simulate user clicking Start Merge Sort and verify that the DOM
    // is updated with the sorted array values in ascending order.
    const view = new MergeSortPage(page);
    await view.goto();

    // Click the start button to perform the sort
    await view.clickStart();

    // After click expect the array to be sorted ascending
    const sortedValues = await view.getArrayValues();
    expect(sortedValues).toEqual(['3', '9', '10', '27', '38', '43', '82']);

    // Verify that the number of elements remains the same after sorting
    const countAfter = await view.getArrayCount();
    expect(countAfter).toBe(7);

    // Verify visual aspects: elements are still visible and maintain class
    for (let i = 0; i < countAfter; i++) {
      const el = page.locator('#arrayContainer .arrayElement').nth(i);
      await expect(el).toBeVisible();
      await expect(el).toHaveClass(/arrayElement/);
    }

    // Assert that there were no console errors or uncaught page errors during interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test idempotency and repeated interactions
  test('Clicking Start Merge Sort multiple times keeps the array sorted (idempotent behavior)', async ({ page }) => {
    // Purpose: Ensure repeated invocations of the sort do not break DOM or order.
    const view = new MergeSortPage(page);
    await view.goto();

    // First click sorts the array
    await view.clickStart();
    const afterFirstClick = await view.getArrayValues();
    expect(afterFirstClick).toEqual(['3', '9', '10', '27', '38', '43', '82']);

    // Click again and ensure the array remains sorted
    await view.clickStart();
    const afterSecondClick = await view.getArrayValues();
    expect(afterSecondClick).toEqual(['3', '9', '10', '27', '38', '43', '82']);

    // Confirm no console or page errors were emitted during repeated interactions
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test DOM robustness and edge checks (structure, classes, and accessibility)
  test('DOM structure and accessibility: array container and elements exist and are accessible', async ({ page }) => {
    // Purpose: Validate DOM structure integrity and basic accessibility semantics.
    const view = new MergeSortPage(page);
    await view.goto();

    // The container should exist and be visible
    await expect(page.locator('#arrayContainer')).toBeVisible();

    // All items should have text content that is numeric
    const values = await view.getArrayValues();
    for (const v of values) {
      // Each text value should parse to a finite number
      const n = Number(v);
      expect(Number.isFinite(n)).toBe(true);
    }

    // The Start button should be reachable via role query (accessibility)
    const buttonByRole = page.getByRole('button', { name: 'Start Merge Sort' });
    await expect(buttonByRole).toBeVisible();

    // Assert again there are no unexpected runtime errors captured
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test to capture and report any console messages for debugging (not failing on logs but asserting no errors)
  test('Collects console messages for debugging and ensures no console.error occurred', async ({ page }) => {
    // Purpose: Demonstrate capturing console messages and ensure there are no console.error entries.
    const view = new MergeSortPage(page);
    await view.goto();

    // Perform an interaction to potentially generate console output
    await view.clickStart();

    // Ensure we recorded console messages (there may be none, that's acceptable)
    // But explicitly assert that none of these are of type 'error'
    const errorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorMsgs.length).toBe(0);

    // Also ensure no page errors were emitted
    expect(pageErrors.length).toBe(0);
  });
});