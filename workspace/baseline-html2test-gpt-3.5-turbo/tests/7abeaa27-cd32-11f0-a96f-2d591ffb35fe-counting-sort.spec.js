import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa27-cd32-11f0-a96f-2d591ffb35fe.html';

// Simple page object to encapsulate interactions with the Counting Sort page
class CountingSortPage {
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.sortBtn = page.locator('#sortBtn');
    this.errorMsg = page.locator('#errorMsg');
    this.output = page.locator('#output');
    this.stepItems = page.locator('#output .step');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.input.fill(value);
  }

  async clickSort() {
    await this.sortBtn.click();
  }

  async getErrorText() {
    return (await this.errorMsg.textContent()) || '';
  }

  async getOutputText() {
    return (await this.output.textContent()) || '';
  }

  async getStepCount() {
    return await this.stepItems.count();
  }

  async getStepText(index) {
    // index is 0-based
    const step = this.stepItems.nth(index);
    return (await step.textContent()) || '';
  }

  async isOutputVisible() {
    return await this.output.isVisible();
  }
}

// Group related tests
test.describe('Counting Sort Visualization - end-to-end', () => {
  // We'll collect console errors and page errors during each test and assert none occurred.
  let consoleErrors;
  let pageErrors;

  // Setup and teardown for each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and capture error-level messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });
  });

  // After each test, assert that there were no console or page errors emitted.
  test.afterEach(async () => {
    // If there were console errors or page errors, make the assertion fail with helpful diagnostics.
    expect(consoleErrors, `Console error(s) were emitted during the test: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    expect(pageErrors, `Page error(s) were emitted during the test: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
  });

  test('Initial page load shows correct default state and elements', async ({ page }) => {
    // Purpose: Verify the page loads and the main interactive elements are present and in expected default state.
    const cp = new CountingSortPage(page);
    await cp.goto();

    // Title should be present in the document
    await expect(page).toHaveTitle(/Counting Sort Demonstration/);

    // Input and button should be visible
    await expect(cp.input).toBeVisible();
    await expect(cp.sortBtn).toBeVisible();

    // Input placeholder should match example hint
    await expect(cp.input).toHaveAttribute('placeholder', 'e.g. 4, 2, 2, 8, 3, 3, 1');

    // Error message should be empty
    const errText = await cp.getErrorText();
    expect(errText).toBe('');

    // Output area should be visible but empty
    await expect(cp.output).toBeVisible();
    const outText = await cp.getOutputText();
    expect(outText.trim()).toBe('');
  });

  test('Sorting a typical comma-separated array produces 6 steps and correct sorted output', async ({ page }) => {
    // Purpose: Validate that a standard input array is processed and the displayed steps include the expected final sorted array.
    const cp1 = new CountingSortPage(page);
    await cp.goto();

    const input = '4, 2, 2, 8, 3, 3, 1';
    await cp.setInput(input);
    await cp.clickSort();

    // The application produces 6 visualization steps
    const stepCount = await cp.getStepCount();
    expect(stepCount).toBe(6);

    // Step 1 should contain the original array
    const step1 = await cp.getStepText(0);
    expect(step1).toContain('Original Array');
    expect(step1).toContain('[ 4, 2, 2, 8, 3, 3, 1 ]');

    // Step 5 (index 4) should show the sorted output
    const step5 = await cp.getStepText(4);
    expect(step5).toContain('Build Sorted Output');
    expect(step5).toContain('[ 1, 2, 2, 3, 3, 4, 8 ]');

    // Final step text should show final sorted array as well
    const step6 = await cp.getStepText(5);
    expect(step6).toContain('Final Sorted Array');
    expect(step6).toContain('[ 1, 2, 2, 3, 3, 4, 8 ]');

    // Output DOM should contain 6 .step elements
    await expect(cp.stepItems).toHaveCount(6);
  });

  test('Sorting space-separated input yields correct sorted result', async ({ page }) => {
    // Purpose: Ensure that the parser accepts spaces as separators and sorts correctly.
    const cp2 = new CountingSortPage(page);
    await cp.goto();

    const input1 = '5 3 5 1';
    await cp.setInput(input);
    await cp.clickSort();

    const stepCount1 = await cp.getStepCount();
    expect(stepCount).toBe(6); // still produces the 6-step visualization

    // Final sorted array should be [1, 3, 5, 5]
    const final = await cp.getStepText(5);
    expect(final).toContain('[ 1, 3, 5, 5 ]');
  });

  test('Empty input triggers validation error and no steps are displayed', async ({ page }) => {
    // Purpose: Validate form-level validation for empty input.
    const cp3 = new CountingSortPage(page);
    await cp.goto();

    await cp.setInput('');
    await cp.clickSort();

    // Expect a specific error message
    const err = await cp.getErrorText();
    expect(err).toBe('Please enter at least one integer.');

    // Output should remain empty (no steps)
    const stepCount2 = await cp.getStepCount();
    expect(stepCount).toBe(0);
    const outText1 = await cp.getOutputText();
    expect(outText.trim()).toBe('');
  });

  test('Non-integer input triggers "Invalid input" error', async ({ page }) => {
    // Purpose: Ensure that non-integer tokens are rejected by the parser and produce an error message.
    const cp4 = new CountingSortPage(page);
    await cp.goto();

    await cp.setInput('1, 2, a, 3');
    await cp.clickSort();

    const err1 = await cp.getErrorText();
    expect(err).toBe('Invalid input: only integers are allowed.');

    // No steps should be produced
    expect(await cp.getStepCount()).toBe(0);
  });

  test('Large range input triggers range-too-large error', async ({ page }) => {
    // Purpose: Validate the guard that prevents huge ranges from being visualized.
    const cp5 = new CountingSortPage(page);
    await cp.goto();

    // This input has max - min = 100001 which should trigger the range-too-large error
    await cp.setInput('0 100001');
    await cp.clickSort();

    const err2 = await cp.getErrorText();
    expect(err).toBe('Range too large for counting sort visualization. Max - min should be <= 100000.');

    // No steps should be produced
    expect(await cp.getStepCount()).toBe(0);
  });

  test('Whitespace and extra commas are handled (robust parsing)', async ({ page }) => {
    // Purpose: Ensure parsing tolerates extra whitespace and separators.
    const cp6 = new CountingSortPage(page);
    await cp.goto();

    await cp.setInput('  7,   ,  2  ,  2 ,, 9 ');
    await cp.clickSort();

    // The parser filters out empty tokens; invalid tokens like empty entries don't cause invalid integer errors
    // But since there are empty tokens, they should be filtered; valid integers are 7,2,2,9 -> sorted [2,2,7,9]
    const final1 = await cp.getStepText(5);
    expect(final).toContain('[ 2, 2, 7, 9 ]');
  });

  test('UI updates are reflected in the DOM (visual step divs have expected structure)', async ({ page }) => {
    // Purpose: Validate that each step element uses the .step class and contains a strong element indicating the step title.
    const cp7 = new CountingSortPage(page);
    await cp.goto();

    await cp.setInput('3,1,2');
    await cp.clickSort();

    // There should be 6 step divs
    await expect(cp.stepItems).toHaveCount(6);

    // Each step should have content that starts with 'Step X:'
    const count = await cp.getStepCount();
    for (let i = 0; i < count; i++) {
      const stepHandle = cp.stepItems.nth(i);
      const text = (await stepHandle.textContent()) || '';
      expect(text).toContain(`Step ${i + 1}:`);
    }
  });
});