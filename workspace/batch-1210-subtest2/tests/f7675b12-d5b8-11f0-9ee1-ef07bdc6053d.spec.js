import { test, expect } from '@playwright/test';

// Test file for Application ID: f7675b12-d5b8-11f0-9ee1-ef07bdc6053d
// Served at: http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7675b12-d5b8-11f0-9ee1-ef07bdc6053d.html
// Filename requirement: f7675b12-d5b8-11f0-9ee1-ef07bdc6053d.spec.js

// Page Object for the Selection Sort page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7675b12-d5b8-11f0-9ee1-ef07bdc6053d.html';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async getBars() {
    return this.page.$$('#array-container .bar');
  }

  async getValues() {
    return this.page.$$eval('#array-container .bar', nodes => nodes.map(n => parseInt(n.innerText, 10)));
  }

  async getHeights() {
    return this.page.$$eval('#array-container .bar', nodes => nodes.map(n => n.style.height));
  }

  async clickSort() {
    await this.page.click("button[onclick='selectionSort()']");
  }

  async getSelectionSortSource() {
    return this.page.evaluate(() => {
      // Return the function source; if undefined, return null
      try {
        return selectionSort ? selectionSort.toString() : null;
      } catch (e) {
        return null;
      }
    });
  }

  // Wait until the array shown in the UI matches expectedValues
  async waitForValues(expectedValues, timeout = 10000) {
    await this.page.waitForFunction(
      (expected) => {
        const bars = Array.from(document.querySelectorAll('#array-container .bar'));
        if (bars.length !== expected.length) return false;
        const vals = bars.map(b => parseInt(b.innerText, 10));
        return expected.every((v, i) => v === vals[i]);
      },
      expectedValues,
      { timeout }
    );
  }
}

test.describe('Selection Sort Visualization FSM and UI tests', () => {
  // Collect console messages and page errors for observation in each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Observe console messages
    page.on('console', msg => {
      const text = `[console:${msg.type()}] ${msg.text()}`;
      consoleMessages.push({ type: msg.type(), text });
      // Also capture error typed console messages separately
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Observe uncaught page errors (ReferenceError, TypeError, etc)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure Playwright observed console and page errors arrays exist
    // We do not assert here because individual tests will assert expectations.
  });

  test('S0_Idle: on page load renderArray() should have run and initial DOM reflects the array', async ({ page }) => {
    // This test validates the FSM initial state (Idle) entry action renderArray()
    const p = new SelectionSortPage(page);
    await p.goto();

    // Verify selectionSort function exists and its source contains 'async function selectionSort'
    const source = await p.getSelectionSortSource();
    expect(source).not.toBeNull();
    expect(source).toContain('async function selectionSort');

    // The initial array in the implementation is [64,25,12,22,11]
    const initialValues = await p.getValues();
    expect(initialValues.length).toBe(5);
    expect(initialValues).toEqual([64, 25, 12, 22, 11]);

    // Verify bar heights correspond to value * 5 (as implemented)
    const heights = await p.getHeights();
    const expectedHeights = initialValues.map(v => `${v * 5}px`);
    expect(heights).toEqual(expectedHeights);

    // Ensure no uncaught page errors happened on load
    expect(pageErrors.length).toBe(0);
    // Ensure console did not emit error-level messages on load
    expect(consoleErrors.length).toBe(0);
  });

  test('S1_Sorting: clicking Sort Array triggers selectionSort and results in a sorted array visually', async ({ page }) => {
    // This test validates the transition from Idle -> Sorting via the SortArray click event
    const p = new SelectionSortPage(page);
    await p.goto();

    const before = await p.getValues();
    expect(before).toEqual([64, 25, 12, 22, 11]);

    // Click the Sort Array button to trigger selectionSort()
    await p.clickSort();

    // Wait for final sorted array [11,12,22,25,64]
    const expectedSorted = [11, 12, 22, 25, 64];
    // selectionSort performs 3 swaps with 500ms delay each; give generous timeout
    await p.waitForValues(expectedSorted, 10000);

    const after = await p.getValues();
    expect(after).toEqual(expectedSorted);

    // Confirm that console and page error listeners did not capture errors during sorting
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Transition behavior: visual updates occur progressively during sorting (observe intermediate state)', async ({ page }) => {
    // This test checks that after initiating the sort, the array DOM updates at least once before final sort
    const p = new SelectionSortPage(page);
    await p.goto();

    const initial = await p.getValues();
    expect(initial).toEqual([64, 25, 12, 22, 11]);

    // Start sorting
    await p.clickSort();

    // Shortly after clicking (but before full completion), the UI should have changed due to a swap+render
    // We'll poll for a change from the initial configuration within a short window.
    let intermediateObserved = false;
    try {
      await page.waitForFunction(
        (initialVals) => {
          const bars = Array.from(document.querySelectorAll('#array-container .bar'));
          const vals = bars.map(b => parseInt(b.innerText, 10));
          // If values are not strictly equal to initial, we observed a change
          if (vals.length !== initialVals.length) return false;
          for (let i = 0; i < vals.length; i++) {
            if (vals[i] !== initialVals[i]) return true;
          }
          return false;
        },
        initial,
        { timeout: 1500 } // short timeout to detect intermediate change
      );
      intermediateObserved = true;
    } catch (e) {
      intermediateObserved = false;
    }

    // Expect that we observed at least one intermediate render (a swap happened)
    expect(intermediateObserved).toBe(true);

    // Wait for final sorted state as well to ensure completion
    await p.waitForValues([11, 12, 22, 25, 64], 10000);

    // No uncaught page errors or console errors during the process
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Edge case: clicking Sort Array multiple times quickly does not crash the page and final result is sorted', async ({ page }) => {
    // This test simulates a user clicking the sort button multiple times rapidly
    const p = new SelectionSortPage(page);
    await p.goto();

    // Rapidly click the button twice
    await Promise.all([
      p.clickSort(),
      p.clickSort()
    ]);

    // Wait for final sorted array
    await p.waitForValues([11, 12, 22, 25, 64], 15000);

    const final = await p.getValues();
    expect(final).toEqual([11, 12, 22, 25, 64]);

    // Observe collected page errors and console errors - test asserts none occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Observation: collect console messages and page errors throughout interactions', async ({ page }) => {
    // This test demonstrates observation of console messages and page errors across common flows.
    const p = new SelectionSortPage(page);
    await p.goto();

    // Perform an action to exercise the app
    await p.clickSort();

    // Wait for completion
    await p.waitForValues([11, 12, 22, 25, 64], 10000);

    // At this point, we assert that there were no uncaught runtime errors (ReferenceError, TypeError, SyntaxError)
    // The test must not patch or modify the page; it only observes and asserts.
    expect(pageErrors.length).toBe(0);

    // Also assert that console did not emit any error-level messages
    expect(consoleErrors.length).toBe(0);

    // For observability, ensure we captured some console output (could be zero if page doesn't log)
    // But we at least assert that the consoleMessages array exists and is an array
    expect(Array.isArray(consoleMessages)).toBe(true);
  });
});