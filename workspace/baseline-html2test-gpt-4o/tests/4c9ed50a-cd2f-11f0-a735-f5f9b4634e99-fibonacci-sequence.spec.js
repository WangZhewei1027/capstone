import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed50a-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object representing the Fibonacci app
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#count');
    this.button = page.locator('button', { hasText: 'Generate' });
    this.result = page.locator('#result');
    this.title = page.locator('h1');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the numeric input to a value (string or number)
  async setCount(value) {
    // Use fill to ensure exact text; clear any pro forma value
    await this.input.fill(String(value));
  }

  // Click the Generate button
  async clickGenerate() {
    await this.button.click();
  }

  // Get the raw innerHTML of the result container
  async getResultInnerHTML() {
    return await this.result.evaluate((el) => el.innerHTML);
  }

  // Get visible text content of the result container
  async getResultText() {
    return await this.result.innerText();
  }

  // Get current value of input (string)
  async getCountValue() {
    return await this.input.inputValue();
  }

  // Press Enter key while focusing the input
  async pressEnterInInput() {
    await this.input.press('Enter');
  }
}

test.describe('Fibonacci Sequence Generator - UI and behavior tests', () => {
  // Hold console messages and page errors observed during each test
  let consoleMessages;
  let pageErrors;

  // Setup before each test: navigate, attach console and pageerror listeners
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // Teardown: nothing special to tear down here; Playwright will close page per test.
  test.afterEach(async () => {
    // No-op but kept to satisfy explicit setup/teardown requirement
  });

  test('Initial load: page structure, default input value, and empty result', async ({ page }) => {
    // Purpose: Verify initial DOM state before any interactions
    const app = new FibonacciPage(page);

    // Verify the main title is present and correct
    await expect(app.title).toHaveText('Fibonacci Sequence Generator');

    // Verify input exists and has default value '10'
    const val = await app.getCountValue();
    expect(val).toBe('10');

    // Verify the Generate button is visible and enabled
    await expect(app.button).toBeVisible();
    await expect(app.button).toBeEnabled();

    // Result container should be present but initially empty
    const initialInnerHTML = await app.getResultInnerHTML();
    expect(initialInnerHTML).toBe(''); // empty at load

    // Assert that no console errors or page errors occurred during initial load
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Click Generate with default value (10) produces correct 10-term Fibonacci sequence', async ({ page }) => {
    // Purpose: Verify main happy-path behavior for default count
    const app = new FibonacciPage(page);

    // Click generate button
    await app.clickGenerate();

    // Expected 10-term Fibonacci sequence
    const expected = '0, 1, 1, 2, 3, 5, 8, 13, 21, 34';
    const expectedInnerHTML = `<strong>Fibonacci Sequence:</strong> ${expected}`;

    // Verify the result container innerHTML matches exactly
    const resultInner = await app.getResultInnerHTML();
    expect(resultInner).toBe(expectedInnerHTML);

    // Also verify visible text contains the label and the expected numbers
    const visibleText = await app.getResultText();
    expect(visibleText).toContain('Fibonacci Sequence:');
    expect(visibleText).toContain('0, 1, 1, 2, 3, 5, 8, 13, 21, 34');

    // No console errors or page errors produced by generating
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Edge cases and various counts', () => {
    test('Count = 1 should produce a single 0', async ({ page }) => {
      // Purpose: Validate behavior when user requests 1 term
      const app = new FibonacciPage(page);

      await app.setCount(1);
      await app.clickGenerate();

      const expectedInnerHTML = `<strong>Fibonacci Sequence:</strong> 0`;
      expect(await app.getResultInnerHTML()).toBe(expectedInnerHTML);

      // Assert no runtime errors observed
      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMsgs.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Count = 2 should produce "0, 1"', async ({ page }) => {
      // Purpose: Validate behavior for the minimal sequence that includes 1
      const app = new FibonacciPage(page);

      await app.setCount(2);
      await app.clickGenerate();

      const expectedInnerHTML = `<strong>Fibonacci Sequence:</strong> 0, 1`;
      expect(await app.getResultInnerHTML()).toBe(expectedInnerHTML);

      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMsgs.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Count = 5 should produce "0, 1, 1, 2, 3"', async ({ page }) => {
      // Purpose: Validate a small common case
      const app = new FibonacciPage(page);

      await app.setCount(5);
      await app.clickGenerate();

      const expectedInnerHTML = `<strong>Fibonacci Sequence:</strong> 0, 1, 1, 2, 3`;
      expect(await app.getResultInnerHTML()).toBe(expectedInnerHTML);

      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMsgs.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Count = 0 should produce an empty sequence (label only)', async ({ page }) => {
      // Purpose: Test behavior below the input min boundary (user can still type 0)
      const app = new FibonacciPage(page);

      await app.setCount(0);
      await app.clickGenerate();

      // The implementation concatenates an empty join so there's a trailing space after the label
      const expectedInnerHTML = `<strong>Fibonacci Sequence:</strong> `;
      expect(await app.getResultInnerHTML()).toBe(expectedInnerHTML);

      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMsgs.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Large count (101) produces 101 terms (validate length, not full content)', async ({ page }) => {
      // Purpose: Ensure the algorithm scales to larger counts and returns the expected number of items
      const app = new FibonacciPage(page);

      await app.setCount(101);
      await app.clickGenerate();

      const inner = await app.getResultInnerHTML();

      // Extract the substring after the strong label and split by ', ' to count items
      const label = '<strong>Fibonacci Sequence:</strong> ';
      expect(inner.startsWith(label)).toBe(true);

      const numbersPart = inner.slice(label.length);
      const items = numbersPart.length === 0 ? [] : numbersPart.split(', ');
      expect(items.length).toBe(101);

      // No console errors or page errors
      const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoleMsgs.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test('Pressing Enter in the input does not trigger generation (no form submission)', async ({ page }) => {
    // Purpose: Ensure that pressing Enter doesn't implicitly submit or trigger Generate (there is no form)
    const app = new FibonacciPage(page);

    // Ensure result is empty to start
    expect(await app.getResultInnerHTML()).toBe('');

    // Set a small count and press Enter
    await app.setCount(3);
    await app.pressEnterInInput();

    // Because there is no form and no key handler, pressing Enter should not trigger the generation.
    // Confirm the result area remains unchanged (still empty)
    expect(await app.getResultInnerHTML()).toBe('');

    // Now click generate and verify expected output to show that clicking works
    await app.clickGenerate();
    expect(await app.getResultInnerHTML()).toBe('<strong>Fibonacci Sequence:</strong> 0, 1, 1');

    // No console errors or page errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Observe console and page error behavior during interactions', async ({ page }) => {
    // Purpose: Explicitly verify that no unhandled console errors or page errors occurred through a series of interactions
    const app = new FibonacciPage(page);

    // Perform multiple interactions
    await app.setCount(7);
    await app.clickGenerate();

    await app.setCount(2);
    await app.clickGenerate();

    await app.setCount(0);
    await app.clickGenerate();

    // After interactions, assert there were no console error messages or page errors.
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');

    // If there are errors, include their text in the failing assertion to help debugging
    expect(errorConsoleMsgs.length, `console errors: ${errorConsoleMsgs.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `page errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
  });
});