import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a205f-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Linear Search demo
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = page.locator('#array-container');
    this.targetInput = page.locator('#target-input');
    this.searchBtn = page.locator('#search-btn');
    this.resultDiv = page.locator('#result');
    this.stepsDiv = page.locator('#steps');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getArrayItemsCount() {
    return await this.arrayContainer.locator('span').count();
  }

  async getArrayItemText(index) {
    return await this.arrayContainer.locator('span').nth(index).innerText();
  }

  async enterTarget(value) {
    await this.targetInput.fill(value);
  }

  async clickSearch() {
    await this.searchBtn.click();
  }

  async getResultText() {
    return (await this.resultDiv.innerText()).trim();
  }

  async getStepsText() {
    return (await this.stepsDiv.innerText()).trim();
  }

  // Returns true if any span has the highlight class
  async hasAnyHighlight() {
    const count = await this.arrayContainer.locator('span.highlight').count();
    return count > 0;
  }

  // Returns whether the element at index has highlight class
  async hasHighlightAt(index) {
    const span = this.arrayContainer.locator('span').nth(index);
    const classAttr = await span.getAttribute('class');
    return classAttr !== null && classAttr.split(' ').includes('highlight');
  }

  // Wait until result text includes the provided substring (with timeout)
  async waitForResultContains(substring, options = {}) {
    await this.page.waitForFunction(
      (sel, substr) => {
        const el = document.querySelector(sel);
        return el && el.innerText.includes(substr);
      },
      ['#result', substring],
      options
    );
  }

  // Wait until steps text contains substring
  async waitForStepsContains(substring, options = {}) {
    await this.page.waitForFunction(
      (sel, substr) => {
        const el1 = document.querySelector(sel);
        return el && el.innerText.includes(substr);
      },
      ['#steps', substring],
      options
    );
  }
}

