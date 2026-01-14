import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79420-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Adjacency Matrix Application (11b79420-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Navigate to the app before each test and ensure a clean slate.
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Test initial page load: inputs, buttons and table are present and in their default state.
  test('Initial load shows inputs, buttons, and an empty adjacency matrix', async ({ page }) => {
    // Verify the page title and header are present
    await expect(page.locator('h1')).toHaveText('Adjacency Matrix');

    // Check input fields exist and have correct placeholders and types
    const num1 = page.locator('#num1');
    const num2 = page.locator('#num2');
    await expect(num1).toBeVisible();
    await expect(num2).toBeVisible();
    await expect(num1).toHaveAttribute('placeholder', 'Enter the number of vertices');
    await expect(num2).toHaveAttribute('placeholder', 'Enter the number of edges');
    await expect(num1).toHaveAttribute('type', 'number');
    await expect(num2).toHaveAttribute('type', 'number');

    // Check buttons exist and are visible
    const generateBtn = page.locator('#generate-btn');
    const clearBtn = page.locator('#clear-btn');
    await expect(generateBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();
    await expect(generateBtn).toHaveText('Generate Adjacency Matrix');
    await expect(clearBtn).toHaveText('Clear Matrix');

    // The adjacency matrix table should exist and initially be empty
    const table = page.locator('#adjacency-matrix');
    await expect(table).toBeVisible();
    // It renders as empty string in innerHTML initially
    const initialInnerHTML = await page.evaluate(() => document.getElementById('adjacency-matrix').innerHTML);
    expect(initialInnerHTML).toBe('');
  });

  // Test generating with zero vertices/edges should be safe (no runtime errors) and keep table empty.
  test('Generate with 0 vertices and 0 edges does not throw and leaves table empty', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.fill('#num1', '0');
    await page.fill('#num2', '0');

    // Click generate - loops won't run because values are 0, so no runtime error expected.
    await page.click('#generate-btn');

    // Give a brief moment for any errors to surface if they would
    await page.waitForTimeout(200);

    expect(errors.length).toBe(0);

    // Table should remain empty
    const innerHTML = await page.evaluate(() => document.getElementById('adjacency-matrix').innerHTML);
    expect(innerHTML).toBe('');
  });

  // Test generating with positive values: the provided implementation has a broken initialization
  // for the matrix which should produce a runtime TypeError when attempting to assign to matrix[row][col].
  test('Generate with positive vertices/edges triggers a runtime error due to broken matrix initialization', async ({ page }) => {
    // Wait for the pageerror event that originates from the faulty generateMatrix code.
    const waitForError = page.waitForEvent('pageerror');

    // Input positive numbers to exercise the broken loop which assigns into an uninitialized matrix.
    await page.fill('#num1', '3');
    await page.fill('#num2', '3');

    // Trigger generation which is expected to throw a runtime error (TypeError).
    await page.click('#generate-btn');

    // Await the error and assert its type/message contains indicative text.
    const error = await waitForError;
    // The environment may vary, accept typical TypeError phrases that indicate setting property on undefined.
    expect(error).toBeTruthy();
    const msg = String(error.message || error);
    // Accept multiple common JS engine messages
    expect(msg).toMatch(/Cannot set properties of undefined|Cannot set property|TypeError/);
  });

  // Test the Clear Matrix button: it should set the matrix to an empty array and render an empty table.
  test('Clear button resets the matrix and clears the table display', async ({ page }) => {
    // First, attempt a generate with zeros (safe) to ensure no prior errors, then clear.
    await page.fill('#num1', '0');
    await page.fill('#num2', '0');
    await page.click('#generate-btn');

    // Now click clear and verify the table becomes empty
    await page.click('#clear-btn');

    // The application sets innerHTML = '' in renderMatrix when matrix is empty.
    const innerHTMLAfterClear = await page.evaluate(() => document.getElementById('adjacency-matrix').innerHTML);
    expect(innerHTMLAfterClear).toBe('');
  });

  // Test clicking on the adjacency matrix where there are no buttons: should not cause errors.
  test('Clicking on table without any buttons does not trigger the button-specific click handler and causes no errors', async ({ page }) => {
    const errors1 = [];
    page.on('pageerror', (err) => errors.push(err));

    // Click somewhere in the table area
    await page.click('#adjacency-matrix');

    // Allow a short interval in which an erroneous click handler might throw
    await page.waitForTimeout(200);

    // No new errors expected because there are no BUTTON targets inside the table.
    expect(errors.length).toBe(0);
  });

  // Edge case: try filling with invalid (non-numeric) input into number fields - browser should coerce or ignore.
  test('Entering non-numeric text into number inputs and attempting generate results in NaN parse but should not crash the page', async ({ page }) => {
    const errors2 = [];
    page.on('pageerror', (err) => errors.push(err));

    // Fill with text that cannot parse as integer
    await page.fill('#num1', 'abc');
    await page.fill('#num2', 'def');

    // Click generate. parseInt will produce NaN, generateMatrix's loops will treat NaN as not running,
    // but code uses it as loop bounds. In many engines NaN < number comparisons are false -> loops don't run.
    // We expect no crash from this specific action (but other bugs could still produce errors).
    await page.click('#generate-btn');

    // Brief wait for any errors
    await page.waitForTimeout(200);

    // Assert no pageerror was thrown by this action (if an error exists from previous tests it would be distinct per-test)
    expect(errors.length).toBe(0);

    // The table should remain empty because matrix was never populated
    const innerHTML1 = await page.evaluate(() => document.getElementById('adjacency-matrix').innerHTML1);
    expect(innerHTML).toBe('');
  });

});