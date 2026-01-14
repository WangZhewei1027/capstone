import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f7432c-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object for the Linear Regression page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  xInput() {
    return this.page.locator('#x');
  }

  yInput() {
    return this.page.locator('#y');
  }

  submitButton() {
    return this.page.locator('#submit');
  }

  output() {
    return this.page.locator('#output');
  }

  // Fill numeric inputs as strings
  async fillInputs(xValue, yValue) {
    await this.xInput().fill(String(xValue));
    await this.yInput().fill(String(yValue));
  }

  // Submit the form (click the submit button)
  async submitAndWaitForNavigation(options = { waitForNavigation: true }) {
    if (options.waitForNavigation) {
      // clicking the submit button will trigger a navigation (form submit without action reloads)
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'load' }),
        this.submitButton().click(),
      ]);
    } else {
      await this.submitButton().click();
    }
  }
}

test.describe('Linear Regression app - UI and runtime error observations', () => {
  // Arrays to capture runtime errors and console error messages per test
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize capture arrays before navigation and set listeners
    pageErrors = [];
    consoleErrors = [];

    // Capture thrown page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store message for assertions
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the page under test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test('Initial load: form elements are present and runtime TypeError is thrown due to incorrect JS array handling', async ({ page }) => {
    const p = new LinearRegressionPage(page);

    // Verify inputs and button are visible and have expected attributes
    await expect(p.xInput()).toBeVisible();
    await expect(p.yInput()).toBeVisible();
    await expect(p.submitButton()).toBeVisible();

    // Check input types
    await expect(p.xInput()).toHaveAttribute('type', 'number');
    await expect(p.yInput()).toHaveAttribute('type', 'number');

    // Check labels are present in the DOM (by text)
    await expect(page.locator('label[for="x"]')).toHaveText(/X \(dependent variable\):/i);
    await expect(page.locator('label[for="y"]')).toHaveText(/Y \(independent variable\):/i);

    // The application script is expected to fail at runtime due to using DOM input elements as arrays.
    // Assert that a page-level error occurred during initial load.
    expect(pageErrors.length).toBeGreaterThan(0);

    // At least one of the error messages should indicate a TypeError caused by calling reduce on a non-array.
    const combinedPageErrors = pageErrors.join(' | ').toLowerCase();
    expect(
      combinedPageErrors.includes('reduce is not a function') ||
      combinedPageErrors.includes('is not a function') ||
      combinedPageErrors.includes('typeerror')
    ).toBeTruthy();

    // Also check console.error messages were emitted that mention 'reduce' or the function name
    const combinedConsoleErrors = consoleErrors.join(' | ').toLowerCase();
    expect(
      combinedConsoleErrors.includes('reduce is not a function') ||
      combinedConsoleErrors.includes('calculateregressionequation') ||
      combinedConsoleErrors.length > 0
    ).toBeTruthy();

    // Because the script errored early, the #output element should remain empty (script could not write results)
    await expect(p.output()).toHaveText('', { timeout: 1000 });
  });

  test('Submitting the form (with numbers) reloads the page and runtime errors occur again', async ({ page }) => {
    const p1 = new LinearRegressionPage(page);

    // Fill the inputs with numeric values
    await p.fillInputs(10, 20);

    // Clear previous captured errors arrays to isolate this interaction
    pageErrors = [];
    consoleErrors = [];

    // Submit the form and wait for the navigation that a form submit triggers.
    // We do this to assert that errors occur both on initial load and on subsequent loads triggered by user actions.
    await p.submitAndWaitForNavigation({ waitForNavigation: true });

    // After reload, listeners still active in this test context will capture new errors.
    // There should again be a runtime error because the same erroneous script runs on every load.
    expect(pageErrors.length).toBeGreaterThan(0);

    const combinedPageErrors1 = pageErrors.join(' | ').toLowerCase();
    expect(
      combinedPageErrors.includes('reduce is not a function') ||
      combinedPageErrors.includes('is not a function') ||
      combinedPageErrors.includes('typeerror')
    ).toBeTruthy();

    // Output should again be empty due to the error preventing result rendering
    await expect(p.output()).toHaveText('', { timeout: 1000 });
  });

  test('Submitting the form with empty inputs still results in runtime errors (edge case)', async ({ page }) => {
    const p2 = new LinearRegressionPage(page);

    // Ensure inputs are empty
    await p.xInput().fill('');
    await p.yInput().fill('');

    // Reset captured errors
    pageErrors = [];
    consoleErrors = [];

    // Submit form - trigger navigation and re-evaluation of the broken script
    await p.submitAndWaitForNavigation({ waitForNavigation: true });

    // The app's incorrect assumptions about variable types/build should still cause runtime errors
    expect(pageErrors.length).toBeGreaterThan(0);

    const combinedPageErrors2 = pageErrors.join(' | ').toLowerCase();
    expect(
      combinedPageErrors.includes('reduce is not a function') ||
      combinedPageErrors.includes('is not a function') ||
      combinedPageErrors.includes('typeerror')
    ).toBeTruthy();

    // Confirm output remains blank or unchanged due to the script failure
    await expect(p.output()).toHaveText('', { timeout: 1000 });
  });

  test('Console and page errors include clues to failing functions (helpful for debugging)', async ({ page }) => {
    // This test inspects console and page errors to verify they reference the problematic functions/operations.
    // Collect the errors produced during the initial load (set up in beforeEach).

    // There should be at least one console error or page error captured
    expect(pageErrors.length + consoleErrors.length).toBeGreaterThan(0);

    const allMessages = [...pageErrors, ...consoleErrors].join(' | ').toLowerCase();

    // We expect messages to mention reduce usage or the function names present in the HTML script
    // (calculateRegressionEquation, calculatePredictedValues, calculateMeanSquaredError, calculateRSquared)
    const hints = [
      'reduce is not a function',
      'calculateregressionequation',
      'calculatepredictedvalues',
      'calculatemeansquarederror',
      'calculatersquared'
    ];

    // At least one hint should be present in the combined messages
    const foundHint = hints.some(hint => allMessages.includes(hint));
    expect(foundHint).toBeTruthy();
  });
});