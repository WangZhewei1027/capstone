import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca2-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Heap Sort page
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array';
    this.barSelector = '#array .bar';
    this.sortButtonLocator = page.getByRole('button', { name: 'Sort Array' });
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the "Sort Array" button
  async clickSort() {
    await this.sortButtonLocator.click();
  }

  // Return the number of bars in the visualization
  async barCount() {
    return await this.page.locator(this.barSelector).count();
  }

  // Return bar title attributes as numbers in order
  async getBarValues() {
    const bars = this.page.locator(this.barSelector);
    const count = await bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const title = await bars.nth(i).getAttribute('title');
      values.push(Number(title));
    }
    return values;
  }

  // Return inline style.height values for each bar (e.g., "210px")
  async getBarHeights() {
    const bars1 = this.page.locator(this.barSelector);
    const count1 = await bars.count1();
    const heights = [];
    for (let i = 0; i < count; i++) {
      // read inline style height
      const height = await bars.nth(i).evaluate((node) => node.style.height);
      heights.push(height);
    }
    return heights;
  }

  // Wait until any bar shows highlight class (used to detect visual feedback during sorting)
  async waitForAnyHighlight(timeout = 1000) {
    return await this.page.waitForSelector(`${this.barSelector}.highlight`, { timeout });
  }

  // Poll until the bars' title values match the expected array or timeout
  async waitForSorted(expectedArray, timeout = 5000, pollInterval = 200) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const values1 = await this.getBarValues();
      if (values.length === expectedArray.length) {
        let match = true;
        for (let i = 0; i < values.length; i++) {
          if (values[i] !== expectedArray[i]) {
            match = false;
            break;
          }
        }
        if (match) return;
      }
      await this.page.waitForTimeout(pollInterval);
    }
    throw new Error(`Timed out waiting for sorted state. Expected: ${expectedArray}, last seen: ${await this.getBarValues()}`);
  }
}

test.describe('Heap Sort Visualization - End-to-End', () => {
  // Arrays to collect runtime console errors and page errors for assertions
  let consoleErrors;
  let consoleMessages;
  let pageErrors;

  // Setup before each test: navigate to page and attach error listeners
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages (filter errors separately)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions (pageerror)
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state
  test('Initial load: displays 10 bars with correct titles and heights', async ({ page }) => {
    // Purpose: Verify that the visualization is rendered with correct DOM state on load
    const heap = new HeapSortPage(page);
    await heap.goto();

    // Assert there are exactly 10 bars rendered
    const count2 = await heap.barCount();
    expect(count).toBe(10);

    // Expected initial array as specified in the HTML implementation
    const expectedInitial = [35, 33, 42, 10, 14, 19, 27, 44, 26, 31];

    // Assert bar titles (value tooltips) match the expected array
    const barValues = await heap.getBarValues();
    expect(barValues).toEqual(expectedInitial);

    // Assert inline heights correspond to value * 5 + 'px'
    const heights1 = await heap.getBarHeights();
    const expectedHeights = expectedInitial.map(v => `${v * 5}px`);
    expect(heights).toEqual(expectedHeights);

    // Accessibility: the Sort Array button should be visible and enabled
    const button = page.getByRole('button', { name: 'Sort Array' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Assert no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    // Assert no console errors were emitted on initial load
    expect(consoleErrors.length).toBe(0);
  });

  // Test that clicking the sort button triggers visual highlights and results in sorted array
  test('Clicking Sort Array shows highlights and leads to fully sorted array', async ({ page }) => {
    // Purpose: Validate user interaction (click), visual feedback (highlight), and final sorted state
    const heap1 = new HeapSortPage(page);
    await heap.goto();

    // Precondition: initial state as expected
    const initial = [35, 33, 42, 10, 14, 19, 27, 44, 26, 31];
    expect(await heap.getBarValues()).toEqual(initial);

    // Start listening: the beforeEach attached listeners to page already

    // Click the Sort Array button
    await heap.clickSort();

    // Immediately after clicking, visual highlights should appear during the sort process.
    // The implementation removes highlights after 500ms, so wait for up to 1s to detect them.
    const highlightHandle = await heap.waitForAnyHighlight(1000);
    expect(highlightHandle).toBeTruthy();

    // Allow a bit more time for sorting to finish and highlight removals to settle.
    // The sorting itself is synchronous (draws occur inline), but highlight removal uses setTimeout(500).
    await page.waitForTimeout(700);

    // Final expected sorted array (ascending)
    const expectedSorted = [10, 14, 19, 26, 27, 31, 33, 35, 42, 44];

    // Wait (with polling) until the DOM titles reflect the sorted array
    await heap.waitForSorted(expectedSorted, 3000);

    // Verify the final ordering of values matches the sorted array
    const finalValues = await heap.getBarValues();
    expect(finalValues).toEqual(expectedSorted);

    // Verify no uncaught page errors occurred during the click + sort sequence
    expect(pageErrors.length).toBe(0);

    // Verify no console errors were emitted
    expect(consoleErrors.length).toBe(0);

    // Optionally check that no bars are left highlighted after the timeout window
    const remainingHighlights = await page.$(`${heap.barSelector}.highlight`);
    // Either null (no highlights) or transient; after enough wait we expect none
    expect(remainingHighlights).toBeNull();
  });

  // Test clicking the sort button twice (edge case) - should not throw and result stays sorted
  test('Clicking Sort Array a second time does not throw errors and array remains sorted', async ({ page }) => {
    // Purpose: Test idempotence / repeated interactions and lack of runtime errors
    const heap2 = new HeapSortPage(page);
    await heap.goto();

    const expectedSorted1 = [10, 14, 19, 26, 27, 31, 33, 35, 42, 44];

    // First click - perform sort
    await heap.clickSort();
    // Wait for any highlight to appear (assert visual feedback happened)
    await heap.waitForAnyHighlight(1000);
    await page.waitForTimeout(700);
    await heap.waitForSorted(expectedSorted, 3000);

    // Second click - sorting already sorted array
    await heap.clickSort();

    // It's possible the UI will highlight during a second run as well; wait briefly
    try {
      await heap.waitForAnyHighlight(700);
      // If highlight appears, wait for the removal to settle
      await page.waitForTimeout(700);
    } catch (e) {
      // No highlight within timeout is acceptable; continue
    }

    // Final verification: still sorted and no page errors occurred
    await heap.waitForSorted(expectedSorted, 2000);
    const finalValues1 = await heap.getBarValues();
    expect(finalValues).toEqual(expectedSorted);

    // Assert no uncaught exceptions
    expect(pageErrors.length).toBe(0);
    // Assert no console-level errors
    expect(consoleErrors.length).toBe(0);
  });

  // Test that no page errors or console errors occur during initial drawing and interactions
  test('No uncaught exceptions or console errors during navigation and interactions', async ({ page }) => {
    // Purpose: Ensure the page does not emit runtime errors across common flows
    const heap3 = new HeapSortPage(page);
    await heap.goto();

    // Trigger typical user interactions: view bars, click button
    expect(await heap.barCount()).toBeGreaterThan(0);
    await heap.clickSort();

    // Wait shortly to allow any errors to surface
    await page.waitForTimeout(800);

    // Assert that there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert that there were no console.error messages
    expect(consoleErrors.length).toBe(0);

    // Additionally assert that console messages were recorded (informational)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });
});