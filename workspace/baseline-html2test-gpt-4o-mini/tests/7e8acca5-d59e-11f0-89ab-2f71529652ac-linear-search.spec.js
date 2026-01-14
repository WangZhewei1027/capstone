import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca5-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Linear Search Demonstration - end-to-end', () => {
  // Arrays to capture console and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Utility locators wrapped in a page object style to keep tests readable
  const app = {
    numberList: (page) => page.locator('#numberList'),
    searchNumber: (page) => page.locator('#searchNumber'),
    searchButton: (page) => page.locator('#searchButton'),
    result: (page) => page.locator('#result'),
  };

  // Before each test navigate to the page and attach listeners to capture console/page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages that indicate errors
    page.on('console', (msg) => {
      // capture only error-level console events for inspection
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Capture uncaught page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Load the application and wait for the main button to be ready
    await page.goto(APP_URL);
    await page.waitForSelector('#searchButton');
  });

  // After each test ensure no persistent listeners or leftover errors (best-effort)
  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid leaking across tests (Playwright pages are isolated per test by default,
    // but this keeps behavior explicit).
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  // Test initial page load state: inputs empty, result area empty/hidden
  test('Initial load shows empty inputs and no result text', async ({ page }) => {
    // Verify inputs are present and empty
    await expect(app.numberList(page)).toBeVisible();
    await expect(app.numberList(page)).toHaveValue('');
    await expect(app.searchNumber(page)).toBeVisible();
    await expect(app.searchNumber(page)).toHaveValue('');

    // Result container exists but should be empty at start
    await expect(app.result(page)).toBeVisible();
    await expect(app.result(page)).toHaveText('');

    // There should be no console errors or page errors on initial load
    expect(consoleErrors.length, 'No console.error() calls should occur during load').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors should occur during load').toBe(0);
  });

  // Test a successful search; verifies correct index and displayed message
  test('Searching for an existing number displays the correct index', async ({ page }) => {
    // Enter a list and search number
    await app.numberList(page).fill('10, 20, 30, 40, 50');
    await app.searchNumber(page).fill('30');
    await app.searchButton(page).click();

    // Expect the result to indicate found at index 2
    await expect(app.result(page)).toHaveText('Number 30 found at index: 2');

    // Verify no console or page errors occurred during the interaction
    expect(consoleErrors.length, 'No console.error() during successful search').toBe(0);
    expect(pageErrors.length, 'No uncaught errors during successful search').toBe(0);
  });

  // Test that duplicates return the first index (linear search behavior)
  test('When duplicates exist, the first occurrence index is returned', async ({ page }) => {
    await app.numberList(page).fill('5, 3, 5, 9, 5');
    await app.searchNumber(page).fill('5');
    await app.searchButton(page).click();

    // First 5 is at index 0
    await expect(app.result(page)).toHaveText('Number 5 found at index: 0');

    expect(consoleErrors.length, 'No console.error() during duplicate-value search').toBe(0);
    expect(pageErrors.length, 'No uncaught errors during duplicate-value search').toBe(0);
  });

  // Test a not-found scenario
  test('Searching for a number not in the list displays a not-found message', async ({ page }) => {
    await app.numberList(page).fill('1,2,3');
    await app.searchNumber(page).fill('4');
    await app.searchButton(page).click();

    await expect(app.result(page)).toHaveText('Number 4 not found in the list.');

    expect(consoleErrors.length, 'No console.error() during not-found search').toBe(0);
    expect(pageErrors.length, 'No uncaught errors during not-found search').toBe(0);
  });

  // Test trimming of whitespace in inputs
  test('Whitespace around numbers is trimmed and does not affect results', async ({ page }) => {
    await app.numberList(page).fill('  7 ,   8,9  ');
    await app.searchNumber(page).fill('  8  ');
    await app.searchButton(page).click();

    // 8 is second item => index 1
    await expect(app.result(page)).toHaveText('Number 8 found at index: 1');

    expect(consoleErrors.length, 'No console.error() during whitespace-trimming test').toBe(0);
    expect(pageErrors.length, 'No uncaught errors during whitespace-trimming test').toBe(0);
  });

  // Test negative numbers and zero handling
  test('Handles zero and negative numbers correctly', async ({ page }) => {
    await app.numberList(page).fill('0, -1, 2');
    await app.searchNumber(page).fill('-1');
    await app.searchButton(page).click();
    await expect(app.result(page)).toHaveText('Number -1 found at index: 1');

    // Now search for zero
    await app.searchNumber(page).fill('0');
    await app.searchButton(page).click();
    await expect(app.result(page)).toHaveText('Number 0 found at index: 0');

    expect(consoleErrors.length, 'No console.error() during negative/zero test').toBe(0);
    expect(pageErrors.length, 'No uncaught errors during negative/zero test').toBe(0);
  });

  // Test malformed input and empty inputs produce "not found" behavior (no exceptions)
  test('Malformed or empty inputs are handled without exceptions and result in not-found', async ({ page }) => {
    // Malformed entries: letters and empty items
    await app.numberList(page).fill('a, , foo');
    await app.searchNumber(page).fill('1');
    await app.searchButton(page).click();
    await expect(app.result(page)).toHaveText('Number 1 not found in the list.');

    // Completely empty inputs
    await app.numberList(page).fill('');
    await app.searchNumber(page).fill('');
    await app.searchButton(page).click();
    // Searching for empty -> parseInt('') is NaN, result should be not found
    await expect(app.result(page)).toHaveText('Number NaN not found in the list.');

    // Ensure no uncaught runtime errors occurred
    expect(consoleErrors.length, 'No console.error() during malformed/empty input test').toBe(0);
    expect(pageErrors.length, 'No uncaught errors during malformed/empty input test').toBe(0);
  });

  // Dedicated test that asserts there are no console.error or uncaught exceptions across typical interactions
  test('No console errors or uncaught exceptions occur during a sequence of interactions', async ({ page }) => {
    // Perform a variety of interactions
    await app.numberList(page).fill('100,200,300');
    await app.searchNumber(page).fill('200');
    await app.searchButton(page).click();
    await expect(app.result(page)).toHaveText('Number 200 found at index: 1');

    await app.numberList(page).fill('10,20');
    await app.searchNumber(page).fill('30');
    await app.searchButton(page).click();
    await expect(app.result(page)).toHaveText('Number 30 not found in the list.');

    // Final check that no console errors or uncaught page errors were observed
    expect(consoleErrors.length, 'There should be no console.error() messages during interactions').toBe(0);
    expect(pageErrors.length, 'There should be no uncaught page errors during interactions').toBe(0);
  });
});