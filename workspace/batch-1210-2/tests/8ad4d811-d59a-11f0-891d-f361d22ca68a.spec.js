import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad4d811-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Knapsack Problem FSM - Interactive Application (8ad4d811-d59a-11f0-891d-f361d22ca68a)', () => {
  // Arrays to capture runtime console error messages and page errors
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Load the page exactly as-is
    await page.goto(APP_URL);
  });

  // Test the initial Idle state: page should render the form and components described in the FSM
  test('Initial render (S0_Idle) - form and inputs are present and required attributes exist', async ({ page }) => {
    // The FSM indicates on entry it should render the page; verify form and components exist.
    const form = page.locator('#knapsack-form');
    await expect(form).toHaveCount(1);

    const itemsInput = page.locator('#items');
    const weightInput = page.locator('#weight');
    const valueInput = page.locator('#value');
    const submitButton = page.locator('button[type="submit"]');
    const resultDiv = page.locator('#result');

    await expect(itemsInput).toBeVisible();
    await expect(weightInput).toBeVisible();
    await expect(valueInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Inputs are required per FSM/components
    await expect(itemsInput).toHaveAttribute('required', '');
    await expect(weightInput).toHaveAttribute('required', '');
    await expect(valueInput).toHaveAttribute('required', '');

    // On initial render result area should be empty
    await expect(resultDiv).toBeVisible();
    const resultText = await resultDiv.textContent();
    expect(resultText.trim()).toBe('');

    // Ensure that no runtime errors were produced during initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: submitting without filling required fields should be blocked by browser validation
  test('Submitting empty required fields is blocked by HTML5 validation (no runtime errors)', async ({ page }) => {
    // Attempt to click submit with empty required fields
    await page.click('button[type="submit"]');

    // Allow a short time for any potential runtime errors to appear (there should be none)
    await page.waitForTimeout(300);

    // Since inputs are required, the browser should prevent submission and no JS runtime error should occur
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // Result area should remain empty
    const resultText = await page.locator('#result').textContent();
    expect(resultText.trim()).toBe('');
  });

  // Main transition test: submitting valid form data should attempt to compute results.
  // The implementation calls knapsack.solve() on a plain object, which does not exist,
  // so a TypeError is expected. This test asserts that the TypeError occurs and that
  // the results are not rendered into the DOM.
  test('Submitting valid inputs triggers a runtime TypeError because knapsack.solve is not defined (transition S0 -> S1 fails with error)', async ({ page }) => {
    // Fill in valid comma-separated values for items, weights, and values
    await page.fill('#items', 'apple,banana');
    await page.fill('#weight', '1,2');
    await page.fill('#value', '10,20');

    // Click submit and wait for a pageerror event
    const errorPromise = page.waitForEvent('pageerror', { timeout: 2000 }).catch(() => null);

    await page.click('button[type="submit"]');

    // Wait for the pageerror (expected) or timeout
    const pageError = await errorPromise;

    // Assert that a page error occurred
    expect(pageError).not.toBeNull();

    // The thrown error should indicate that knapsack.solve is not a function (TypeError)
    // Different JS engines produce slightly different error messages, so use a flexible match
    const errMessage = pageError?.message || '';
    expect(errMessage.toLowerCase()).toMatch(/solve|is not a function|cannot read property/i);

    // Also ensure a console.error entry was recorded (some runtimes log uncaught exceptions to console)
    const anyConsoleError = consoleErrors.some((text) => /solve|is not a function|cannot read property/i.test(text.toLowerCase()));
    expect(anyConsoleError || pageErrors.length > 0).toBeTruthy();

    // The FSM transition expects resultDiv.innerHTML to include "<h2>Knapsack Results:" but due to the error
    // the handler should have thrown before updating the DOM. Verify result area was not populated.
    const resultHtml = await page.locator('#result').innerHTML();
    expect(resultHtml).not.toContain('<h2>Knapsack Results:');
    expect((resultHtml || '').trim()).toBe('');
  });

  // Validate that the global function knapsack_solve exists (the script defines it), but the code uses knapsack.solve()
  // This checks presence of the alternative function without invoking it.
  test('Page exposes knapsack_solve function but submit handler uses knapsack.solve (mismatch)', async ({ page }) => {
    // Evaluate existence of the global function without calling it
    const exists = await page.evaluate(() => typeof window.knapsack_solve === 'function');
    expect(exists).toBe(true);

    // Confirm that there were no "renderPage" related errors on load despite FSM entry_actions mentioning it.
    // The FSM expected a renderPage() entry action, but the implementation doesn't call it; assert no ReferenceError mentioning renderPage.
    const hasRenderPageError = pageErrors.some((err) => String(err).toLowerCase().includes('renderpage')) ||
      consoleErrors.some((msg) => msg.toLowerCase().includes('renderpage'));
    expect(hasRenderPageError).toBe(false);
  });

  // Additional robustness test: submit malformed numeric inputs (non-numeric values) and ensure the same TypeError occurs
  // because submit handler still attempts knapsack.solve() and will error before parsing/using the data.
  test('Submitting malformed numeric data still results in the same runtime error (knapsack.solve missing)', async ({ page }) => {
    await page.fill('#items', 'item1,item2');
    await page.fill('#weight', 'not-a-number,also-bad');
    await page.fill('#value', 'x,y');

    const errorPromise = page.waitForEvent('pageerror', { timeout: 2000 }).catch(() => null);
    await page.click('button[type="submit"]');
    const pageError = await errorPromise;

    expect(pageError).not.toBeNull();
    const errMessage = pageError?.message || '';
    expect(errMessage.toLowerCase()).toMatch(/solve|is not a function|cannot read property/i);

    // Ensure result DOM was not updated
    const resultHtml = await page.locator('#result').innerHTML();
    expect(resultHtml).not.toContain('<h2>Knapsack Results:');
  });
});