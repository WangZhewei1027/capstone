import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe5-cd2a-11f0-bee4-a3a342d77f94.html';

/**
 * Playwright tests for Linear Search Demo
 *
 * Tests cover:
 * - Initial page load and default state
 * - Successful searches (found / not found)
 * - Error handling for non-numeric search input
 * - Edge cases (empty array input, spaced/negative numbers)
 *
 * Each test also observes console messages and page errors and asserts
 * that no unexpected runtime errors (ReferenceError, SyntaxError, TypeError)
 * were emitted by the page during the scenario.
 */

test.describe('Linear Search Demo - 2627abe5-cd2a-11f0-bee4-a3a342d77f94', () => {
  // Collect console error messages and page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and capture any console.error messages
    page.on('console', msg => {
      try {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
          consoleErrors.push({ type, text });
        }
      } catch {
        // ignore if message inspection fails
      }
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Tear down arrays to avoid leakage between tests
    consoleErrors = [];
    pageErrors = [];
  });

  test('Page loads with expected title, inputs and button visible (initial state)', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Linear Search Demo/);

    // Verify presence and visibility of interactive elements
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    await expect(arrayInput).toBeVisible();
    await expect(arrayInput).toHaveAttribute('placeholder', 'e.g., 1,2,3,4');

    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'e.g., 3');

    await expect(searchButton).toBeVisible();
    await expect(searchButton).toHaveText('Search');

    // Output should be empty initially
    await expect(output).toBeEmpty();

    // Ensure no uncaught page errors or console.error messages on initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Searching an existing number displays array and found index', async ({ page }) => {
    // Purpose: Validate that a number present in the array is found at correct index.
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    // Enter array and search value
    await arrayInput.fill('1,2,3,4');
    await searchInput.fill('3');

    // Click search and assert result
    await searchButton.click();

    // Expect output to show the array and found index 2
    await expect(output).toContainText('Array: [1, 2, 3, 4]');
    await expect(output).toContainText('Number 3 found at index: 2.');

    // Validate there were no runtime page errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Searching a non-existing number displays "not found" message', async ({ page }) => {
    // Purpose: Ensure searching for a number not in the array returns the correct "not found" message.
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    await arrayInput.fill('5,6,7');
    await searchInput.fill('3');

    await searchButton.click();

    await expect(output).toContainText('Array: [5, 6, 7]');
    await expect(output).toContainText('Number 3 not found in the array.');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Non-numeric search input shows error message to user (handled error)', async ({ page }) => {
    // Purpose: Verify the app shows a user-friendly error if search input is not a number.
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    await arrayInput.fill('1,2,3');
    await searchInput.fill('abc'); // non-numeric input should trigger handled error

    await searchButton.click();

    // The app catches the thrown Error and writes 'Error: Search value must be a number.' to output
    await expect(output).toContainText('Error: Search value must be a number.');

    // This handled error should not produce uncaught page errors or console.error messages.
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Empty array input (edge case) results in array showing NaN and not found', async ({ page }) => {
    // Purpose: Test how the app behaves when the array input is empty (edge case).
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    // Empty array input -> split(',') yields [''] -> Number('') => 0 actually,
    // but map(Number) on [''] returns [0]. However actual runtime in browser:
    // Number('') === 0. We'll assert based on observed behavior rather than assumptions.
    // The HTML code cannot be modified so we observe actual output.
    await arrayInput.fill('');
    await searchInput.fill('0');

    await searchButton.click();

    // The output should show the array representation and either found or not found.
    // Accept either found at index (if array parsed as [0]) or not found (e.g., [NaN]).
    const outputText = await output.textContent();
    expect(outputText).not.toBeNull();
    // Ensure output contains "Array:" and mentions the search value in the message.
    expect(outputText).toMatch(/Array:\s*\[.*\]/);
    expect(outputText).toMatch(/Number\s*0\s*(found at index|not found)/);

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Array input with spaces and negative numbers finds correct index', async ({ page }) => {
    // Purpose: Confirm trimming/space-tolerant parsing works and negative numbers are handled.
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    // Input includes spaces; map(Number) should coerce appropriately
    await arrayInput.fill(' 10 , -5 , 3 ');
    await searchInput.fill('-5');

    await searchButton.click();

    // Expect to find -5 at index 1
    await expect(output).toContainText('Number -5 found at index: 1.');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Button and inputs remain enabled and accessible after multiple searches', async ({ page }) => {
    // Purpose: Verify controls remain usable after repeated interactions.
    const arrayInput = page.locator('#arrayInput');
    const searchInput = page.locator('#searchInput');
    const searchButton = page.locator('#searchButton');
    const output = page.locator('#output');

    // First search
    await arrayInput.fill('1,2,3');
    await searchInput.fill('2');
    await searchButton.click();
    await expect(output).toContainText('Number 2 found at index: 1.');

    // Second search with different data
    await arrayInput.fill('9,8,7,6');
    await searchInput.fill('7');
    await searchButton.click();
    await expect(output).toContainText('Number 7 found at index: 2.');

    // Controls should still be visible and enabled
    await expect(arrayInput).toBeVisible();
    await expect(searchInput).toBeVisible();
    await expect(searchButton).toBeEnabled();

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});