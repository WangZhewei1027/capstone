import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa34-cd32-11f0-a96f-2d591ffb35fe.html';

// Playwright tests for the 0/1 Knapsack Problem Demo
// File: 7abeaa34-cd32-11f0-a96f-2d591ffb35fe-knapsack-problem.spec.js

test.describe('0/1 Knapsack Problem Demo - Integration Tests', () => {
  // Shared arrays to capture console messages and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Setup: start with fresh arrays and attach listeners on each new page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages (info/debug/log) and separately record console.error
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push({ type, text });
      }
    });

    // Capture unhandled exceptions / page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page under test
    await page.goto(APP_URL);
  });

  // Tear down: ensure no leaking listeners; Playwright handles page lifecycle,
  // but we assert the captured errors in each test explicitly.
  test.afterEach(async () => {
    // no-op here; assertions on console/page errors are performed per-test
  });

  test('Initial load: default inputs and UI elements are present', async ({ page }) => {
    // Verify main interactive elements exist and default values are set
    const itemsTextarea = page.locator('#items');
    const capacityInput = page.locator('#capacity');
    const solveBtn = page.locator('#solveBtn');
    const resultDiv = page.locator('#result');

    // The textarea should be present and contain the example default items
    await expect(itemsTextarea).toBeVisible();
    await expect(itemsTextarea).toHaveValue(/60 10/);
    await expect(itemsTextarea).toHaveValue(/100 20/);
    await expect(itemsTextarea).toHaveValue(/120 30/);

    // Capacity input default should be 50
    await expect(capacityInput).toBeVisible();
    await expect(capacityInput).toHaveValue('50');

    // Solve button and result container exist and result is initially empty
    await expect(solveBtn).toBeVisible();
    await expect(resultDiv).toBeVisible();
    await expect(resultDiv).toHaveText('');

    // Accessibility checks: textarea and result have aria attributes
    await expect(itemsTextarea).toHaveAttribute('aria-label', 'List of items with value and weight');
    await expect(resultDiv).toHaveAttribute('aria-live', 'polite');

    // Assert that no unexpected console errors or page errors occurred on initial load
    expect(consoleErrors.length, 'No console.error messages on page load').toBe(0);
    expect(pageErrors.length, 'No page errors (uncaught exceptions) on page load').toBe(0);
  });

  test('Solving with default example returns expected maximum value and selected items', async ({ page }) => {
    // This test clicks Solve with the default example and verifies output content
    const solveBtn1 = page.locator('#solveBtn1');
    const resultDiv1 = page.locator('#result');

    // Click the Solve button
    await solveBtn.click();

    // Wait for result area to be populated (aria-live updates)
    await expect(resultDiv).not.toHaveText('');

    // The maximum value for the default example (capacity 50) should be 220 (items 2 and 3)
    await expect(resultDiv).toContainText('Maximum value the knapsack can hold: 220');

    // The selected items table should contain rows for item #2 and #3
    const selectedTable = resultDiv.locator('table').first();
    await expect(selectedTable).toBeVisible();
    await expect(selectedTable).toContainText('2');
    await expect(selectedTable).toContainText('3');
    await expect(selectedTable).toContainText('100'); // value for item 2
    await expect(selectedTable).toContainText('120'); // value for item 3

    // The DP table should be present inside a <details> (first details is the collapsed DP)
    await expect(resultDiv.locator('details')).toBeVisible();

    // The explanation pre block should be present and include the capacity and max value
    const explanationPre = resultDiv.locator('pre.explanation');
    await expect(explanationPre).toBeVisible();
    await expect(explanationPre).toContainText('Maximum value achievable with capacity 50 is 220');

    // Assert no console errors or page errors occurred during solving
    expect(consoleErrors.length, 'No console.error during solve').toBe(0);
    expect(pageErrors.length, 'No page errors during solve').toBe(0);
  });

  test('Changing capacity affects the solution (capacity = 20)', async ({ page }) => {
    // Test that changing the capacity input updates the solution accordingly
    const capacityInput1 = page.locator('#capacity');
    const solveBtn2 = page.locator('#solveBtn2');
    const resultDiv2 = page.locator('#result');

    // Set capacity to 20 and click Solve
    await capacityInput.fill('20');
    await solveBtn.click();

    // Expect the maximum value to be 100 (only item #2 fits best)
    await expect(resultDiv).toContainText('Maximum value the knapsack can hold: 100');

    const explanationPre1 = resultDiv.locator('pre.explanation');
    await expect(explanationPre).toContainText('capacity 20 is 100');

    // Ensure the selected items table lists only item #2
    const selectedTable1 = resultDiv.locator('table').first();
    await expect(selectedTable).toContainText('Item #');
    await expect(selectedTable).toContainText('100');
    await expect(selectedTable).toContainText('20');

    // Assert no console errors or page errors occurred while changing capacity and solving
    expect(consoleErrors.length, 'No console.error when changing capacity and solving').toBe(0);
    expect(pageErrors.length, 'No page errors when changing capacity and solving').toBe(0);
  });

  test('Invalid item line format produces an error message', async ({ page }) => {
    // If a line does not have two numbers, parseItems throws an error and UI should show it
    const itemsTextarea1 = page.locator('#items');
    const solveBtn3 = page.locator('#solveBtn3');
    const resultDiv3 = page.locator('#result');

    // Provide an invalid line (only one number)
    await itemsTextarea.fill('10');
    await solveBtn.click();

    // The UI should display an error message mentioning "Line 1 is invalid"
    await expect(resultDiv).toContainText('Error: Line 1 is invalid. Expected format: value weight');

    // Assert no uncaught page errors; the error is handled and displayed, so pageErrors should be 0
    expect(pageErrors.length, 'No uncaught page errors when input is invalid').toBe(0);

    // Console may contain logs but should not contain console.error in normal operation
    expect(consoleErrors.length, 'No console.error when handling invalid input').toBe(0);
  });

  test('Negative value or non-positive weight triggers validation error', async ({ page }) => {
    const itemsTextarea2 = page.locator('#items');
    const solveBtn4 = page.locator('#solveBtn4');
    const resultDiv4 = page.locator('#result');

    // Provide a line with weight 0 (invalid)
    await itemsTextarea.fill('10 0\n');
    await solveBtn.click();
    await expect(resultDiv).toContainText('Error: Line 1 invalid values. Value must be ≥ 0, weight > 0');

    // Provide a negative value (invalid)
    await itemsTextarea.fill('-5 10\n');
    await solveBtn.click();
    await expect(resultDiv).toContainText('Error: Line 1 invalid values. Value must be ≥ 0, weight > 0');

    // Assert no uncaught page errors; errors are shown in UI
    expect(pageErrors.length, 'No uncaught page errors for invalid numeric item values').toBe(0);
    expect(consoleErrors.length, 'No console.error for invalid numeric item values').toBe(0);
  });

  test('Empty items textarea displays proper error', async ({ page }) => {
    // If user clears the textarea, the app should show "No valid items provided."
    const itemsTextarea3 = page.locator('#items');
    const solveBtn5 = page.locator('#solveBtn5');
    const resultDiv5 = page.locator('#result');

    await itemsTextarea.fill('');
    await solveBtn.click();

    await expect(resultDiv).toContainText('Error: No valid items provided.');

    // Confirm no uncaught page errors
    expect(pageErrors.length, 'No uncaught page errors for empty items input').toBe(0);
    expect(consoleErrors.length, 'No console.error for empty items input').toBe(0);
  });

  test('Invalid capacity (non-positive) displays capacity validation error', async ({ page }) => {
    const capacityInput2 = page.locator('#capacity');
    const solveBtn6 = page.locator('#solveBtn6');
    const resultDiv6 = page.locator('#result');

    // Set capacity to 0 (invalid)
    await capacityInput.fill('0');
    await solveBtn.click();
    await expect(resultDiv).toContainText('Error: Capacity must be a positive integer.');

    // Set capacity to a non-number value (should be coerced to NaN by the page code)
    await capacityInput.fill('not-a-number');
    await solveBtn.click();
    await expect(resultDiv).toContainText('Error: Capacity must be a positive integer.');

    // Assert no uncaught page errors (errors are caught and displayed)
    expect(pageErrors.length, 'No uncaught page errors for invalid capacity').toBe(0);
    expect(consoleErrors.length, 'No console.error for invalid capacity').toBe(0);
  });

  test('DP table content: basic sanity checks for dp matrix cells', async ({ page }) => {
    // This test ensures the DP table is rendered and contains expected numeric cells for default example
    const solveBtn7 = page.locator('#solveBtn7');
    const resultDiv7 = page.locator('#result');

    await solveBtn.click();

    // Find the first DP table (inside the details that contains the DP table)
    const dpTable = resultDiv.locator('details').nth(0).locator('table');
    await expect(dpTable).toBeVisible();

    // Header should contain capacities 0..50 (capacity input default is 50)
    await expect(dpTable.locator('thead')).toContainText('0');
    await expect(dpTable.locator('thead')).toContainText('50');

    // Some sanity checks on DP cell values: top-left dp[0][0] should be 0
    await expect(dpTable.locator('tbody tr').first().locator('td').first()).toHaveText('0');

    // The bottom-right cell (last row, last column) should equal the reported max value 220
    const lastRow = dpTable.locator('tbody tr').last();
    const lastCell = lastRow.locator('td').last();
    await expect(lastCell).toHaveText('220');

    // Assert no console errors or page errors on rendering DP table
    expect(pageErrors.length, 'No page errors when rendering DP table').toBe(0);
    expect(consoleErrors.length, 'No console.error when rendering DP table').toBe(0);
  });
});