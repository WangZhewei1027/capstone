import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadfb-cd2f-11f0-a735-f5f9b4634e99.html';

// Page object model for the Heap Sort page
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array';
    this.elementSelector = '.element';
    this.sortButtonLocator = page.getByRole('button', { name: 'Sort Array' });
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return the text values of the array elements as numbers
  async getArrayValues() {
    return await this.page.$$eval(this.elementSelector, nodes =>
      nodes.map(n => {
        // parse as number to compare numeric order
        const txt = n.textContent?.trim() ?? '';
        const num = Number(txt);
        // If not a number, fallback to original text
        return Number.isNaN(num) ? txt : num;
      })
    );
  }

  // Click the Sort Array button
  async clickSort() {
    await this.sortButtonLocator.click();
  }

  // Get the count of .element nodes
  async getElementCount() {
    return await this.page.$$eval(this.elementSelector, nodes => nodes.length);
  }

  // Ensure the button is visible and enabled
  async isSortButtonVisible() {
    return await this.sortButtonLocator.isVisible();
  }

  async isSortButtonEnabled() {
    return await this.sortButtonLocator.isEnabled();
  }

  // Wait until the displayed array equals expected (strict deep equality)
  async waitForArrayToEqual(expectedArray, options = {}) {
    const timeout = options.timeout ?? 2000;
    await this.page.waitForFunction(
      (sel, expected) => {
        const nodes = Array.from(document.querySelectorAll(sel));
        if (nodes.length !== expected.length) return false;
        const values = nodes.map(n => {
          const txt = n.textContent?.trim() ?? '';
          const num = Number(txt);
          return Number.isNaN(num) ? txt : num;
        });
        // deep equality of arrays
        return JSON.stringify(values) === JSON.stringify(expected);
      },
      this.elementSelector,
      expectedArray,
      { timeout }
    );
  }
}

test.describe('Heap Sort Visualization - end-to-end', () => {
  // Hold console errors and uncaught page errors observed during tests
  let consoleErrors;
  let pageErrors;

  // For each test attach listeners to capture console and page errors and navigate to the app
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled exceptions from the page
    page.on('pageerror', err => {
      // Store message for assertions
      pageErrors.push(err.message);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  // Basic cleanup (not strictly necessary here but included for clarity)
  test.afterEach(async ({ page }) => {
    // Remove listeners if needed (Playwright will drop page after test)
    // No explicit teardown required beyond Playwright fixtures.
  });

  // Test initial page load and default state
  test('Initial load shows the title, array elements and the Sort Array button', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // Verify page title (h1)
    const title = await page.locator('h1').textContent();
    expect(title).toBeTruthy();
    expect(title?.toLowerCase()).toContain('heap sort');

    // Verify the sort button is visible and enabled (accessible name)
    expect(await heapPage.isSortButtonVisible()).toBe(true);
    expect(await heapPage.isSortButtonEnabled()).toBe(true);

    // Verify initial array is rendered with correct number of elements
    const initialValues = await heapPage.getArrayValues();
    // The HTML defines array = [15, 3, 17, 10, 84, 19, 6, 22, 9]
    expect(initialValues).toEqual([15, 3, 17, 10, 84, 19, 6, 22, 9]);

    const count = await heapPage.getElementCount();
    expect(count).toBe(9);

    // Ensure there are no console errors or uncaught page errors on initial load
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test interaction: clicking the Sort Array button sorts the array
  test('Clicking Sort Array sorts the displayed array into ascending order', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // Confirm starting from initial order
    const before = await heapPage.getArrayValues();
    expect(before).toEqual([15, 3, 17, 10, 84, 19, 6, 22, 9]);

    // Click the sort button and wait for final sorted state
    await heapPage.clickSort();

    // Expected ascending order after heap sort
    const expectedSorted = [3, 6, 9, 10, 15, 17, 19, 22, 84];

    // Wait for the UI to update to the expected sorted array
    await heapPage.waitForArrayToEqual(expectedSorted, { timeout: 3000 });

    // Verify the displayed array matches expected sorted result
    const after = await heapPage.getArrayValues();
    expect(after).toEqual(expectedSorted);

    // Confirm number of elements unchanged
    const count = await heapPage.getElementCount();
    expect(count).toBe(9);

    // No uncaught errors should have occurred during sorting
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test idempotency and repeated interaction: sorting an already sorted array
  test('Clicking Sort Array again on a sorted array remains sorted and causes no errors', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // First sort
    await heapPage.clickSort();
    const expectedSorted = [3, 6, 9, 10, 15, 17, 19, 22, 84];
    await heapPage.waitForArrayToEqual(expectedSorted, { timeout: 3000 });

    // Capture state after first sort
    const afterFirstSort = await heapPage.getArrayValues();
    expect(afterFirstSort).toEqual(expectedSorted);

    // Click sort again (should be a no-op effectively)
    await heapPage.clickSort();

    // Wait a little for any UI updates (if any); then verify state still sorted
    await heapPage.waitForArrayToEqual(expectedSorted, { timeout: 2000 });
    const afterSecondSort = await heapPage.getArrayValues();
    expect(afterSecondSort).toEqual(expectedSorted);

    // Ensure no console or page errors occurred across both operations
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Edge case: rapid repeated clicks should not cause uncaught exceptions
  test('Rapid repeated clicks do not produce uncaught page errors', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // Perform multiple rapid clicks
    await Promise.all([
      heapPage.sortButtonLocator.click(),
      heapPage.sortButtonLocator.click(),
      heapPage.sortButtonLocator.click()
    ]).catch(() => {
      // Swallow promise rejections from the clicks themselves if any (we will assert errors via pageErrors)
    });

    // Allow some time for the sorting process to complete and the UI to stabilize
    const expectedSorted = [3, 6, 9, 10, 15, 17, 19, 22, 84];
    await heapPage.waitForArrayToEqual(expectedSorted, { timeout: 4000 });

    // Verify final state is still sorted
    const final = await heapPage.getArrayValues();
    expect(final).toEqual(expectedSorted);

    // Assert that no uncaught errors were emitted during rapid interaction
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Accessibility and DOM checks: ensure each array item has the expected class and is visible
  test('Array elements have the expected .element class and are visible', async ({ page }) => {
    const heapPage = new HeapSortPage(page);

    // Query all elements and ensure class and visibility
    const elements = await page.$$(heapPage.elementSelector);
    expect(elements.length).toBeGreaterThan(0);

    for (const el of elements) {
      // Each element should have class attribute containing 'element'
      const cls = await el.getAttribute('class');
      expect(cls).toContain('element');

      // Each element should be visible on the page
      expect(await el.isVisible()).toBe(true);

      // Text content should be present and parseable to a number
      const txt = (await el.textContent())?.trim() ?? '';
      expect(txt.length).toBeGreaterThan(0);
      expect(Number.isNaN(Number(txt))).toBe(false);
    }

    // No console or page errors on these checks
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});