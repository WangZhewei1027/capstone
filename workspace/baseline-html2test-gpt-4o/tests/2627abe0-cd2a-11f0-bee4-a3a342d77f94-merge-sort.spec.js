import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe0-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Merge Sort Visualization - End-to-End', () => {
  // Arrays to collect console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors before each test
    consoleErrors = [];
    pageErrors = [];

    // Listen for console events and capture error-level messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // No explicit teardown required; listeners are tied to page fixture lifecycle.
  });

  test('Initial load - page structure and default state are correct', async ({ page }) => {
    // Verify the page title contains "Merge Sort Visualization"
    await expect(page).toHaveTitle(/Merge Sort Visualization/);

    // Ensure the heading is visible and has expected text
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Merge Sort Visualization');

    // Identify the Start button and check its accessibility and visibility
    const startButton = page.getByRole('button', { name: 'Start Merge Sort' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    // Verify that the array display elements exist and are empty by default
    const originalArray = page.locator('#originalArray');
    const sortedArray = page.locator('#sortedArray');
    await expect(originalArray).toBeVisible();
    await expect(sortedArray).toBeVisible();

    // On initial load these should be empty strings (no content)
    await expect(originalArray).toHaveText('');
    await expect(sortedArray).toHaveText('');

    // Assert that there were no runtime console errors or uncaught page errors at startup
    expect(consoleErrors.length, `Expected no console.error messages on load, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors on load, found: ${pageErrors.length}`).toBe(0);
  });

  test('Clicking Start Merge Sort populates original and sorted arrays correctly', async ({ page }) => {
    // Click the Start Merge Sort button to trigger sorting
    const startButton = page.getByRole('button', { name: 'Start Merge Sort' });
    await startButton.click();

    // The original array should show the predefined array
    const originalArray = page.locator('#originalArray');
    await expect(originalArray).toHaveText('Original Array: [38, 27, 43, 3, 9, 82, 10]');

    // The sorted array should show the correctly sorted result
    const sortedArray = page.locator('#sortedArray');
    await expect(sortedArray).toHaveText('Sorted Array: [3, 9, 10, 27, 38, 43, 82]');

    // Verify that the content is visible and updated on the page
    await expect(originalArray).toBeVisible();
    await expect(sortedArray).toBeVisible();

    // Ensure no console errors or uncaught exceptions happened during the interaction
    expect(consoleErrors.length, `Expected no console.error messages after clicking start, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors after clicking start, found: ${pageErrors.length}`).toBe(0);
  });

  test('Multiple clicks produce consistent results and do not duplicate or change output', async ({ page }) => {
    const startButton = page.getByRole('button', { name: 'Start Merge Sort' });
    const originalArray = page.locator('#originalArray');
    const sortedArray = page.locator('#sortedArray');

    // Click the button multiple times
    await startButton.click();
    await expect(sortedArray).toHaveText('Sorted Array: [3, 9, 10, 27, 38, 43, 82]');

    await startButton.click();
    await expect(sortedArray).toHaveText('Sorted Array: [3, 9, 10, 27, 38, 43, 82]');

    await startButton.click();
    await expect(sortedArray).toHaveText('Sorted Array: [3, 9, 10, 27, 38, 43, 82]');

    // Original array should remain the same as well
    await expect(originalArray).toHaveText('Original Array: [38, 27, 43, 3, 9, 82, 10]');

    // Again ensure no console errors or page errors across repeated interactions
    expect(consoleErrors.length, `Expected no console.error messages after repeated clicks, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors after repeated clicks, found: ${pageErrors.length}`).toBe(0);
  });

  test('Programmatic use of global mergeSort function returns correct results (page script integration)', async ({ page }) => {
    // Call the page-exposed mergeSort function with a custom array via page.evaluate
    // This verifies the exported functions work as implemented in the page context
    const result = await page.evaluate(() => {
      // Access the global mergeSort function defined by the page script
      // This returns the sorted array for the provided input
      // No modifications of page code are performed; we only call the function
      // Note: If mergeSort were not defined, this would throw and be captured by pageErrors
      return mergeSort([5, 2, 9, 1, 5, 6]);
    });

    // The expected sorted result for the input
    expect(result).toEqual([1, 2, 5, 5, 6, 9]);

    // Ensure page did not emit runtime errors when invoking the function
    expect(consoleErrors.length, `Expected no console.error messages when calling mergeSort, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors when calling mergeSort, found: ${pageErrors.length}`).toBe(0);
  });

  test('Accessibility: Start button is keyboard-focusable and clickable via keyboard', async ({ page }) => {
    const startButton = page.getByRole('button', { name: 'Start Merge Sort' });
    const sortedArray = page.locator('#sortedArray');

    // Focus the button and press Enter to activate
    await startButton.focus();
    await page.keyboard.press('Enter');

    // Confirm the sorted array is displayed after keyboard activation
    await expect(sortedArray).toHaveText('Sorted Array: [3, 9, 10, 27, 38, 43, 82]');

    // Ensure no console errors or page errors occurred
    expect(consoleErrors.length, `Expected no console.error messages after keyboard activation, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors after keyboard activation, found: ${pageErrors.length}`).toBe(0);
  });

  test('No unexpected ReferenceError/TypeError/SyntaxError in console or page errors', async ({ page }) => {
    // This test explicitly inspects captured console and page errors for specific JS error types
    // We intentionally check that none of the captured errors' messages include these error type names.

    // Build a combined list of textual messages from both collectors
    const combinedMessages = [
      ...consoleErrors.map(e => e.text),
      ...pageErrors.map(e => (e && e.message) ? e.message : String(e))
    ].join('\n');

    // Assert that none of the critical JavaScript error types appear in the messages
    expect(combinedMessages.includes('ReferenceError')).toBe(false);
    expect(combinedMessages.includes('TypeError')).toBe(false);
    expect(combinedMessages.includes('SyntaxError')).toBe(false);

    // Additionally assert that there were no console.error messages and no page errors at all
    expect(consoleErrors.length, `Expected zero console.error messages, found: ${consoleErrors.length} -- ${combinedMessages}`).toBe(0);
    expect(pageErrors.length, `Expected zero uncaught page errors, found: ${pageErrors.length} -- ${combinedMessages}`).toBe(0);
  });

  test('Edge case: calling mergeSort with empty or single-element arrays returns them unchanged', async ({ page }) => {
    // Call mergeSort with empty array and single-element array from the page context
    const results = await page.evaluate(() => {
      const a = mergeSort([]);
      const b = mergeSort([42]);
      return { a, b };
    });

    // Expect unchanged results
    expect(results.a).toEqual([]);
    expect(results.b).toEqual([42]);

    // Ensure no runtime errors produced
    expect(consoleErrors.length, `Expected no console.error messages for edge-case calls, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors for edge-case calls, found: ${pageErrors.length}`).toBe(0);
  });
});