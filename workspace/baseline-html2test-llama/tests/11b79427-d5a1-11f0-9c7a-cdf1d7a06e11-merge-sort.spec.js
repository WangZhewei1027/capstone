import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79427-d5a1-11f0-9c7a-cdf1d7a06e11.html';

/**
 * Page Object for the Merge Sort application.
 * Encapsulates common interactions and element locators.
 */
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.form = page.locator('#sort-form');
    this.input = page.locator('#array');
    this.submitButton = page.locator('#sort-form button[type="submit"]');
    this.output = page.locator('#output');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterArray(text) {
    await this.input.fill(text);
  }

  async submit() {
    // Click the submit button (type=submit) to trigger form submission.
    await this.submitButton.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }
}

test.describe('Merge Sort application - 11b79427-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // We'll capture console messages and page errors for each test run.
  // This helps verify there are no unexpected runtime errors.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default UI state
  test('loads the page and shows initial UI elements', async ({ page }) => {
    const app = new MergeSortPage(page);
    await app.goto();

    // Verify page title and main heading are present
    await expect(page).toHaveTitle(/Merge Sort/);
    await expect(app.heading).toBeVisible();
    await expect(app.heading).toHaveText('Merge Sort');

    // Verify form controls exist and are visible
    await expect(app.input).toBeVisible();
    await expect(app.submitButton).toBeVisible();
    await expect(app.submitButton).toHaveText('Sort');

    // Output should be empty initially
    const initialOutput = await app.getOutputText();
    expect(initialOutput.trim()).toBe('');

    // No runtime errors or console error messages should have occurred on load
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test a normal sorting interaction
  test('sorts a list of integers in ascending order when the form is submitted', async ({ page }) => {
    const app1 = new MergeSortPage(page);
    await app.goto();

    // Enter numbers in arbitrary order and submit the form
    await app.enterArray('3 1 2');
    await app.submit();

    // Wait and assert that the output updates with the sorted array
    await expect(app.output).toContainText('Sorted array:');
    const outputText = (await app.getOutputText()).replace(/\s+/g, ' ').trim();
    // Expect the sorted sequence "1 2 3" to appear after "Sorted array:"
    expect(outputText).toContain('Sorted array: 1 2 3');

    // Verify no runtime errors occurred during the interaction
    const consoleErrors1 = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test handling of negative numbers and duplicates
  test('correctly sorts negative numbers and duplicates', async ({ page }) => {
    const app2 = new MergeSortPage(page);
    await app.goto();

    // Enter negative numbers and duplicates
    await app.enterArray('-1 3 2 -1');
    await app.submit();

    // Expect "-1 -1 2 3" in the output
    await expect(app.output).toContainText('Sorted array:');
    const outputText1 = (await app.getOutputText()).replace(/\s+/g, ' ').trim();
    expect(outputText).toContain('Sorted array: -1 -1 2 3');

    // Ensure no console or page errors occurred
    const consoleErrors2 = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test behavior with non-numeric input - application uses Number() which yields NaN
  test('handles non-numeric tokens by converting them to NaN and displays them', async ({ page }) => {
    const app3 = new MergeSortPage(page);
    await app.goto();

    // Provide inputs including invalid numbers
    await app.enterArray('a b 1');
    await app.submit();

    // The implementation maps tokens with Number() resulting in NaN for non-numeric strings.
    // The output should include "NaN" tokens as text and also the numeric "1".
    await expect(app.output).toContainText('Sorted array:');
    const outputText2 = (await app.getOutputText()).replace(/\s+/g, ' ').trim();

    // Confirm '1' is present and that at least one "NaN" appears (likely two)
    expect(outputText).toContain('1');
    const nanCount = (outputText.match(/NaN/g) || []).length;
    expect(nanCount).toBeGreaterThanOrEqual(1);

    // Ensure no runtime exceptions were thrown (even though values may be NaN)
    const consoleErrors3 = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test form constraint validation: required attribute prevents empty submission
  test('does not submit the form when the input is empty because of the required attribute', async ({ page }) => {
    const app4 = new MergeSortPage(page);
    await app.goto();

    // Ensure input is empty
    await app.input.fill('');
    // Click submit - browser should perform validation and not allow submission due to "required"
    await app.submit();

    // Since the input is required, the submit handler should not run and output remains empty.
    // There may be slight differences between browser behaviors; we check that output does not show "Sorted array:"
    const outputText3 = (await app.getOutputText()).replace(/\s+/g, ' ').trim();
    expect(outputText).toBe('');

    // Also assert no JS runtime errors occurred during attempted submission
    const consoleErrors4 = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // End-to-end sanity: multiple consecutive submissions update the output correctly
  test('allows multiple consecutive sorts and updates the output each time', async ({ page }) => {
    const app5 = new MergeSortPage(page);
    await app.goto();

    // First sort
    await app.enterArray('5 4 3');
    await app.submit();
    await expect(app.output).toContainText('Sorted array: 3 4 5');

    // Second sort with different input
    await app.enterArray('10 2 8 2');
    await app.submit();
    // Expect "2 2 8 10"
    const outputText2 = (await app.getOutputText()).replace(/\s+/g, ' ').trim();
    expect(outputText2).toContain('Sorted array: 2 2 8 10');

    // Verify still no runtime errors after multiple interactions
    const consoleErrors5 = consoleMessages.filter((m) => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});