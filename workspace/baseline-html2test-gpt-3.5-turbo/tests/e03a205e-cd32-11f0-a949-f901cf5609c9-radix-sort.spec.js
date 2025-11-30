import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a205e-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Radix Sort demo page
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#numberInput';
    this.btnSelector = '#sortBtn';
    this.errorSelector = '#errorMsg';
    this.arrayDisplaySelector = '#arrayDisplay';
    this.stepsSelector = '#steps';
  }

  async goto() {
    await this.page.goto(BASE_URL);
  }

  async fillInput(value) {
    await this.page.fill(this.inputSelector, value);
  }

  async clickStart() {
    await Promise.all([
      this.page.waitForTimeout(0), // yield to ensure click handler runs attached listeners
      this.page.click(this.btnSelector),
    ]);
  }

  async getErrorText() {
    return (await this.page.locator(this.errorSelector).innerText()).trim();
  }

  async getArrayDisplayText() {
    return (await this.page.locator(this.arrayDisplaySelector).innerText()).trim();
  }

  async isInputDisabled() {
    return await this.page.locator(this.inputSelector).isDisabled();
  }

  async isButtonDisabled() {
    return await this.page.locator(this.btnSelector).isDisabled();
  }

  async getStepCount() {
    return await this.page.locator(`${this.stepsSelector} .step`).count();
  }

  async getStepHeadingText(index = 0) {
    // index is 0-based step index
    const step = this.page.locator(`${this.stepsSelector} .step`).nth(index);
    return (await step.locator('h3').innerText()).trim();
  }

  async waitForStepHeadingContaining(text, options = {}) {
    await this.page.waitForFunction(
      (sel, t) => {
        const container = document.querySelector(sel);
        if (!container) return false;
        const steps = container.querySelectorAll('.step h3');
        return Array.from(steps).some(h => h.textContent && h.textContent.includes(t));
      },
      this.stepsSelector,
      text,
      options
    );
  }

  async waitForFinalSortedMessage(passesExpected, timeout = 15000) {
    // Wait for the final heading "Sorted array after all X passes:"
    const expected = `Sorted array after all ${passesExpected} passes:`;
    await this.page.waitForFunction(
      (sel, expectedText) => {
        const container1 = document.querySelector(sel);
        if (!container) return false;
        const headings = container.querySelectorAll('.step h3');
        return Array.from(headings).some(h => h.textContent && h.textContent.includes(expectedText));
      },
      this.stepsSelector,
      expected,
      { timeout }
    );
  }

  async waitForAnyStep(timeout = 10000) {
    await this.page.waitForFunction(
      (sel) => {
        const container2 = document.querySelector(sel);
        if (!container) return false;
        return container.querySelectorAll('.step').length > 0;
      },
      this.stepsSelector,
      { timeout }
    );
  }

  async countBucketsInStep(stepIndex = 0) {
    // returns total number of .bucket elements in the selected .step
    const step1 = this.page.locator(`${this.stepsSelector} .step1`).nth(stepIndex);
    return await step.locator('.bucket').count();
  }

  async getStepTextContent(stepIndex = 0) {
    const step2 = this.page.locator(`${this.stepsSelector} .step2`).nth(stepIndex);
    return (await step.innerText()).trim();
  }
}

