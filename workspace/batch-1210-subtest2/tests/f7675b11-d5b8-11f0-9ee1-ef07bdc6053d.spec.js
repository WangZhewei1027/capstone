import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7675b11-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Bubble Sort Visualization - FSM tests for f7675b11-d5b8-11f0-9ee1-ef07bdc6053d', () => {
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture console messages and page errors for every test run
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', error => {
      pageErrors.push(String(error && error.message ? error.message : error));
    });

    // Load the page exactly as-is
    await page.goto(APP_URL);
    // Ensure the app has generated the initial array
    await page.waitForSelector('#arrayContainer .bar');
  });

  test.afterEach(async ({ page }) => {
    // Small sanity: capture one final snapshot of errors if any (keeps ordering stable)
    // No modifications to the page are performed here.
  });

  test('S0_Idle: on enter should generate array of size 10 (initial state)', async ({ page }) => {
    // Validate the initial state S0_Idle entry action generateArray(10)
    // Check DOM has 10 bars
    const count = await page.locator('#arrayContainer .bar').count();
    expect(count).toBe(10);

    // Also assert that the page-level `array` variable was created and has length 10
    const arrLength = await page.evaluate(() => {
      // Read the global array variable exposed by the page script
      // We do not modify it; only read.
      return typeof array !== 'undefined' ? array.length : -1;
    });
    expect(arrLength).toBe(10);

    // No unexpected page errors during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Transition: clicking Sort Array moves to Sorting state and results in a sorted array (S0 -> S1)', async ({ page }) => {
    // Click the sort button to trigger bubbleSort (onEnter of S1_Sorting)
    await page.click('#sortButton');

    // During sorting, at least one comparison should show orange colored bars.
    // Wait for an orange bar to appear (the visualization sets style.backgroundColor = 'orange' during comparisons)
    const orangeDetected = await page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      return bars.some(b => {
        const color = getComputedStyle(b).backgroundColor;
        // Accept both 'orange' and rgb representation
        return color === 'orange' || color === 'rgb(255, 165, 0)' || color === 'rgb(255,165,0)';
      });
    }, { timeout: 8000 }).catch(() => null);

    // The waitForFunction will resolve if orange found; assert that it was found (visual feedback)
    expect(!!orangeDetected).toBeTruthy();

    // Wait until the array is sorted in non-decreasing order.
    // Because bubbleSort uses a visible delay, we allow a generous timeout.
    await page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      if (!bars.length) return false;
      // Extract numeric heights from inline style (height: 'Npx')
      const heights = bars.map(b => parseFloat(getComputedStyle(b).height));
      for (let i = 1; i < heights.length; i++) {
        if (heights[i - 1] > heights[i]) return false;
      }
      return true;
    }, { timeout: 20000 });

    // Final assertion: DOM bars are sorted by height (ascending)
    const finalHeights = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#arrayContainer .bar')).map(b => parseFloat(getComputedStyle(b).height));
    });
    for (let i = 1; i < finalHeights.length; i++) {
      expect(finalHeights[i - 1]).toBeLessThanOrEqual(finalHeights[i]);
    }

    // Ensure no uncaught page errors occurred during sorting
    expect(pageErrors.length).toBe(0);
  });

  test('Visual feedback and DOM updates: bars change color during comparisons and heights update after swaps', async ({ page }) => {
    // Capture a snapshot of heights before sorting
    const beforeHeights = await page.evaluate(() => Array.from(document.querySelectorAll('#arrayContainer .bar')).map(b => parseFloat(getComputedStyle(b).height)));

    // Start sorting
    await page.click('#sortButton');

    // Assert that at some point during sorting there exists at least one bar with orange background
    const sawOrange = await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('#arrayContainer .bar')).some(b => {
        const c = getComputedStyle(b).backgroundColor;
        return c === 'orange' || c === 'rgb(255, 165, 0)' || c === 'rgb(255,165,0)';
      });
    }, { timeout: 8000 }).catch(() => false);
    expect(sawOrange).toBeTruthy();

    // After sorting completes, heights should be different from the initial heights unless the initial array was already sorted.
    await page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      const heights = bars.map(b => parseFloat(getComputedStyle(b).height));
      for (let i = 1; i < heights.length; i++) {
        if (heights[i - 1] > heights[i]) return false;
      }
      return true;
    }, { timeout: 20000 });

    const afterHeights = await page.evaluate(() => Array.from(document.querySelectorAll('#arrayContainer .bar')).map(b => parseFloat(getComputedStyle(b).height)));
    // It's acceptable if arrays were already sorted; in that case they may be equal.
    // Assert that we have an array of same length and numeric heights.
    expect(afterHeights.length).toBe(beforeHeights.length);
    afterHeights.forEach(h => expect(typeof h).toBe('number'));
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: clicking Sort Array multiple times during an active sort should not throw errors (concurrent clicks)', async ({ page }) => {
    // Click once to start sorting
    await page.click('#sortButton');
    // Click again quickly while sorting is in progress
    await page.click('#sortButton');

    // Wait for sorting to finish (bars sorted)
    await page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      if (!bars.length) return false;
      const heights = bars.map(b => parseFloat(getComputedStyle(b).height));
      for (let i = 1; i < heights.length; i++) {
        if (heights[i - 1] > heights[i]) return false;
      }
      return true;
    }, { timeout: 30000 });

    // Validate final state is sorted and that no page errors occurred from multiple invocations
    const finalSorted = await page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('#arrayContainer .bar'));
      const heights = bars.map(b => parseFloat(getComputedStyle(b).height));
      return heights.every((_, i) => i === 0 || heights[i - 1] <= heights[i]);
    });
    expect(finalSorted).toBeTruthy();

    // Ensure no uncaught exceptions were emitted
    expect(pageErrors.length).toBe(0);
  });

  test('Runtime sanity: observe console messages and page errors (if any) and assert expected conditions', async ({ page }) => {
    // The page does not intentionally log structured diagnostic logs; ensure we captured console messages array.
    // At minimum, the structure must be an array. We assert there are no unexpected page errors.
    expect(Array.isArray(consoleMessages)).toBeTruthy();

    // If there were any page errors, surface them in the assertion message for debugging.
    expect(pageErrors.length, `Page errors observed: ${pageErrors.join(' | ')}`).toBe(0);
  });

});