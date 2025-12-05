import { test, expect } from '@playwright/test';

// Test file: 39b7a020-d1d5-11f0-b49a-6f458b3a25ef-selection-sort.spec.js
// Tests for Selection Sort Visualization application
// Application URL: http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7a020-d1d5-11f0-b49a-6f458b3a25ef.html

// Page Object to encapsulate element selectors and common actions
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7a020-d1d5-11f0-b49a-6f458b3a25ef.html';
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Returns all bar elements
  bars() {
    return this.page.locator('#arrayContainer .bar');
  }

  // Returns the Sort button (by text)
  sortButton() {
    return this.page.getByRole('button', { name: 'Sort Array' });
  }

  // Returns the Reset button (by text)
  resetButton() {
    return this.page.getByRole('button', { name: 'Reset Array' });
  }

  // Read the heights of bars as numbers (px -> number)
  async getBarHeights() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      return bars.map(b => {
        const h = b.style.height || window.getComputedStyle(b).height;
        return parseFloat(h); // returns number in px
      });
    });
  }

  // Count bars
  async countBars() {
    return await this.bars().count();
  }

  // Wait until bars match expected heights (numbers, px)
  async waitForHeights(expectedHeightsPx, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const heights = await this.getBarHeights();
      // Compare arrays numerically with tolerance (exact px expected here)
      const matches =
        heights.length === expectedHeightsPx.length &&
        heights.every((h, i) => Math.abs(h - expectedHeightsPx[i]) < 0.5);
      if (matches) return;
      await this.page.waitForTimeout(200);
    }
    throw new Error('Timed out waiting for expected bar heights: ' + expectedHeightsPx.join(', '));
  }

  // Wait for any highlight to appear (used to verify visual feedback during sort)
  async waitForAnyHighlight(timeout = 5000) {
    await this.page.waitForSelector('#arrayContainer .bar.highlight', { timeout });
  }
}

// Helper: convert value array to px-heights (value * 5 as in the app)
const toPxHeights = (values) => values.map(v => v * 5);

