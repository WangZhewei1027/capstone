import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed50b-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Knapsack Problem Demo - End-to-end', () => {

  // Helper to attach listeners and collect console errors and page errors for assertions
  async function attachErrorCollectors(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    return { consoleErrors, pageErrors };
  }

  // Test initial page load: items displayed, default capacity, initial result text, and no console/page errors
  test('Initial load shows items list, default capacity, and empty result', async ({ page }) => {
    // Arrange: attach collectors before navigation to capture any load-time errors
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    // Act: navigate to the page
    await page.goto(APP_URL);

    // Assert: Items table has three rows with correct contents
    const rows = page.locator('#items-table tr');
    await expect(rows).toHaveCount(3);

    // Verify each row's cells (Item, Weight, Value)
    await expect(rows.nth(0).locator('td').nth(0)).toHaveText('Item 1');
    await expect(rows.nth(0).locator('td').nth(1)).toHaveText('10');
    await expect(rows.nth(0).locator('td').nth(2)).toHaveText('60');

    await expect(rows.nth(1).locator('td').nth(0)).toHaveText('Item 2');
    await expect(rows.nth(1).locator('td').nth(1)).toHaveText('20');
    await expect(rows.nth(1).locator('td').nth(2)).toHaveText('100');

    await expect(rows.nth(2).locator('td').nth(0)).toHaveText('Item 3');
    await expect(rows.nth(2).locator('td').nth(1)).toHaveText('30');
    await expect(rows.nth(2).locator('td').nth(2)).toHaveText('120');

    // Verify capacity input default value
    const capacity = page.locator('#capacity');
    await expect(capacity).toHaveValue('50');

    // Verify initial result text (notice the trailing space in the HTML)
    const result = page.locator('#result');
    await expect(result).toHaveText('Maximum Value: ');

    // Verify no console errors or page errors occurred during load
    expect(consoleErrors.length, 'No console.error should be emitted on load').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors should occur on load').toBe(0);
  });

  // Test solving with default capacity (50) produces the expected maximum value (220)
  test('Clicking Solve with default capacity computes expected maximum value (220)', async ({ page }) => {
    // Collect any console/page errors
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    // Accessibility check: Solve button is available by role and name
    const solveButton = page.getByRole('button', { name: 'Solve' });
    await expect(solveButton).toBeVisible();

    // Click Solve and verify result text updates to expected value
    await solveButton.click();

    const result = page.locator('#result');
    await expect(result).toHaveText('Maximum Value: 220');

    // Verify no runtime/page errors or console.error messages occurred during solving
    expect(consoleErrors.length, 'No console.error should be emitted when solving with valid input').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors should occur when solving with valid input').toBe(0);
  });

  // Test changing capacity to 40 => expected maximum value 180 (Item1 + Item3)
  test('Changing capacity to 40 yields expected maximum value (180)', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    const capacity = page.locator('#capacity');
    // Set capacity to 40
    await capacity.fill('40');

    // Ensure the value was set
    await expect(capacity).toHaveValue('40');

    // Click Solve
    await page.getByRole('button', { name: 'Solve' }).click();

    // Expect result to be 180 (Item1 weight 10 value 60 + Item3 weight 30 value 120)
    await expect(page.locator('#result')).toHaveText('Maximum Value: 180');

    expect(consoleErrors.length, 'No console.error should be emitted for valid capacity 40').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors for valid capacity 40').toBe(0);
  });

  // Test small capacity that cannot fit any items => expected maximum value 0
  test('Small capacity (5) that fits no items returns 0', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    const capacity = page.locator('#capacity');
    await capacity.fill('5');
    await expect(capacity).toHaveValue('5');

    await page.getByRole('button', { name: 'Solve' }).click();

    await expect(page.locator('#result')).toHaveText('Maximum Value: 0');

    expect(consoleErrors.length, 'No console.error should be emitted for capacity 5').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors for capacity 5').toBe(0);
  });

  // Test non-integer capacity: input "25.6" -> parseInt will read 25, expected result 100
  test('Non-integer capacity (25.6) is parsed by parseInt and yields expected result (100)', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    const capacity = page.locator('#capacity');
    // Fill with a float-like value; parseInt('25.6') => 25
    await capacity.fill('25.6');
    await expect(capacity).toHaveValue('25.6');

    await page.getByRole('button', { name: 'Solve' }).click();

    // For capacity 25 the best is Item2 (weight 20, value 100)
    await expect(page.locator('#result')).toHaveText('Maximum Value: 100');

    expect(consoleErrors.length, 'No console.error should be emitted for capacity 25.6').toBe(0);
    expect(pageErrors.length, 'No uncaught page errors for capacity 25.6').toBe(0);
  });

  // Edge case: empty capacity input should produce a runtime error from the page (uncaught)
  test('Clearing capacity input and clicking Solve produces a runtime error (uncaught) on the page', async ({ page }) => {
    await page.goto(APP_URL);

    // Clear the capacity input to produce an empty string
    const capacity = page.locator('#capacity');
    await capacity.fill('');

    // Wait for the pageerror that is expected to occur when the script attempts to build an array with NaN length
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      // Click the Solve button that triggers the problematic code path
      page.getByRole('button', { name: 'Solve' }).click()
    ]);

    // The page should have thrown an uncaught error. Verify that an Error object was received.
    expect(pageError).toBeTruthy();
    expect(typeof pageError.message).toBe('string');
    expect(pageError.message.length).toBeGreaterThan(0);

    // The message is expected to be related to invalid array length or invalid numeric operations.
    // We assert that the message mentions 'array' or 'Invalid' to make sure it's the expected kind of runtime error.
    const msgLower = pageError.message.toLowerCase();
    const containsExpected = msgLower.includes('array') || msgLower.includes('invalid') || msgLower.includes('length') || msgLower.includes('nan');
    expect(containsExpected, `Error message should reference array/invalid/length/nan but was: "${pageError.message}"`).toBe(true);
  });

  // Accessibility & visibility: ensure key interactive elements are visible and labelled
  test('Interactive elements (capacity input and Solve button) are visible and accessible', async ({ page }) => {
    await page.goto(APP_URL);

    const capacity = page.getByLabel('Knapsack Capacity:');
    // The label text in the HTML is "Knapsack Capacity: " with a trailing space; getByLabel should still find it
    if (await capacity.count() === 0) {
      // fallback to ID locator if the label lookup fails
      await expect(page.locator('#capacity')).toBeVisible();
    } else {
      await expect(capacity).toBeVisible();
    }

    const solveButton = page.getByRole('button', { name: 'Solve' });
    await expect(solveButton).toBeVisible();
    await expect(solveButton).toHaveText('Solve');
  });

});