test.describe('Linear Search Demonstration - e03a205f-cd32-11f0-a949-f901cf5609c9', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages
    page.on('console', msg => {
      // store console messages with type and text for assertions / debugging
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page before each test
    const lp = new LinearSearchPage(page);
    await lp.goto();
  });

  test.afterEach(async ({}, testInfo) => {
    // After each test, assert that there were no uncaught page errors.
    // This verifies the page loaded and ran without throwing exceptions.
    expect(pageErrors.length, `Unexpected page errors:\n${pageErrors.map(e => e.stack || e).join('\n')}`).toBe(0);

    // It's useful to ensure there were some console messages (at least the script execution logs),
    // but we do not require specific console output. We assert that consoleMessages is an array.
    expect(Array.isArray(consoleMessages)).toBe(true);

    // Attach console messages to test output for debugging if the test failed.
    if (testInfo.status !== testInfo.expectedStatus) {
      for (const msg of consoleMessages) {
        testInfo.attach(`${msg.type}-console`, { body: msg.text });
      }
    }
  });

  // Test initial page load and default state: array displayed, controls visible, no result/steps
  test('Initial page load shows array, input and button, and empty result/steps', async ({ page }) => {
    const lp1 = new LinearSearchPage(page);

    // Verify page title is present and correct-ish
    await expect(page.locator('h1')).toHaveText('Linear Search Demonstration');

    // Array should be displayed with the expected number of items (array length is 8)
    const count1 = await lp.getArrayItemsCount();
    expect(count).toBe(8);

    // Verify each array item contains a numeric value (basic sanity)
    for (let i = 0; i < count; i++) {
      const text = await lp.getArrayItemText(i);
      expect(text).toMatch(/^\d+$/);
    }

    // Input and button should be visible and enabled
    await expect(lp.targetInput).toBeVisible();
    await expect(lp.searchBtn).toBeVisible();
    await expect(lp.searchBtn).toBeEnabled();

    // Result and steps should be empty on initial load
    const resultText = await lp.getResultText();
    expect(resultText).toBe('', 'Result div should be empty initially');

    const stepsText = await lp.getStepsText();
    expect(stepsText).toBe('', 'Steps div should be empty initially');

    // Accessibility check: input has aria-label
    expect(await lp.targetInput.getAttribute('aria-label')).toBe('Target value to search');
  });

  // Test searching for an existing value (first occurrence)
  test('Search finds an existing target and highlights the found index (first occurrence)', async ({ page }) => {
    const lp2 = new LinearSearchPage(page);

    // Target '32' is present in the array at index 3 (first occurrence)
    await lp.enterTarget('32');

    // Trigger search
    await lp.clickSearch();

    // Wait for the result text to indicate found at index 3.
    // The implementation uses asynchronous delays of 1s per checked element.
    // Allow enough time for the demo to run; wait for specific result text.
    await lp.waitForResultContains('Result: Target 32 found at index 3.', { timeout: 10000 });

    const result = await lp.getResultText();
    expect(result).toContain('Result: Target 32 found at index 3.');

    // Steps should include the "Found target 32 at index 3." entry
    expect(await lp.getStepsText()).toContain('Found target 32 at index 3.');

    // The span at index 3 should have the highlight class because displayArray(i) was called with i=3
    expect(await lp.hasHighlightAt(3)).toBe(true);

    // Ensure there is at least one console message (script ran)
    expect(consoleMessages.length).toBeGreaterThan(0);
  });

  // Test searching for a non-existing value (should exhaust the array)
  test('Search for a non-existing target updates steps and shows not found result and no highlights', async ({ page }) => {
    const lp3 = new LinearSearchPage(page);

    // Use a target that does not exist in the array
    await lp.enterTarget('999');

    // Start search
    await lp.clickSearch();

    // Wait for the final not-found result text. Allow enough time for the demo to iterate all elements.
    await lp.waitForResultContains('Result: Target 999 not found in the array.', { timeout: 20000 });

    const result1 = await lp.getResultText();
    expect(result).toBe('Result: Target 999 not found in the array.');

    // Steps should include a 'not found' message
    expect(await lp.getStepsText()).toContain('Target 999 not found in the array.');

    // After a not-found search, displayArray(-1) is called, so there should be no highlight classes
    expect(await lp.hasAnyHighlight()).toBe(false);
  });

  // Test edge case: clicking Search with empty input should show an alert and not start searching
  test('Clicking Search with empty input triggers alert dialog and prevents search', async ({ page }) => {
    const lp4 = new LinearSearchPage(page);

    // Ensure input is empty
    await lp.enterTarget('');

    // Listen for dialog and assert its message
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click search; should trigger alert
    await lp.clickSearch();

    // Wait briefly to ensure alert was handled
    await page.waitForTimeout(200);

    expect(dialogMessage).toBe('Please enter a target value to search for.');

    // After dismissing alert, result and steps should remain empty (no search started)
    expect(await lp.getResultText()).toBe('');
    expect(await lp.getStepsText()).toBe('');
  });

  // Test that the step-by-step output updates as the algorithm checks array elements
  test('Steps area updates incrementally during a search', async ({ page }) => {
    const lp5 = new LinearSearchPage(page);

    // Choose a target that will be found at index 2 (value 23)
    await lp.enterTarget('23');

    // Start listening for incremental changes: after clicking, the steps area should first show "Checking index 0"
    await lp.clickSearch();

    // The first check message should appear quickly (within 2 seconds)
    await lp.waitForStepsContains('Checking index 0: value', { timeout: 3000 });
    expect((await lp.getStepsText()).includes('Checking index 0: value')).toBe(true);

    // Later, eventually the found message for index 2 should appear; allow time
    await lp.waitForStepsContains('Found target 23 at index 2.', { timeout: 10000 });
    expect(await lp.getStepsText()).toContain('Found target 23 at index 2.');

    // Confirm result text also reflects the found index 2
    expect(await lp.getResultText()).toContain('Result: Target 23 found at index 2.');
  });
});