test.describe('Selection Sort Visualization - Core behavior and UI', () => {
  // We'll collect console errors and page errors per test to assert there are none
  test.beforeEach(async ({ page }) => {
    // Increase default timeout for potentially long-running sort visualization
    test.setTimeout(30000);
  });

  // Group tests that interact with the page
  test.describe('Initial load and default state', () => {
    test('Page loads and displays initial array bars with correct heights and count', async ({ page }) => {
      // Purpose: Ensure the page renders the initial array correctly on load.
      const app = new SelectionSortPage(page);
      const consoleErrors = [];
      const pageErrors = [];

      // Listen for console errors and page errors
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err));

      await app.goto();

      // Verify there are exactly 5 bars
      const count = await app.countBars();
      expect(count).toBe(5);

      // Verify heights correspond to [64,25,12,22,11] * 5 px
      const expectedInitial = toPxHeights([64, 25, 12, 22, 11]);
      const heights1 = await app.getBarHeights();
      // Ensure each height matches expected (tolerance for float)
      expect(heights.length).toBe(expectedInitial.length);
      for (let i = 0; i < heights.length; i++) {
        expect(Math.abs(heights[i] - expectedInitial[i]) < 0.5).toBeTruthy();
      }

      // Buttons should be visible and enabled
      await expect(app.sortButton()).toBeVisible();
      await expect(app.resetButton()).toBeVisible();
      await expect(app.sortButton()).toBeEnabled();
      await expect(app.resetButton()).toBeEnabled();

      // Assert that the page emitted no console errors or uncaught page errors during load
      expect(consoleErrors, 'No console error logs should be emitted during load').toEqual([]);
      expect(pageErrors, 'No uncaught page errors should occur during load').toEqual([]);
    });
  });

  test.describe('Interactive controls: Sort and Reset behavior', () => {
    test('Clicking Sort runs the visualization and results in a sorted array', async ({ page }) => {
      // Purpose: Start the selection sort, wait for the algorithm to complete, and verify final order.
      const app1 = new SelectionSortPage(page);
      const consoleErrors1 = [];
      const pageErrors1 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err));

      await app.goto();

      // Click the Sort button to start the visualization
      await app.sortButton().click();

      // While sorting, there should be at least one highlighted bar at some point
      await app.waitForAnyHighlight(7000); // wait up to 7s for highlight to appear

      // Wait for final sorted heights [11,12,22,25,64] -> px
      const expectedSorted = toPxHeights([11, 12, 22, 25, 64]);
      // Give enough time for the full algorithm to finish (approx ~7s as per implementation)
      await app.waitForHeights(expectedSorted, 20000);

      // Confirm final DOM order matches ascending values
      const finalHeights = await app.getBarHeights();
      for (let i = 0; i < expectedSorted.length; i++) {
        expect(Math.abs(finalHeights[i] - expectedSorted[i]) < 0.5).toBeTruthy();
      }

      // No uncaught errors during sort
      expect(consoleErrors, 'No console errors during sort execution').toEqual([]);
      expect(pageErrors, 'No page errors during sort execution').toEqual([]);
    });

    test('Clicking Reset restores the initial unsorted array', async ({ page }) => {
      // Purpose: Verify resetArray restores the original array representation.
      const app2 = new SelectionSortPage(page);
      const consoleErrors2 = [];
      const pageErrors2 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err));

      await app.goto();

      // Ensure initial state is the unsorted array
      const expectedInitial1 = toPxHeights([64, 25, 12, 22, 11]);
      await app.waitForHeights(expectedInitial);

      // Start sort, then press Reset during the sorting process to test behavior during mid-execution
      await app.sortButton().click();

      // Wait for a short moment to let sorting begin and highlights appear
      await app.waitForAnyHighlight(7000);

      // Click Reset while sorting is ongoing
      await app.resetButton().click();

      // After reset, the bars should reflect the original array immediately
      await app.waitForHeights(expectedInitial, 5000);

      const heightsAfterReset = await app.getBarHeights();
      for (let i = 0; i < expectedInitial.length; i++) {
        expect(Math.abs(heightsAfterReset[i] - expectedInitial[i]) < 0.5).toBeTruthy();
      }

      // No uncaught errors triggered by reset during sort
      expect(consoleErrors, 'No console errors during reset').toEqual([]);
      expect(pageErrors, 'No page errors during reset').toEqual([]);
    });

    test('Reset when already in initial state leaves the UI unchanged', async ({ page }) => {
      // Purpose: Ensure calling resetArray when array is already default does not break the UI.
      const app3 = new SelectionSortPage(page);
      const consoleErrors3 = [];
      const pageErrors3 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err));

      await app.goto();

      const expectedInitial2 = toPxHeights([64, 25, 12, 22, 11]);
      await app.waitForHeights(expectedInitial);

      // Click Reset again
      await app.resetButton().click();

      // Expect heights unchanged
      const heights2 = await app.getBarHeights();
      for (let i = 0; i < expectedInitial.length; i++) {
        expect(Math.abs(heights[i] - expectedInitial[i]) < 0.5).toBeTruthy();
      }

      // Buttons still enabled and visible
      await expect(app.sortButton()).toBeVisible();
      await expect(app.resetButton()).toBeVisible();

      expect(consoleErrors, 'No console errors after redundant reset').toEqual([]);
      expect(pageErrors, 'No page errors after redundant reset').toEqual([]);
    });
  });

  test.describe('Visual feedback and DOM mutation checks', () => {
    test('During sorting, highlighted bars appear and are removed appropriately', async ({ page }) => {
      // Purpose: Verify that the highlight class is applied to bars during comparison and that
      // the DOM updates reflect highlighting behavior.
      const app4 = new SelectionSortPage(page);
      const highlightEvents = [];
      const consoleErrors4 = [];
      const pageErrors4 = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err));

      await app.goto();

      // Start sorting
      await app.sortButton().click();

      // We will observe the DOM for highlight class changes for a few seconds
      // Poll for highlight presence multiple times to assert toggling behavior
      const start1 = Date.now();
      let sawHighlight = false;
      let sawUnhighlightAfter = false;

      while (Date.now() - start < 8000) {
        const anyHighlighted = await page.$('#arrayContainer .bar.highlight');
        if (anyHighlighted) {
          sawHighlight = true;
        } else if (sawHighlight) {
          // If we previously saw a highlight and now none, it's evidence of unhighlighting
          sawUnhighlightAfter = true;
          break;
        }
        await page.waitForTimeout(300);
      }

      // At least one highlight should have been observed, and at some later point highlights should be removed
      expect(sawHighlight, 'Expected to see at least one bar highlighted during sort').toBeTruthy();
      // Unhighlighting might happen after; assert that we observed removal at some point during polling
      expect(sawUnhighlightAfter, 'Expected highlights to be removed at some point during sort polling').toBeTruthy();

      expect(consoleErrors, 'No console errors during highlight observation').toEqual([]);
      expect(pageErrors, 'No page errors during highlight observation').toEqual([]);
    });
  });

  test.describe('Error monitoring and robustness', () => {
    test('No unexpected ReferenceError, SyntaxError, or TypeError are emitted on page load and interactions', async ({ page }) => {
      // Purpose: Observe console and uncaught page errors across common interactions and assert none of the critical error types occurred.
      const app5 = new SelectionSortPage(page);

      const consoleErrors5 = [];
      const uncaughtErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        uncaughtErrors.push(err);
      });

      await app.goto();

      // Interact with the app: start sort, wait briefly, reset
      await app.sortButton().click();
      // Wait a short period to let some actions run
      await page.waitForTimeout(1200);
      await app.resetButton().click();

      // Wait for any potential uncaught errors to surface
      await page.waitForTimeout(500);

      // Check collected errors for specific JavaScript error types
      const pageErrorMessages = uncaughtErrors.map(e => String(e && e.message ? e.message : e));

      // Assert that none of the uncaught errors are TypeError/ReferenceError/SyntaxError
      for (const message of pageErrorMessages) {
        expect(
          /TypeError|ReferenceError|SyntaxError/.test(message),
          `Unexpected critical error detected: ${message}`
        ).toBeFalsy();
      }

      // Also assert that there were no console.error logs indicating critical failures
      for (const msg of consoleErrors) {
        expect(/TypeError|ReferenceError|SyntaxError/.test(msg)).toBeFalsy();
      }
    });
  });
});