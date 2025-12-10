import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56f4e0-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Heap Sort visualization page
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.pageErrors = [];

    // Collect console error messages
    this.page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          this.consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // swallow any inspection errors
      }
    });

    // Collect uncaught exceptions on the page
    this.page.on('pageerror', (err) => {
      try {
        this.pageErrors.push(String(err && err.message ? err.message : err));
      } catch (e) {
        // swallow any inspection errors
      }
    });
  }

  // Navigate to the app and wait for initial rendering
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the array container to exist
    await this.page.waitForSelector('#array');
    // Ensure initial draw has produced bars (expected 10 according to implementation)
    await this.page.waitForFunction(() => {
      const c = document.getElementById('array');
      return c && c.getElementsByClassName('bar').length > 0;
    });
  }

  // Returns array of heights (as numbers) for each bar in DOM order
  async getBarHeights() {
    return await this.page.$$eval('.bar', (bars) =>
      Array.from(bars).map((b) => {
        // style.height is like "175px"
        const h = b.style.height || window.getComputedStyle(b).height || '';
        return parseInt(h.replace('px', '') || '0', 10);
      })
    );
  }

  // Returns count of bars
  async getBarCount() {
    return await this.page.$$eval('.bar', (bars) => bars.length);
  }

  // Returns number of bars with given className
  async countBarsWithClass(className) {
    return await this.page.$$eval(`.bar.${className}`, (bars) => bars.length);
  }

  // Click the Sort Array button
  async clickSort() {
    const btn = await this.page.$("button[onclick='heapSort()']");
    if (!btn) throw new Error("Sort Array button not found");
    await btn.click();
  }

  // Wait until all bars acquire 'sorted' class or timeout
  async waitForAllSorted(timeout = 10000) {
    await this.page.waitForFunction(
      (expected) => {
        const bars = document.getElementsByClassName('bar');
        if (!bars || bars.length === 0) return false;
        for (let i = 0; i < bars.length; i++) {
          if (!bars[i].classList.contains('sorted')) return false;
        }
        return true;
      },
      null,
      { timeout }
    );
  }

  // Wait until at least one 'current' class appears during sorting
  async waitForAnyCurrent(timeout = 3000) {
    await this.page.waitForFunction(
      () => {
        const bars1 = document.getElementsByClassName('current');
        return bars && bars.length > 0;
      },
      null,
      { timeout }
    );
  }

  // Return collected console and page errors
  getErrors() {
    return { consoleErrors: this.consoleErrors.slice(), pageErrors: this.pageErrors.slice() };
  }
}

