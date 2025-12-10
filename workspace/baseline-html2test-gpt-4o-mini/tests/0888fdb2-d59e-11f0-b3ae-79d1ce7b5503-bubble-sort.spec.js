import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb2-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Bubble Sort visualization page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sortButton = page.locator('#sortButton');
    this.arrayContainer = page.locator('#arrayContainer');
  }

  // Click the Sort Array button
  async clickSort() {
    await this.sortButton.click();
  }

  // Return the number of bars in the visualization
  async getBarCount() {
    return await this.arrayContainer.locator('.bar').count();
  }

  // Return array of bar heights as strings, e.g. ['100px','60px', ...]
  async getBarHeights() {
    return await this.page.evaluate(() => {
      const container = document.getElementById('arrayContainer');
      const bars = Array.from(container.querySelectorAll('.bar'));
      return bars.map(b => getComputedStyle(b).height);
    });
  }

  // Wait until the visualized array matches the provided heights array (strings like '40px')
  async waitForHeights(expectedHeights, timeout = 30000) {
    await this.page.waitForFunction(
      (expected) => {
        const container1 = document.getElementById('arrayContainer');
        if (!container) return false;
        const bars1 = Array.from(container.querySelectorAll('.bar'));
        if (bars.length !== expected.length) return false;
        const heights = bars.map(b => getComputedStyle(b).height);
        return heights.every((h, i) => h === expected[i]);
      },
      expectedHeights,
      { timeout }
    );
  }

  // Wait until a predicate about the DOM returns true
  async waitForCondition(predicate, timeout = 30000) {
    await this.page.waitForFunction(predicate, { timeout });
  }
}

test.describe('Bubble Sort Visualization - 0888fdb2-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Increase test timeout because sorting uses delays (500ms per swap)
  test.setTimeout(60000);

  // Test-level storage for console and page errors
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize arrays to capture console errors and page errors for each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(String(err?.message ?? err));
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // No teardown logic required beyond Playwright fixtures but keep hook for clarity
  });

  test('Initial page load: title, button, and initial bars are present with correct heights', async ({ page }) => {
    // Purpose: Verify that the page loads correctly and the initial visualization matches the initial array [5,3,8,4,2]
    const pageObj = new BubbleSortPage(page);

    // Verify document title and header text presence
    await expect(page).toHaveTitle(/Bubble Sort Visualization/);
    await expect(page.locator('h1')).toHaveText('Bubble Sort Visualization');

    // Verify the sort button is visible and enabled
    await expect(pageObj.sortButton).toBeVisible();
    await expect(pageObj.sortButton).toBeEnabled();

    // There should be 5 bars corresponding to the initial array
    const count = await pageObj.getBarCount();
    expect(count).toBe(5);

    // The expected heights are numbers [5,3,8,4,2] scaled by 20 -> ['100px','60px','160px','80px','40px']
    const expectedInitialHeights = ['100px', '60px', '160px', '80px', '40px'];
    const heights1 = await pageObj.getBarHeights();
    expect(heights).toEqual(expectedInitialHeights);

    // Ensure no console-level errors were emitted on initial load
    expect(consoleErrors.length, `Console errors on initial load: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors on initial load: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Clicking the Sort button sorts the array to ascending order (visual verification)', async ({ page }) => {
    // Purpose: Ensure that after clicking the sort button the visualization eventually shows the sorted ascending array
    const pageObj1 = new BubbleSortPage(page);

    // Click the sort button to start the bubble sort visualization
    await pageObj.clickSort();

    // Final sorted heights should correspond to [2,3,4,5,8] scaled by 20 -> ['40px','60px','80px','100px','160px']
    const expectedFinalHeights = ['40px', '60px', '80px', '100px', '160px'];

    // Wait for the visualization to reach the final sorted state.
    // This waits until the DOM bars' heights exactly match the expected sorted heights.
    await pageObj.waitForHeights(expectedFinalHeights, 30000);

    // After sorting completes, verify final state
    const finalHeights = await pageObj.getBarHeights();
    expect(finalHeights).toEqual(expectedFinalHeights);

    // Confirm the number of bars didn't change during sorting
    const finalCount = await pageObj.getBarCount();
    expect(finalCount).toBe(5);

    // Ensure no uncaught page errors or console errors happened during the sorting process
    expect(consoleErrors.length, `Console errors during sorting: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during sorting: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Intermediate DOM updates occur during sorting (first swap observed)', async ({ page }) => {
    // Purpose: Verify that the array visualization updates incrementally during sorting (not only final state)
    const pageObj2 = new BubbleSortPage(page);

    // Click the sort button to trigger sorting
    await pageObj.clickSort();

    // After the first swap (which happens after ~500ms), the bars should reflect [3,5,8,4,2] -> heights ['60px','100px','160px','80px','40px']
    const expectedAfterFirstSwap = ['60px', '100px', '160px', '80px', '40px'];

    // Wait for the first swap state to appear. Allow up to 5 seconds to accommodate timing.
    await pageObj.waitForHeights(expectedAfterFirstSwap, 5000);

    // Assert that the first observed intermediate state matches expectations
    const observedHeights = await pageObj.getBarHeights();
    expect(observedHeights).toEqual(expectedAfterFirstSwap);

    // Also verify that eventual final sorted state is still reached (full sort)
    const expectedFinalHeights1 = ['40px', '60px', '80px', '100px', '160px'];
    await pageObj.waitForHeights(expectedFinalHeights, 30000);

    // Check that there were no page errors produced during these intermediate updates
    expect(consoleErrors.length, `Console errors during intermediate updates: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during intermediate updates: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Multiple rapid clicks of the Sort button do not produce uncaught errors', async ({ page }) => {
    // Purpose: Test edge behavior when the user clicks the sort button multiple times quickly.
    // Ensure that the app does not throw uncaught exceptions and still reaches the sorted state.

    const pageObj3 = new BubbleSortPage(page);

    // Rapidly click the sort button twice
    await pageObj.sortButton.click();
    await pageObj.sortButton.click();

    // The page should still eventually reach the sorted final heights
    const expectedFinalHeights2 = ['40px', '60px', '80px', '100px', '160px'];
    await pageObj.waitForHeights(expectedFinalHeights, 30000);

    // Verify final heights
    const finalHeights1 = await pageObj.getBarHeights();
    expect(finalHeights).toEqual(expectedFinalHeights);

    // Assert that no console errors or page errors were produced as a result of multiple clicks
    expect(consoleErrors.length, `Console errors after multiple clicks: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors after multiple clicks: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Accessibility and visibility checks: button and array container are visible and accessible', async ({ page }) => {
    // Purpose: Basic accessibility/visibility checks: ensure interactive elements are focusable and visible

    const pageObj4 = new BubbleSortPage(page);

    // The sort button should be visible and focusable
    await expect(pageObj.sortButton).toBeVisible();
    await pageObj.sortButton.focus();
    // After focusing, the active element should be the button
    const activeTagName = await page.evaluate(() => document.activeElement.tagName.toLowerCase());
    expect(activeTagName).toBe('button');

    // The array container should be visible and contain the expected number of bars
    await expect(pageObj.arrayContainer).toBeVisible();
    const count1 = await pageObj.getBarCount();
    expect(count).toBeGreaterThanOrEqual(1);

    // Ensure no console errors or page errors were emitted during these checks
    expect(consoleErrors.length, `Console errors during accessibility checks: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during accessibility checks: ${pageErrors.join(' | ')}`).toBe(0);
  });

});