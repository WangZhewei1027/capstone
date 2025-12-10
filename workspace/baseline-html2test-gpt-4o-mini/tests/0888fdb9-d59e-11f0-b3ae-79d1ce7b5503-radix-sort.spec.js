import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb9-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Radix Sort Visualization - 0888fdb9-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to capture console / page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console "error" messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', error => {
      // serialize to string to make assertions easier
      pageErrors.push(String(error));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Ensure the app had a brief moment to initialize
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    // After each test we won't automatically fail here; individual tests will assert expectations
  });

  // Helper to read numeric heights of bars from the DOM
  async function getBarHeights(page) {
    // Each bar's inline style is like "NNpx", parseFloat will extract numeric value
    return await page.$$eval('#array .bar', bars => bars.map(b => parseFloat(b.style.height || window.getComputedStyle(b).height || '0')));
  }

  test('Initial load: renders an array of 10 bars with visible heights', async ({ page }) => {
    // Purpose: verify initial state after page load - default random array is generated and rendered
    // Check the header text exists and button is visible
    const title = await page.textContent('h1');
    expect(title).toContain('Radix Sort Visualization');

    const button = page.locator('button', { hasText: 'Sort Random Array' });
    await expect(button).toBeVisible();

    // The implementation calls generateRandomArray() on initialization with default size 10
    const bars = await page.$$('#array .bar');
    expect(bars.length).toBeGreaterThanOrEqual(1); // at least one bar should exist
    // Expect it to be 10 according to implementation; use >=1 for a bit of resilience, but we assert exactly 10 below
    expect(bars.length).toBe(10);

    // Ensure every bar has a numeric, positive height
    const heights = await getBarHeights(page);
    for (const h of heights) {
      expect(typeof h).toBe('number');
      expect(h).toBeGreaterThanOrEqual(0);
    }

    // Ensure there are no immediate console or page errors on load
    expect(consoleErrors.length, `Console errors on load: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors on load: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Clicking "Sort Random Array" results in a sorted (non-decreasing) visualization', async ({ page }) => {
    // Purpose: simulate user clicking the Sort button and verify the visual representation becomes sorted
    // Capture initial heights
    const initialHeights = await getBarHeights(page);
    expect(initialHeights.length).toBe(10);

    // Click the sort button
    await page.click('button', { timeout: 5000 });

    // Implementation waits 1 second before performing the synchronous radixSort.
    // Wait a bit longer to ensure sorting has completed and renderArray calls finished.
    await page.waitForTimeout(2200);

    // Read heights after sorting
    const afterHeights = await getBarHeights(page);
    expect(afterHeights.length).toBe(10);

    // Verify that the heights are in non-decreasing order (sorted ascending)
    for (let i = 0; i < afterHeights.length - 1; i++) {
      expect(afterHeights[i] <= afterHeights[i + 1], `Heights not sorted: ${afterHeights}`).toBeTruthy();
    }

    // Also verify that the DOM has been updated (it may or may not differ from initial due to randomness)
    // At minimum, ensure that style.height is present for all bars
    for (const h of afterHeights) {
      expect(typeof h).toBe('number');
    }

    // Assert no runtime page errors occurred during the sort process
    expect(consoleErrors.length, `Console errors during sort: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during sort: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Programmatic array assignment and sorting via page functions produces correct DOM updates', async ({ page }) => {
    // Purpose: set a known array in the page, call radixSort, and assert the resulting array and DOM are sorted.
    // We use page.evaluate to interact with page-defined globals (array, renderArray, radixSort).
    const inputArray = [34, 2, 78, 5, 66, 1];

    // Set the array and render it
    await page.evaluate((arr) => {
      // Set the global array variable to the test array and call renderArray
      // This relies on the page defining `array` and `renderArray` as in the provided implementation
      array = arr.slice(); // copy
      renderArray();
    }, inputArray);

    // Verify DOM now reflects the provided numbers (via heights)
    const heightsBefore = await getBarHeights(page);
    expect(heightsBefore.length).toBe(inputArray.length);
    // Heights should correspond to num * 2 (per implementation)
    const expectedHeightsBefore = inputArray.map(n => n * 2);
    expect(heightsBefore).toEqual(expectedHeightsBefore);

    // Call radixSort on the page to sort the global array
    const sortedArray = await page.evaluate(() => {
      // radixSort mutates the global array and calls renderArray after each pass
      radixSort(array);
      return array.slice(); // return a copy of the sorted array
    });

    // Ensure the returned array is sorted ascending
    for (let i = 0; i < sortedArray.length - 1; i++) {
      expect(sortedArray[i] <= sortedArray[i + 1], `Array not sorted: ${sortedArray}`).toBeTruthy();
    }

    // Now read the DOM heights and ensure they're sorted accordingly
    const heightsAfter = await getBarHeights(page);
    const numericValuesFromHeights = heightsAfter.map(h => Math.round(h / 2)); // convert back to original numbers
    for (let i = 0; i < numericValuesFromHeights.length - 1; i++) {
      expect(numericValuesFromHeights[i] <= numericValuesFromHeights[i + 1], `DOM not sorted: ${numericValuesFromHeights}`).toBeTruthy();
    }

    // Check that the observed sorted array matches the DOM-derived values
    expect(numericValuesFromHeights).toEqual(sortedArray);

    // Confirm there were no console/page errors during programmatic operations
    expect(consoleErrors.length, `Console errors during programmatic sort: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during programmatic sort: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Accessibility and visual attributes: bars have expected class and styling', async ({ page }) => {
    // Purpose: verify that bars use the expected class and visual styles that the app sets.
    const bars1 = await page.$$('#array .bar');
    expect(bars.length).toBeGreaterThan(0);

    // Each bar should have class "bar" and a non-empty inline height style
    for (const barHandle of bars) {
      const className = await barHandle.getAttribute('class');
      expect(className).toContain('bar');

      const inlineHeight = await barHandle.evaluate(node => node.style.height);
      // style.height may be empty if computed style used, but in this app renderArray sets inline style
      expect(inlineHeight).toBeTruthy();
    }

    // Check computed background color equals "teal" as defined in CSS (note: browsers expose computed color differently)
    const bgColor = await page.$eval('.bar', el => getComputedStyle(el).backgroundColor);
    // Accept either 'teal' computed rgb representation or a browser-specific format
    expect(bgColor).toBeTruthy();
    // We don't assert exact color string to avoid cross-browser differences, but ensure it's not transparent
    expect(bgColor.toLowerCase()).not.toBe('rgba(0, 0, 0, 0)');

    // Confirm no runtime errors related to styling/accessibility
    expect(consoleErrors.length, `Console errors during visual checks: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors during visual checks: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('No unexpected ReferenceError / SyntaxError / TypeError occurred during session', async ({ page }) => {
    // Purpose: explicitly assert that the page did not produce common runtime error types.
    // We inspect the collected pageErrors and consoleErrors to ensure they don't mention these error types.
    // If any such errors occurred they would have been captured by listeners in beforeEach.

    // First, basic assertion that there are zero page-level uncaught exceptions
    expect(pageErrors.length, `Uncaught page errors: ${pageErrors.join(' | ')}`).toBe(0);

    // Next, ensure console errors do not contain common error keywords
    const joinedConsoleErrors = consoleErrors.join(' | ');
    expect(joinedConsoleErrors.includes('ReferenceError')).toBeFalsy();
    expect(joinedConsoleErrors.includes('SyntaxError')).toBeFalsy();
    expect(joinedConsoleErrors.includes('TypeError')).toBeFalsy();

    // Final safety: assert total console error count is zero
    expect(consoleErrors.length, `Console errors captured: ${consoleErrors.join(' | ')}`).toBe(0);
  });
});