test.describe('Heap Sort Visualization - FSM states and transitions', () => {
  let heapPage;

  // Setup for each test: create page object and navigate
  test.beforeEach(async ({ page }) => {
    heapPage = new HeapSortPage(page);
    await heapPage.goto();
  });

  // Teardown: nothing to clean in this simple app but keep hooks for clarity
  test.afterEach(async ({}, testInfo) => {
    // If tests failed, attach collected console errors for easier debugging in test logs
    const errs = heapPage.getErrors();
    if (testInfo.status !== testInfo.expectedStatus) {
      // attach to output (Playwright will show test failure details)
      console.log('Collected console errors:', errs.consoleErrors);
      console.log('Collected page errors:', errs.pageErrors);
    }
  });

  test('S0_Idle: Initial drawArray() renders expected bars (entry action verification)', async () => {
    // This test validates the Idle state's entry action drawArray() by inspecting the DOM
    // Expectation: bars are rendered, count is 10, heights correspond to the initial array scaling,
    // and no bars are marked as "sorted" or "current".
    const barCount = await heapPage.getBarCount();
    expect(barCount).toBe(10);

    const heights = await heapPage.getBarHeights();
    // Known initial array: [35,33,42,10,14,19,27,44,26,31]; heights scaled by *5
    const expectedHeights = [35, 33, 42, 10, 14, 19, 27, 44, 26, 31].map((v) => v * 5);
    expect(heights).toEqual(expectedHeights);

    // No bars should have 'sorted' or 'current' classes on initial draw
    const sortedCount = await heapPage.countBarsWithClass('sorted');
    const currentCount = await heapPage.countBarsWithClass('current');
    expect(sortedCount).toBe(0);
    expect(currentCount).toBe(0);

    // Ensure no console or page errors were emitted during initial load
    const errors = heapPage.getErrors();
    expect(errors.consoleErrors.length).toBe(0);
    expect(errors.pageErrors.length).toBe(0);
  });

  test('S0 -> S1 Transition: Clicking Sort Array begins sorting (heapSort invoked)', async () => {
    // This test validates transition from Idle to Sorting when the user clicks "Sort Array"
    // It checks that visual "current" indicators appear during the process and that no runtime errors occur.

    // Click the button to start sorting
    await heapPage.clickSort();

    // Wait until some bars are highlighted as 'current' which indicates active heapify/sorting
    // We allow up to 3 seconds for visual indications to appear
    await heapPage.waitForAnyCurrent(3000);

    const currentDuringSort = await heapPage.countBarsWithClass('current');
    expect(currentDuringSort).toBeGreaterThan(0);

    // While sorting is in progress ensure no uncaught errors have been emitted so far
    const errors1 = heapPage.getErrors();
    expect(errors.consoleErrors.length).toBe(0);
    expect(errors.pageErrors.length).toBe(0);
  });

  test('S1 -> S2 Transition: After sorting completes all bars are marked as sorted (final state)', async () => {
    // This test validates that after the sorting process completes all bars receive the 'sorted' class
    // which corresponds to the final state's entry actions (visual marking of sorted bars).
    await heapPage.clickSort();

    // Wait for completion: the implementation marks sorted after (n-1)*500 ms; for n=10 that's 4500ms.
    // Provide generous timeout to handle scheduling; 8000ms should be safe.
    await heapPage.waitForAllSorted(8000);

    const sortedCount1 = await heapPage.countBarsWithClass('sorted');
    const totalCount = await heapPage.getBarCount();
    expect(sortedCount).toBe(totalCount);
    expect(totalCount).toBe(10);

    // Verify that final bar heights are sorted in non-decreasing order (visual confirmation of sorted array)
    const finalHeights = await heapPage.getBarHeights();
    for (let i = 0; i < finalHeights.length - 1; i++) {
      expect(finalHeights[i]).toBeLessThanOrEqual(finalHeights[i + 1]);
    }

    // Confirm no runtime errors occurred during the entire process
    const errors2 = heapPage.getErrors();
    expect(errors.consoleErrors.length).toBe(0);
    expect(errors.pageErrors.length).toBe(0);
  });

  test('Edge case: Clicking Sort Array multiple times should not throw uncaught exceptions and ends sorted', async () => {
    // This test simulates a user rapidly clicking the Sort Array button multiple times.
    // It verifies the app does not emit uncaught errors and that the final state remains all bars sorted.

    // Click twice in quick succession
    await heapPage.clickSort();
    // Small inter-click delay to simulate a user double-click
    await heapPage.page.waitForTimeout(100);
    await heapPage.clickSort();

    // Wait for sorting to finish (allowing the same generous timeout as above)
    await heapPage.waitForAllSorted(9000);

    const sortedCount2 = await heapPage.countBarsWithClass('sorted');
    const totalCount1 = await heapPage.getBarCount();
    expect(sortedCount).toBe(totalCount);

    // Ensure still no console/page errors after repeated invocations
    const errors3 = heapPage.getErrors();
    expect(errors.consoleErrors.length).toBe(0);
    expect(errors.pageErrors.length).toBe(0);
  });

  test('Error observation: Capture any runtime exceptions or console.errors during routine interactions', async () => {
    // This test explicitly exercises the page and asserts that either errors are absent,
    // or if errors occurred they have been captured (assert capturing works).
    // It serves to validate our monitoring mechanism.

    // Perform a normal interaction
    await heapPage.clickSort();

    // Wait a short time for any errors to surface
    await heapPage.page.waitForTimeout(1000);

    // Retrieve errors captured by the page object
    const { consoleErrors, pageErrors } = heapPage.getErrors();

    // The application is expected to run without runtime errors; assert none were captured.
    // If the environment produced ReferenceError/SyntaxError/TypeError, the arrays would be non-empty
    // and this assertion would fail (which is intended per design: we observe and assert errors if they occur).
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});