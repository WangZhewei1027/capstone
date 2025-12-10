import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb30-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Linear Search Application - 11b7bb30-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // Arrays to collect runtime errors and console error messages observed during each test
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors for each test
    pageErrors = [];
    consoleErrors = [];

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application and wait until fully loaded
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure main elements are present before assertions
    await expect(page.locator('h1')).toHaveText('Linear Search');
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#search-button')).toBeVisible();
    await expect(page.locator('#output')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // If any unexpected runtime errors occurred during test, attach them to the test output by failing explicitly.
    // We assert presence/absence inside individual tests, but keep teardown available if needed.
    // No explicit teardown action required beyond Playwright's normal behavior.
  });

  test('Initial page load sets output to "Element not found in the array" when input is empty', async ({ page }) => {
    // Purpose: Verify default state after the page's inline script runs on load.
    const output = page.locator('#output');
    // The inline script reads the input value (empty) -> parseInt("") => NaN -> search never matches -> final message
    await expect(output).toHaveText('Element not found in the array');

    // There should be no uncaught page errors produced by the page on load
    expect(pageErrors.length).toBe(0);
    // There should be no console.error messages emitted
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking the Search button without entering a value does not change the output (no event handler attached)', async ({ page }) => {
    // Purpose: Confirm that the Search button has no effect because the implementation only runs on load.
    const output1 = page.locator('#output1');
    const initialText = await output.textContent();

    // Click the button
    await page.click('#search-button');

    // Expect no change to the output text (since there is no event listener attached in the provided code)
    await expect(output).toHaveText(initialText || '');

    // Also verify there were no page or console errors triggered by the click
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Manually invoke linearSearch from the page to find an existing element (value 5) and verify output', async ({ page }) => {
    // Purpose: The page defines linearSearch in global scope. We call it from test context to validate logic.
    // This does not modify page code; it simply invokes the existing function the page exposes.
    const output2 = page.locator('#output2');

    // Ensure initial known state
    await expect(output).toHaveText('Element not found in the array');

    // Invoke linearSearch with a target that exists: 5 (which is at index 4)
    await page.evaluate(() => {
      // Call the pre-defined function on the page; the application defines arr and linearSearch globally.
      // We pass our own args to avoid relying on page's internal target variable.
      linearSearch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    });

    // After invocation, the output should reflect finding the element at index 4
    await expect(output).toHaveText('Element found at index 4');

    // No page errors or console error messages should be produced from invoking the function
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Manually invoke linearSearch for first and last elements and for a non-existing element', async ({ page }) => {
    // Purpose: Validate edge cases of the search function by invoking it with targets at boundaries and a missing target.

    const output3 = page.locator('#output3');

    // Search for first element (1) -> index 0
    await page.evaluate(() => {
      linearSearch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1);
    });
    await expect(output).toHaveText('Element found at index 0');

    // Search for last element (10) -> index 9
    await page.evaluate(() => {
      linearSearch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10);
    });
    await expect(output).toHaveText('Element found at index 9');

    // Search for missing element (99) -> not found in array
    await page.evaluate(() => {
      linearSearch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 99);
    });
    await expect(output).toHaveText('Element not found in the array');

    // Ensure no uncaught errors happened during these invocations
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Typing a value into the input and pressing Enter does not trigger search (no form submission attached)', async ({ page }) => {
    // Purpose: Verify that keyboard submission does not perform a search because there is no form or handler.
    const input = page.locator('#search-input');
    const output4 = page.locator('#output4');

    // Type a known existing value into the input
    await input.fill('3');

    // Record the output before pressing Enter
    const before = await output.textContent();

    // Press Enter while focusing the input
    await input.press('Enter');

    // The output should remain unchanged because there is no code attached to handle input Enter
    await expect(output).toHaveText(before || '');

    // No new runtime errors or console errors should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Verify DOM elements remain visible and accessible for accessibility basics', async ({ page }) => {
    // Purpose: Basic accessibility checks - ensure input has placeholder and button has accessible name
    const input1 = page.locator('#search-input1');
    const button = page.locator('#search-button');

    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter a number to search...');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Search');

    // No runtime exceptions should be present
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Observe that the page script uses parseInt on empty input resulting in no match (behavioral confirmation)', async ({ page }) => {
    // Purpose: Confirm behavioral consequence of reading the input on load (empty -> parseInt -> NaN -> not found)
    const output5 = page.locator('#output5');
    // Confirm the expected end-state described by the provided implementation
    await expect(output).toHaveText('Element not found in the array');

    // There should be no runtime errors generated by this behavior itself
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});