// Test suite
test.describe('Radix Sort Visualization - e03a205e-cd32-11f0-a949-f901cf5609c9', () => {
  // Capture console error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on('pageerror', err => {
      pageErrors.push({
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
    });
  });

  test.afterEach(async ({}, testInfo) => {
    // Always include any console/page errors in test output for debugging
    if (consoleErrors.length > 0) {
      console.log('Captured console.error messages:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Captured page errors:', pageErrors);
    }
  });

  test('Initial load: page elements present and default states are correct', async ({ page }) => {
    // Purpose: Verify the page loads, the main controls exist and default state is as expected.
    const p = new RadixSortPage(page);
    await p.goto();

    // Basic title and accessibility
    await expect(page).toHaveTitle(/Radix Sort Visualization/);

    // Elements existence
    await expect(page.locator('#numberInput')).toBeVisible();
    await expect(page.locator('#sortBtn')).toBeVisible();
    await expect(page.locator('#errorMsg')).toBeVisible();
    await expect(page.locator('#arrayDisplay')).toBeVisible();
    await expect(page.locator('#steps')).toBeVisible();

    // Default states: no error text, arrayDisplay empty, steps empty, input/button enabled
    const errorText = await p.getErrorText();
    expect(errorText).toBe('', 'Expected no error message initially');

    const arrText = await p.getArrayDisplayText();
    expect(arrText).toBe('', 'Expected array display to be empty initially');

    const stepsCount = await p.getStepCount();
    expect(stepsCount).toBe(0);

    expect(await p.isInputDisabled()).toBe(false);
    expect(await p.isButtonDisabled()).toBe(false);

    // Assert there were no runtime errors or console errors during load
    expect(consoleErrors.length, 'No console.error messages on load').toBe(0);
    expect(pageErrors.length, 'No page errors on load').toBe(0);
  });

  test('Click Start without input shows validation error', async ({ page }) => {
    // Purpose: Ensure empty submissions are validated and a helpful error message is shown.
    const p1 = new RadixSortPage(page);
    await p.goto();

    // Click start with empty input
    await p.clickStart();

    // Expect error about entering at least one number
    await expect(page.locator('#errorMsg')).toHaveText('Please enter at least one number.');

    // Steps should remain empty
    expect(await p.getStepCount()).toBe(0);

    // No unexpected page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Invalid inputs (non-integer, negative, non-numeric) show proper validation', async ({ page }) => {
    // Purpose: Test validation for non-integer, negative, or NaN inputs.
    const p2 = new RadixSortPage(page);
    await p.goto();

    // Provide a mix of invalid values
    await p.fillInput('42, -5, 3.14, foo');

    await p.clickStart();

    // Should show the integer/non-negative validation message
    await expect(page.locator('#errorMsg')).toHaveText('All values must be non-negative integers.');

    // Should not produce steps
    expect(await p.getStepCount()).toBe(0);

    // No runtime exceptions (only user error message)
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Input with numbers >= 100 million shows size validation', async ({ page }) => {
    // Purpose: Ensure the application rejects numbers >= 100,000,000 per the app rules.
    const p3 = new RadixSortPage(page);
    await p.goto();

    // Provide a number equal to 100,000,000
    await p.fillInput('100000000');

    await p.clickStart();

    await expect(page.locator('#errorMsg')).toHaveText('Numbers should be less than 100 million for this demo.');

    // No steps should be created
    expect(await p.getStepCount()).toBe(0);

    // No page errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Successful radix sort visualization runs and updates DOM correctly', async ({ page }) => {
    // Purpose: Run a full successful example and verify key UI state changes and final result.
    const p4 = new RadixSortPage(page);
    await p.goto();

    // Input sample array from the placeholder
    const inputValue = '170,45,75,90,802,24,2,66';
    await p.fillInput(inputValue);

    // Start sorting
    await p.clickStart();

    // Immediately after click, UI should be disabled
    await expect(page.locator('#numberInput')).toBeDisabled();
    await expect(page.locator('#sortBtn')).toBeDisabled();

    // Wait for at least the first visualization step to appear (non-final)
    await p.waitForAnyStep(8000);

    // There should be at least one step now
    const stepsAfterStart = await p.getStepCount();
    expect(stepsAfterStart).toBeGreaterThan(0);

    // The first non-final step should include bucket elements
    const bucketCount = await p.countBucketsInStep(0);
    expect(bucketCount).toBeGreaterThanOrEqual(10); // there are 10 buckets (0-9) expected

    // The array display should be updated to show "Current array: [...]"
    const arrDisplay = await p.getArrayDisplayText();
    expect(arrDisplay.startsWith('Current array:'), 'Array display should show current array').toBe(true);

    // Determine expected number of passes: max digits of numbers in input: max is 802 -> 3 digits
    const expectedPasses = 3;

    // Wait for the final sorted message which the app appends after all passes
    await p.waitForFinalSortedMessage(expectedPasses, 20000);

    // Validate final step heading content and final array order
    const finalStepIndex = (await p.getStepCount()) - 1;
    const finalHeading = await p.getStepHeadingText(finalStepIndex);
    expect(finalHeading).toContain(`Sorted array after all ${expectedPasses} passes:`);

    // The final step text should contain the fully sorted array
    const finalStepText = await p.getStepTextContent(finalStepIndex);
    expect(finalStepText).toContain('[2, 24, 45, 66, 75, 90, 170, 802]');

    // After sorting completes, UI should be re-enabled
    await expect(page.locator('#numberInput')).toBeEnabled();
    await expect(page.locator('#sortBtn')).toBeEnabled();

    // No unexpected runtime errors or console.errors should have occurred during the process
    expect(consoleErrors.length, 'No console.error messages during sort').toBe(0);
    expect(pageErrors.length, 'No page errors during sort').toBe(0);
  });

  test('Accessibility and aria attributes are present for key elements', async ({ page }) => {
    // Purpose: Check presence of aria attributes used by the demo (aria-live, aria-labels)
    const p5 = new RadixSortPage(page);
    await p.goto();

    // The inputSection should have an aria-label
    await expect(page.locator('#inputSection')).toHaveAttribute('aria-label', /Input and controls for Radix Sort demo/);

    // The arrayDisplay and steps have aria-live attributes
    await expect(page.locator('#arrayDisplay')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#steps')).toHaveAttribute('aria-live', 'polite');

    // Bucket elements created during a run should have aria-label "Bucket X"
    // Trigger a quick minimal run with two small numbers so there are steps but runtime is short
    await p.fillInput('2,1');
    await p.clickStart();

    // Wait for any step to ensure buckets exist
    await p.waitForAnyStep(8000);

    // Verify at least one bucket element has aria-label set
    const bucketWithAria = await page.$('#steps .step .bucket[aria-label]');
    expect(bucketWithAria).not.toBeNull();

    // No console or page errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});