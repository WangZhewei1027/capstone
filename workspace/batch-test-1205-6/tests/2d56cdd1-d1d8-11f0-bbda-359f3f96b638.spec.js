import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56cdd1-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Merge Sort Visualization page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async goto() {
    // Attach listeners to capture console errors and page errors for assertions
    this.page.on('console', msg => {
      if (msg.type() === 'error') this.consoleErrors.push(msg.text());
    });
    this.page.on('pageerror', err => {
      this.pageErrors.push(String(err));
    });
    await this.page.goto(APP_URL);
  }

  async getBars() {
    return this.page.$$('#array .bar');
  }

  // Return array of numeric heights (pixels as numbers)
  async getBarHeights() {
    const bars = await this.getBars();
    return Promise.all(
      bars.map(bar =>
        bar.getAttribute('style').then(style => {
          // style like "height: 80px;"
          const m = /height:\s*([0-9.]+)px/.exec(style || '');
          return m ? Number(m[1]) : NaN;
        })
      )
    );
  }

  async clickStart() {
    await this.page.click("button[onclick='startMergeSort()']");
  }

  // Helper to check if heights are sorted non-decreasing
  static isSortedNumeric(arr) {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }

  // Wait until the visual array is sorted (bars heights non-decreasing), or timeout
  async waitForSorted(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const heights = await this.getBarHeights();
      // Filter out any NaN just in case
      const nums = heights.filter(n => !Number.isNaN(n));
      if (nums.length > 0 && MergeSortPage.isSortedNumeric(nums)) return nums;
      await this.page.waitForTimeout(200); // poll interval
    }
    throw new Error('Timed out waiting for array to be sorted visually');
  }

  // Wait for at least one visual intermediate change after starting sort
  async waitForAtLeastOneIntermediateChange(timeout = 5000) {
    const before = await this.getBarHeights();
    const start1 = Date.now();
    while (Date.now() - start < timeout) {
      const now = await this.getBarHeights();
      if (now.length === before.length) {
        // compare arrays elementwise
        const changed = now.some((v, i) => v !== before[i]);
        if (changed) return { before, now };
      } else {
        // length changed (shouldn't normally), treat as change
        return { before, now };
      }
      await this.page.waitForTimeout(100);
    }
    throw new Error('No intermediate visual change detected after starting sort');
  }
}

