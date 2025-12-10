import { test, expect } from '@playwright/test';

test.describe('Union-Find (Disjoint Set) Demonstration - 39b75203-d1d5-11f0-b49a-6f458b3a25ef', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b75203-d1d5-11f0-b49a-6f458b3a25ef.html';

  // Reusable locators via a simple page object pattern
  const pageObjects = {
    numElements: (page) => page.locator('#numElements'),
    initializeBtn: (page) => page.locator('#initialize'),
    pairInput: (page) => page.locator('#pairInput'),
    unionBtn: (page) => page.locator('#unionBtn'),
    findBtn: (page) => page.locator('#findBtn'),
    findInput: (page) => page.locator('#findInput'),
    result: (page) => page.locator('#result'),
  };

  // Navigate to the application before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Test: initial page load and default state
  test('Initial page load shows all controls and empty result', async ({ page }) => {
    // Verify page title and that interactive elements are visible
    await expect(page).toHaveTitle(/Union-Find/i);
    await expect(pageObjects.numElements(page)).toBeVisible();
    await expect(pageObjects.initializeBtn(page)).toBeVisible();
    await expect(pageObjects.pairInput(page)).toBeVisible();
    await expect(pageObjects.unionBtn(page)).toBeVisible();
    await expect(pageObjects.findBtn(page)).toBeVisible();
    await expect(pageObjects.findInput(page)).toBeVisible();

    // The result div should be present and initially empty
    await expect(pageObjects.result(page)).toBeVisible();
    await expect(pageObjects.result(page)).toHaveText('');
  });

  // Test: clicking union before initialization should produce a runtime error (uf is undefined)
  test('Clicking Union before Initialize emits a page error (uninitialized uf)', async ({ page }) => {
    // Wait for a pageerror event triggered by clicking union without initialization
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      pageObjects.unionBtn(page).click()
    ]);

    // The application code accesses uf.parent when uf is undefined, so assert error message indicates reading properties of undefined
    expect(error).toBeTruthy();
    expect(error.message).toMatch(/Cannot read properties of undefined|Cannot read property|reading 'length'|Cannot read/i);

    // Ensure that the UI result did not suddenly show a successful union message
    await expect(pageObjects.result(page)).toHaveText(''); // should remain unchanged
  });

  // Test: clicking Find before initialization should produce a runtime error (uninitialized uf)
  test('Clicking Find before Initialize emits a page error (uninitialized uf)', async ({ page }) => {
    // Enter an element to find, but do not initialize uf
    await pageObjects.findInput(page).fill('0');

    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      pageObjects.findBtn(page).click()
    ]);

    expect(error).toBeTruthy();
    expect(error.message).toMatch(/Cannot read properties of undefined|Cannot read property|reading 'length'|Cannot read/i);

    // Result should remain unchanged
    await expect(pageObjects.result(page)).toHaveText('');
  });

  // Group of tests for normal workflows after proper initialization
  test.describe('After initialization', () => {
    // Helper to initialize with a given count and assert initialization message
    const initialize = async (page, count) => {
      await pageObjects.numElements(page).fill(String(count));
      await pageObjects.initializeBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText(`Initialized Union-Find with ${count} elements.`);
    };

    test('Initialize with 5 elements then perform unions and finds (verify set roots)', async ({ page }) => {
      // Initialize with 5 elements
      await initialize(page, 5);

      // Union 0 and 1
      await pageObjects.pairInput(page).fill('0 1');
      await pageObjects.unionBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText('Unioned 0 and 1.');

      // Union 1 and 2 (this should connect 2 into the root of 0)
      await pageObjects.pairInput(page).fill('1 2');
      await pageObjects.unionBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText('Unioned 1 and 2.');

      // Find 2 -> expect root 0 based on union by rank behavior in the implementation
      await pageObjects.findInput(page).fill('2');
      await pageObjects.findBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText('Element 2 is in the set with root 0.');

      // Verify find for 0 and 1 also indicate root 0
      await pageObjects.findInput(page).fill('0');
      await pageObjects.findBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText('Element 0 is in the set with root 0.');

      await pageObjects.findInput(page).fill('1');
      await pageObjects.findBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText('Element 1 is in the set with root 0.');
    });

    test('Invalid pair input format shows validation message', async ({ page }) => {
      // Initialize with 3 elements
      await initialize(page, 3);

      // Enter an invalid pair (single number)
      await pageObjects.pairInput(page).fill('0');
      await pageObjects.unionBtn(page).click();

      // Should instruct to enter a valid pair
      await expect(pageObjects.result(page)).toHaveText('Please enter a valid pair.');
    });

    test('Out-of-range union inputs show an invalid range message', async ({ page }) => {
      // Initialize with 3 elements
      await initialize(page, 3);

      // Enter pair where second element is out of range
      await pageObjects.pairInput(page).fill('0 5');
      await pageObjects.unionBtn(page).click();

      // Should display range error message (handled gracefully without throwing)
      await expect(pageObjects.result(page)).toHaveText('Invalid input. Ensure numbers are within range.');
    });

    test('Out-of-range find input shows an invalid range message', async ({ page }) => {
      // Initialize with 3 elements
      await initialize(page, 3);

      // Enter find element out of range
      await pageObjects.findInput(page).fill('10');
      await pageObjects.findBtn(page).click();

      // Should display range error message (handled gracefully without throwing)
      await expect(pageObjects.result(page)).toHaveText('Invalid input. Ensure number is within range.');
    });

    test('Initializing with empty input results in NaN message and creates an empty structure', async ({ page }) => {
      // Leave numElements empty and click initialize
      await pageObjects.numElements(page).fill('');
      await pageObjects.initializeBtn(page).click();

      // Because parseInt('') -> NaN, the page displays NaN in the message
      await expect(pageObjects.result(page)).toHaveText('Initialized Union-Find with NaN elements.');

      // Now try a union; since parent array length will be 0, out-of-range should be displayed (no runtime error)
      await pageObjects.pairInput(page).fill('0 1');
      await pageObjects.unionBtn(page).click();
      await expect(pageObjects.result(page)).toHaveText('Invalid input. Ensure numbers are within range.');
    });
  });

  // Accessibility / visibility quick checks
  test('Controls remain visible and interactive after several operations', async ({ page }) => {
    // Initialize
    await pageObjects.numElements(page).fill('4');
    await pageObjects.initializeBtn(page).click();
    await expect(pageObjects.result(page)).toHaveText('Initialized Union-Find with 4 elements.');

    // Perform operations
    await pageObjects.pairInput(page).fill('0 1');
    await pageObjects.unionBtn(page).click();
    await pageObjects.pairInput(page).fill('2 3');
    await pageObjects.unionBtn(page).click();

    // Ensure controls are still attached and visible
    await expect(pageObjects.unionBtn(page)).toBeVisible();
    await expect(pageObjects.findBtn(page)).toBeVisible();
    await expect(pageObjects.pairInput(page)).toBeEditable();
    await expect(pageObjects.findInput(page)).toBeEditable();
  });
});