import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f493-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Bubble Sort Visualization - 1da0f493-cd2f-11f0-a440-159d7b77af86', () => {
  // Hold console and page errors captured during the test run for assertions
  let consoleErrors;
  let pageErrors;

  // Helper: get numeric values displayed in the bars
  const getBarValues = async (page) => {
    return page.evaluate(() => {
      return Array.from(document.getElementsByClassName('bar')).map(b => parseInt(b.innerText, 10));
    });
  };

  // Helper: get count of bars with class 'sorted'
  const getSortedCount = async (page) => {
    return page.evaluate(() => {
      return Array.from(document.getElementsByClassName('bar')).filter(b => b.classList.contains('sorted')).length;
    });
  };

  // Helper: check if any bar has the comparison (red) background color applied
  const anyBarIsRed = async (page) => {
    return page.evaluate(() => {
      const bars = Array.from(document.getElementsByClassName('bar'));
      return bars.some(b => {
        // computed style to translate hex to rgb if necessary
        const color = window.getComputedStyle(b).backgroundColor;
        return color === 'rgb(231, 76, 60)' || color === '#e74c3c';
      });
    });
  };

  // Set up a fresh page and capture console and page errors for every test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // capture only console errors for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location ? msg.location() : null });
      }
    });

    page.on('pageerror', (err) => {
      // capture uncaught exceptions from the page
      pageErrors.push(err.message);
    });

    await page.goto(APP_URL);
    // Ensure the page has time to run the inline generateArray on load
    await page.waitForSelector('#arrayContainer .bar');
  });

  test.afterEach(async () => {
    // After each test we expect there were no console errors or uncaught page errors.
    // This ensures the page loaded and ran without runtime errors (ReferenceError, SyntaxError, TypeError, etc.)
    expect(consoleErrors, `Console error(s) were logged: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Page error(s) were emitted: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Initial load: page shows 10 bars and control buttons are visible and enabled', async ({ page }) => {
    // Purpose: Verify the initial default state on page load
    const bars = page.locator('#arrayContainer .bar');
    await expect(bars).toHaveCount(10);

    // Each bar should display a numeric value and have a height in px
    const values = await getBarValues(page);
    expect(values.length).toBe(10);
    for (const v of values) {
      expect(Number.isInteger(v)).toBeTruthy();
      expect(v).toBeGreaterThanOrEqual(10); // generateArray uses 10..109
    }

    // Buttons: Generate New Array and Start Bubble Sort must be visible and enabled
    const generateButton = page.getByRole('button', { name: 'Generate New Array' });
    const startButton = page.getByRole('button', { name: 'Start Bubble Sort' });
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('Generate New Array: clicking button regenerates bars (count remains 10, values numeric)', async ({ page }) => {
    // Purpose: Ensure the Generate New Array control recreates the array in the DOM
    const getInnerHTML = async () => page.evaluate(() => document.getElementById('arrayContainer').innerHTML);

    const beforeHTML = await getInnerHTML();
    const beforeValues = await getBarValues(page);

    // Click the generate button to produce a new array
    await page.getByRole('button', { name: 'Generate New Array' }).click();

    // Wait for the DOM to be updated (the implementation clears and re-adds elements synchronously)
    await page.waitForSelector('#arrayContainer .bar');

    const afterHTML = await getInnerHTML();
    const afterValues = await getBarValues(page);

    // There should still be 10 bars
    expect(afterValues.length).toBe(10);

    // Values should be numeric and in the expected range
    for (const v of afterValues) {
      expect(Number.isInteger(v)).toBeTruthy();
      expect(v).toBeGreaterThanOrEqual(10);
    }

    // It's highly likely the innerHTML changed; assert that regeneration produced a DOM change or changed values.
    // This avoids flakiness in the extremely rare case the random array is identical.
    const htmlChanged = beforeHTML !== afterHTML;
    const valuesChanged = JSON.stringify(beforeValues) !== JSON.stringify(afterValues);
    expect(htmlChanged || valuesChanged).toBeTruthy();
  });

  test('Bubble Sort process: bars are compared (turn red) during sort and final array is sorted ascending', async ({ page }) => {
    // Purpose: Validate dynamic behavior during sorting and final sorted state

    // Click Start Bubble Sort to begin the visualization
    await page.getByRole('button', { name: 'Start Bubble Sort' }).click();

    // While the sort is running, at least once a bar should be highlighted red for comparison.
    // Wait up to 2000ms for a comparison highlight to appear.
    await page.waitForFunction(anyBarIsRed, {}, { timeout: 2000 });

    // Now wait for the sorting to complete:
    // Implementation adds 'sorted' class to bars[bars.length - i - 1] on each outer loop iteration.
    // For array length 10, after completion, 9 bars should have the 'sorted' class.
    await page.waitForFunction(getSortedCount, {}, { timeout: 20000, polling: 200 })
      .then(async (res) => {
        // the waitForFunction resolves with a JSHandle, use getSortedCount directly below for final assertion
      })
      .catch(() => {
        // If timeout occurs, allow the subsequent assertions to produce informative failures
      });

    const sortedCount = await getSortedCount(page);
    expect(sortedCount).toBe(9);

    // Verify the numeric values in the bars are in non-decreasing (ascending) order after the sort
    const finalValues = await getBarValues(page);
    for (let i = 0; i < finalValues.length - 1; i++) {
      expect(finalValues[i]).toBeLessThanOrEqual(finalValues[i + 1]);
    }
  }, 30000); // extend timeout for potentially long-running sort

  test('Restart sorting on already-sorted array: clicking Start again does not error and keeps array sorted', async ({ page }) => {
    // Purpose: Ensure running the sort on a sorted array does not cause runtime errors and preserves order

    // First, run the sort to completion
    await page.getByRole('button', { name: 'Start Bubble Sort' }).click();
    await page.waitForFunction(getSortedCount, {}, { timeout: 20000, polling: 200 });

    // Confirm sorted
    let values = await getBarValues(page);
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i + 1]);
    }

    // Click Start Bubble Sort again to ensure it handles already-sorted input gracefully
    await page.getByRole('button', { name: 'Start Bubble Sort' }).click();

    // Give it a short moment to run; there should be no console or page errors (checked in afterEach)
    await page.waitForTimeout(500);

    // Confirm still sorted after re-running
    values = await getBarValues(page);
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i + 1]);
    }
  }, 20000);
});