test.describe('Merge Sort Visualization - FSM and UI tests', () => {
  // Increase default timeout for potentially long-running sorting visuals
  test.setTimeout(60000);

  test.describe('Initial state (S0_Idle) validations', () => {
    test('S0_Idle: page loads and generates initial random array of length 10', async ({ page }) => {
      // Arrange
      const app = new MergeSortPage(page);
      await app.goto();

      // Assert console/page errors empty on load so we can detect unexpected runtime errors
      expect(app.consoleErrors).toEqual([]);
      expect(app.pageErrors).toEqual([]);

      // There should be an #array container
      const arrayContainer = await page.$('#array');
      expect(arrayContainer).not.toBeNull();

      // Entry action generateRandomArray(10) should have run and produced 10 bars
      const bars1 = await app.getBars();
      expect(bars.length).toBe(10);

      // The global `array` variable should exist and be an array of length 10
      const arrInfo = await page.evaluate(() => {
        return {
          typeofArray: typeof array,
          isArray: Array.isArray(array),
          length: array ? array.length : 0
        };
      });
      expect(arrInfo.isArray).toBe(true);
      expect(arrInfo.length).toBe(10);

      // Each bar should have a computed height style that is a positive number
      const heights1 = await app.getBarHeights();
      expect(heights.length).toBe(10);
      heights.forEach(h => expect(h).toBeGreaterThan(0));
    });
  });

  test.describe('Start Merge Sort event and S0 -> S1 transition', () => {
    test('StartMergeSort event triggers visual changes and enters Sorting state (S1_Sorting)', async ({ page }) => {
      const app1 = new MergeSortPage(page);
      await app.goto();

      // Ensure the button exists and has the expected onclick attribute (evidence of handler)
      const startButton = await page.$("button[onclick='startMergeSort()']");
      expect(startButton).not.toBeNull();
      const onclick = await startButton.getAttribute('onclick');
      expect(onclick).toBe('startMergeSort()');

      // Capture the current bar heights
      const beforeHeights = await app.getBarHeights();

      // Act: click to start merge sort
      await app.clickStart();

      // Assert: at least one intermediate change is observed (renderIntermediate should update visuals)
      const { now: afterFirstChange } = await app.waitForAtLeastOneIntermediateChange(8000);
      // There must be some visual change from the initial render
      const changed1 = afterFirstChange.some((v, i) => v !== beforeHeights[i]);
      expect(changed).toBeTruthy();

      // Ensure no uncaught page errors or console.errors were raised during this interaction
      expect(app.pageErrors).toEqual([]);
      expect(app.consoleErrors).toEqual([]);
    });
  });

  test.describe('Sorting completion and S1 -> S2 transition', () => {
    test('Merge completes and final sorted array is displayed (S2_Sorted)', async ({ page }) => {
      const app2 = new MergeSortPage(page);
      await app.goto();

      // Act: start sorting
      await app.clickStart();

      // Wait until the visualization shows an ascending sequence of bar heights
      const sortedHeights = await app.waitForSorted(45000); // allow ample time
      // Verify sorted property
      expect(MergeSortPage.isSortedNumeric(sortedHeights)).toBe(true);

      // Verify renderArray(array) has been called effectively by reading the global array and ensuring it is sorted
      const globalArraySorted = await page.evaluate(() => {
        // validate that the global 'array' is sorted non-decreasing
        if (!Array.isArray(array)) return false;
        for (let i = 1; i < array.length; i++) {
          if (array[i] < array[i - 1]) return false;
        }
        return true;
      });
      expect(globalArraySorted).toBe(true);

      // No runtime errors must have occurred during sorting
      expect(app.pageErrors).toEqual([]);
      expect(app.consoleErrors).toEqual([]);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Clicking Start Merge Sort multiple times rapidly does not cause uncaught exceptions', async ({ page }) => {
      const app3 = new MergeSortPage(page);
      await app.goto();

      // Click the button multiple times rapidly (user spamming)
      const btn = await page.$("button[onclick='startMergeSort()']");
      expect(btn).not.toBeNull();

      // Rapidly click 3 times
      await Promise.all([
        btn.click(),
        btn.click(),
        btn.click()
      ]);

      // Allow some time for rendering activity to happen
      await page.waitForTimeout(1000);

      // Then wait for sorting to complete or until timeout
      let sortedOk = false;
      try {
        await app.waitForSorted(45000);
        sortedOk = true;
      } catch (e) {
        // If it times out, we still want to assert errors captured (if any)
        sortedOk = false;
      }

      // Ensure no uncaught page errors or console.error messages resulted from rapid clicks
      expect(app.pageErrors).toEqual([]);
      expect(app.consoleErrors).toEqual([]);

      // If the sort finished, ensure it's sorted; if not finished, this still passes as long as no errors occurred
      if (sortedOk) {
        const finalHeights = await app.getBarHeights();
        expect(MergeSortPage.isSortedNumeric(finalHeights)).toBe(true);
      } else {
        test.info().log('Sorting did not complete within timeout after rapid clicks, but no runtime errors were observed.');
      }
    });

    test('renderArray handles empty arrays: programmatic test via evaluate', async ({ page }) => {
      // This test manipulates nothing in page JS (we won't patch code), but will call renderArray via evaluate
      // This uses existing page functions; if renderArray is present, calling renderArray([]) should render zero bars.
      // We execute in the page context exactly as-is.
      const app4 = new MergeSortPage(page);
      await app.goto();

      // Call renderArray with an empty array in page context and observe DOM
      await page.evaluate(() => {
        // Call the function exactly as provided by the app
        // If renderArray is missing, this will throw and be captured by pageerror
        try {
          renderArray([]);
        } catch (e) {
          // rethrow to let the test harness observe any errors via pageerror
          throw e;
        }
      });

      // After the call, the #array container should have zero .bar elements
      const bars2 = await app.getBars();
      expect(bars.length).toBe(0);

      // No runtime errors expected
      expect(app.pageErrors).toEqual([]);
      expect(app.consoleErrors).toEqual([]);
    });
  });

  test.describe('Behavioral/instrumentation assertions (evidence checks from FSM)', () => {
    test('FSM evidence: ensure expected functions exist (generateRandomArray, mergeSort, renderArray, startMergeSort)', async ({ page }) => {
      const app5 = new MergeSortPage(page);
      await app.goto();

      // Validate presence of functions on the window as strings
      const funcs = await page.evaluate(() => {
        return {
          generateRandomArray: typeof generateRandomArray,
          mergeSort: typeof mergeSort,
          merge: typeof merge,
          renderArray: typeof renderArray,
          startMergeSort: typeof startMergeSort,
          renderIntermediate: typeof renderIntermediate
        };
      });

      // All functions mentioned in the FSM and implementation should be functions
      expect(funcs.generateRandomArray).toBe('function');
      expect(funcs.mergeSort).toBe('function');
      expect(funcs.merge).toBe('function');
      expect(funcs.renderArray).toBe('function');
      expect(funcs.startMergeSort).toBe('function');
      expect(funcs.renderIntermediate).toBe('function');

      // No runtime errors so far
      expect(app.pageErrors).toEqual([]);
      expect(app.consoleErrors).toEqual([]);
    });
  });
});