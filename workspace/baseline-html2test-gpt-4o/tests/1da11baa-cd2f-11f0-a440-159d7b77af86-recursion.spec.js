import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11baa-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Recursion Example: Factorial Calculation (Application ID: 1da11baa-cd2f-11f0-a440-159d7b77af86)', () => {
  // Arrays to capture console and page errors for each test
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];

  // Page object for interacting with the app
  const app = {
    input: (page) => page.locator('#numberInput'),
    button: (page) => page.locator('button', { hasText: 'Calculate Factorial' }),
    result: (page) => page.locator('#resultDisplay'),
    heading: (page) => page.locator('h1'),
  };

  // Setup: navigate to the page and attach listeners to capture console/page errors.
  test.beforeEach(async ({ page }) => {
    // Reset captured arrays
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and classify error-level console messages
    page.on('console', (msg) => {
      const entry = { type: msg.type(), text: msg.text() };
      consoleMessages.push(entry);
      if (msg.type() === 'error') {
        consoleErrors.push(entry.text);
      }
    });

    // Capture uncaught errors on the page
    page.on('pageerror', (err) => {
      // err is typically an Error object
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Go to the application page
    await page.goto(APP_URL);
  });

  // Teardown check: ensure no unexpected console errors or page errors occurred during the test run
  test.afterEach(async () => {
    // This runs after each test automatically (assertions in tests themselves use the captured arrays).
    // Included intentionally to indicate we expect tests to assert on these arrays.
  });

  test('Initial page load: UI elements are present and default state is correct', async ({ page }) => {
    // Verify heading and basic content
    await expect(app.heading(page)).toHaveText('Recursion Example: Factorial Calculation');

    // Verify input exists, visible, and has placeholder and min attribute
    const input = app.input(page);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter number');
    await expect(input).toHaveAttribute('min', '0');

    // Verify button exists and is enabled
    const button = app.button(page);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Result display should be present and empty on load
    const result = app.result(page);
    await expect(result).toBeVisible();
    await expect(result).toHaveText('');

    // Assert that there were no console error messages or uncaught page errors on initial load
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Calculate factorial of a positive integer (5) and verify DOM update', async ({ page }) => {
    // Purpose: Enter "5", click calculate, verify correct factorial result is displayed.
    await app.input(page).fill('5');
    await app.button(page).click();

    // Expect the correct result to be displayed
    await expect(app.result(page)).toHaveText('Factorial of 5 is 120');

    // Ensure no console errors or page errors happened during the interaction
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Calculate factorial of 0 (base case) -> result should be 1', async ({ page }) => {
    // Purpose: Verify recursion base case is handled correctly.
    await app.input(page).fill('0');
    await app.button(page).click();

    await expect(app.result(page)).toHaveText('Factorial of 0 is 1');

    // Verify no runtime errors were logged
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Input negative number shows validation error message', async ({ page }) => {
    // Purpose: Enter a negative number and verify the app rejects it with an appropriate message.
    await app.input(page).fill('-3');
    await app.button(page).click();

    await expect(app.result(page)).toHaveText('Please enter a valid non-negative integer.');

    // No console/page errors expected
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Empty input shows validation error message', async ({ page }) => {
    // Purpose: Leave input empty and click the button -> should instruct the user to enter a valid number.
    await app.input(page).fill(''); // empty
    await app.button(page).click();

    await expect(app.result(page)).toHaveText('Please enter a valid non-negative integer.');

    // Confirm no JS runtime errors
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Floating point input is parsed with parseInt (3.5 -> 3) and computes factorial accordingly', async ({ page }) => {
    // Purpose: Verify the implementation uses parseInt by providing a float and checking the result.
    await app.input(page).fill('3.5');
    await app.button(page).click();

    // parseInt('3.5') === 3 => factorial 3 = 6
    await expect(app.result(page)).toHaveText('Factorial of 3 is 6');

    // No console/page errors expected
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Non-numeric string entered into the number input yields validation error', async ({ page }) => {
    // Purpose: Although the input is type=number, test programmatically setting a non-numeric value and ensure validation triggers.
    // Playwright can fill a value that isn't a valid number.
    await app.input(page).fill('not-a-number');
    await app.button(page).click();

    await expect(app.result(page)).toHaveText('Please enter a valid non-negative integer.');

    // Ensure no JS runtime errors occurred during handling of this input
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Multiple sequential calculations update the result area correctly', async ({ page }) => {
    // Purpose: Ensure repeated uses of the calculator update the DOM each time with the correct value.
    await app.input(page).fill('4');
    await app.button(page).click();
    await expect(app.result(page)).toHaveText('Factorial of 4 is 24');

    // Change input and calculate again
    await app.input(page).fill('6');
    await app.button(page).click();
    await expect(app.result(page)).toHaveText('Factorial of 6 is 720');

    // And again with 1
    await app.input(page).fill('1');
    await app.button(page).click();
    await expect(app.result(page)).toHaveText('Factorial of 1 is 1');

    // Ensure no console/page errors during multiple interactions
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Accessibility checks: input and button are keyboard-focusable and have accessible names', async ({ page }) => {
    // Purpose: Basic accessibility checks - ensure controls are focusable and button text is descriptive.
    const input = app.input(page);
    const button = app.button(page);

    // Focus input via keyboard tab sequence
    await page.keyboard.press('Tab'); // first tab likely focuses the input
    await expect(input).toBeFocused();

    // Tab to the button and verify focus
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();

    // Check that the button has descriptive text (used as accessible name)
    await expect(button).toHaveText('Calculate Factorial');

    // No runtime errors expected from focusing
    expect(consoleErrors.length, `Console error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });
});