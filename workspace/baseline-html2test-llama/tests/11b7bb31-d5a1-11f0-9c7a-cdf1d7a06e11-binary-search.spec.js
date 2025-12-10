import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb31-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Binary Search App - 11b7bb31-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // Shared variables to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Collect uncaught page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test assert there were no uncaught page errors (unless a test specifically expects them)
    expect(pageErrors.length).toBe(0);
  });

  test('Initial load: input, button visible and result area is empty', async ({ page }) => {
    // Verify the input, button and result container exist and have the expected initial state
    const input = page.locator('#search-input');
    const button = page.locator('#search-btn');
    const result = page.locator('#result');

    await expect(input).toBeVisible();
    await expect(input).toHaveValue(''); // initially empty
    await expect(button).toBeVisible();
    await expect(result).toBeVisible();
    await expect(result).toHaveText(''); // result should be empty initially

    // Ensure no runtime page errors or console errors were recorded on initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Search without entering a value shows message using event target value (reveals bug)', async ({ page }) => {
    // This test demonstrates the observed bug: the click handler reads e.target.value (button) instead of input.value,
    // so it reports "undefined" rather than the input value.
    const button1 = page.locator('#search-btn');
    const result1 = page.locator('#result1');

    // Click the search button without typing anything in the input
    await button.click();

    // The implementation uses e.target.value from the click event; for the button this is undefined.
    // Expect the result to reflect "Number undefined is not found in the array"
    await expect(result).toHaveText('Number undefined is not found in the array');

    // Confirm there were no uncaught page errors as a result of this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Entering "5" in input and clicking Search - input value is ignored due to handler bug', async ({ page }) => {
    // Fill the input with a valid target that exists in the array and click search.
    // Because the click handler reads the event target's value (the button), it will not use the input's value,
    // demonstrating the application's bug.
    const input1 = page.locator('#search-input1');
    const button2 = page.locator('#search-btn');
    const result2 = page.locator('#result2');

    await input.fill('5');
    // Sanity check input contains '5'
    await expect(input).toHaveValue('5');

    await button.click();

    // Expectation: result will show "Number undefined is not found in the array" (input was ignored)
    await expect(result).toHaveText('Number undefined is not found in the array');

    // Still ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Underlying binarySearch function works correctly when invoked directly', async ({ page }) => {
    // The UI handler is buggy, but the binarySearch function in the script is defined correctly.
    // Call it directly via page.evaluate and assert expected boolean results.
    const foundFive = await page.evaluate(() => {
      // access the global binarySearch function from the page
      return window.binarySearch([1,2,3,4,5,6,7,8,9,10], 5);
    });
    expect(foundFive).toBe(true);

    const notFoundEleven = await page.evaluate(() => {
      return window.binarySearch([1,2,3,4,5,6,7,8,9,10], 11);
    });
    expect(notFoundEleven).toBe(false);
  });

  test('Pressing Enter in the input does not trigger a search (no form submit)', async ({ page }) => {
    // Because there is no form submit handler, pressing Enter in the input should not trigger the search behavior.
    const input2 = page.locator('#search-input2');
    const result3 = page.locator('#result3');

    // Ensure result starts empty
    await expect(result).toHaveText('');

    // Type a value and press Enter
    await input.fill('3');
    await input.press('Enter');

    // Expect result remains unchanged (empty) because Enter does not trigger the button click handler
    await expect(result).toHaveText('');

    // Confirm no page errors were thrown
    expect(pageErrors.length).toBe(0);
  });

  test('Non-numeric input behavior: UI still shows undefined due to bug; binarySearch handles numbers when called directly', async ({ page }) => {
    // Fill with a non-numeric value and click the button.
    // Because of the bug (reading button.value), the displayed message will still show undefined.
    const input3 = page.locator('#search-input3');
    const button3 = page.locator('#search-btn');
    const result4 = page.locator('#result4');

    await input.fill('abc');
    await expect(input).toHaveValue('abc');

    await button.click();

    // The displayed result is expected to reference "undefined" (bug) instead of "abc"
    await expect(result).toHaveText('Number undefined is not found in the array');

    // For contrast, if you parse a non-numeric string in JS you get NaN; ensure binarySearch called directly with NaN returns false
    const binaryResultForNaN = await page.evaluate(() => {
      return window.binarySearch([1,2,3,4,5,6,7,8,9,10], parseInt('abc'));
    });
    expect(binaryResultForNaN).toBe(false);

    // Confirm no uncaught page errors from this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Observe console output and ensure no unexpected console.error messages', async ({ page }) => {
    // This test collects console messages and asserts there were no console errors emitted during page interactions.
    const input4 = page.locator('#search-input4');
    const button4 = page.locator('#search-btn');

    // Interact a bit
    await input.fill('7');
    await button.click();

    // Filter any console messages that are error severity
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');

    // Assert that there are no console.error messages (the page should not throw JS errors)
    expect(consoleErrors.length).toBe(0);

    // Also assert there are some non-error console messages or none; we don't require any
    // but ensure our collectors ran (consoleMessages is an array)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });
});