import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b81550-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('Binary Search Visualization - 39b81550-d1d5-11f0-b49a-6f458b3a25ef', () => {
  // We will capture any console messages and page errors emitted by the page.
  // Tests will assert expected behavior and also assert that no runtime errors
  // (ReferenceError, SyntaxError, TypeError) or console errors occurred while
  // exercising the page.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect all console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Collect page errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push({
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test ensure there were no page errors that indicate broken runtime.
    // We specifically check for ReferenceError, SyntaxError, TypeError and any console errors.
    const pageErrorNames = pageErrors.map(e => e.name);
    const hasCriticalPageError = pageErrorNames.some(name =>
      ['ReferenceError', 'SyntaxError', 'TypeError'].includes(name)
    );

    const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error');

    // Assert that no critical runtime errors occurred during the test
    expect(hasCriticalPageError).toBeFalsy();

    // Assert that the console did not emit any error-level messages
    expect(consoleErrorMessages.length).toBe(0);
  });

  // Helper to get element locators
  const locators = page => {
    return {
      arrayInput: page.locator('#arrayInput'),
      targetInput: page.locator('#targetInput'),
      searchButton: page.locator('button:has-text("Search")'),
      result: page.locator('#result'),
      arrayList: page.locator('#arrayList'),
    };
  };

  test('Initial page load displays expected elements and default empty state', async ({ page }) => {
    // Verify that inputs, button and result container are visible on initial load
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await expect(arrayInput).toBeVisible();
    await expect(targetInput).toBeVisible();
    await expect(searchButton).toBeVisible();
    await expect(result).toBeVisible();
    await expect(arrayList).toBeVisible();

    // On initial load, result and arrayList should be empty strings
    await expect(result).toHaveText('');
    await expect(arrayList).toHaveText('');
  });

  test('Clicking Search with valid sorted array finds an existing item and displays correct index', async ({ page }) => {
    // This test enters a sorted array and a target that exists,
    // then verifies the displayed sorted array and result message.
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('1,2,3,4,5');
    await targetInput.fill('4');
    await searchButton.click();

    // After clicking, the sorted array should be displayed
    await expect(arrayList).toHaveText('Sorted Array: [1, 2, 3, 4, 5]');

    // Expect that target 4 is found at the correct index (zero-based index 3)
    await expect(result).toHaveText('4 found at index 3.');
  });

  test('Entering unsorted input sorts array before searching and returns correct index', async ({ page }) => {
    // Input is unsorted; the app sorts it before searching.
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('5,3,1,4');
    await targetInput.fill('4');
    await searchButton.click();

    // Sorted array should be displayed
    await expect(arrayList).toHaveText('Sorted Array: [1, 3, 4, 5]');

    // Expect target 4 to be found at index 2 in the sorted array
    await expect(result).toHaveText('4 found at index 2.');
  });

  test('Searching for a non-existing number displays "not found" message', async ({ page }) => {
    // If the target is not present, the result should indicate not found.
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('10,20,30,40');
    await targetInput.fill('25');
    await searchButton.click();

    await expect(arrayList).toHaveText('Sorted Array: [10, 20, 30, 40]');
    await expect(result).toHaveText('25 not found in the array.');
  });

  test('Handles duplicate values: returns an index of a matching duplicate', async ({ page }) => {
    // For duplicates, binary search can return any matching index; with this implementation,
    // it will return the mid-match (expected index 1 for [2,2,2,3])
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('2,2,2,3');
    await targetInput.fill('2');
    await searchButton.click();

    await expect(arrayList).toHaveText('Sorted Array: [2, 2, 2, 3]');
    // The implementation calculates mid as Math.floor((0+3)/2) === 1 so it should return index 1
    await expect(result).toHaveText('2 found at index 1.');
  });

  test('Edge case: empty array input leads to NaN behavior and displays NaN in array and result', async ({ page }) => {
    // If arrayInput is empty, the code will produce NaN elements; we assert the visible output
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    // Leave arrayInput empty (default)
    await arrayInput.fill('');
    // Leave target empty as well (parseInt('') -> NaN)
    await targetInput.fill('');
    await searchButton.click();

    // The app will display NaN as part of the sorted array and the result will reflect NaN not found
    await expect(arrayList).toHaveText('Sorted Array: [NaN]');
    await expect(result).toHaveText('NaN not found in the array.');
  });

  test('Non-numeric array entries produce NaN entries and not-found result for numeric target', async ({ page }) => {
    // Non-numeric strings are turned into NaN by Number() conversion
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('a,b,c');
    await targetInput.fill('1');
    await searchButton.click();

    await expect(arrayList).toHaveText('Sorted Array: [NaN, NaN, NaN]');
    await expect(result).toHaveText('1 not found in the array.');
  });

  test('Negative numbers and mixed sign values are sorted and searched correctly', async ({ page }) => {
    // Verify sorting with negative numbers and positive numbers combined
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('-2,10,0,3,-5');
    await targetInput.fill('0');
    await searchButton.click();

    // Sorted ascending order should be: [-5, -2, 0, 3, 10]
    await expect(arrayList).toHaveText('Sorted Array: [-5, -2, 0, 3, 10]');
    // 0 should be at index 2
    await expect(result).toHaveText('0 found at index 2.');
  });

  test('Button is enabled and accessible via keyboard activation', async ({ page }) => {
    // Ensure the button exists, is enabled, and can be focused and activated via keyboard (Enter)
    const { arrayInput, targetInput, searchButton, result } = locators(page);

    await arrayInput.fill('1,2,3');
    await targetInput.fill('2');

    await expect(searchButton).toBeEnabled();
    await searchButton.focus();

    // Press Enter to activate (simulate keyboard activation)
    await page.keyboard.press('Enter');

    // The result should be updated as if clicked
    await expect(result).toHaveText('2 found at index 1.');
  });

  test('Multiple sequential searches update array display and result consistently', async ({ page }) => {
    // Run two searches in a row with different inputs and verify the app updates each time
    const { arrayInput, targetInput, searchButton, result, arrayList } = locators(page);

    await arrayInput.fill('8,6,7');
    await targetInput.fill('6');
    await searchButton.click();

    await expect(arrayList).toHaveText('Sorted Array: [6, 7, 8]');
    await expect(result).toHaveText('6 found at index 0.');

    // Second search with different data
    await arrayInput.fill('100,50,75');
    await targetInput.fill('75');
    await searchButton.click();

    await expect(arrayList).toHaveText('Sorted Array: [50, 75, 100]');
    await expect(result).toHaveText('75 found at index 1.');
  });
});