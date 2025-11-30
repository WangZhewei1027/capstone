import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed510-cd2f-11f0-a735-f5f9b4634e99.html';

// Page object model for the Sliding Window page
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    // Attach listeners to collect console and page errors for assertions
    this.page.on('console', msg => {
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', err => {
      // Collect uncaught exceptions
      this.pageErrors.push(err);
    });
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getTitleText() {
    return this.page.textContent('h1');
  }

  async arrayInputSelector() {
    return '#array-input';
  }

  async windowSizeSelector() {
    return '#window-size';
  }

  async calculateButton() {
    // button has inline onclick attribute. Select by text content
    return this.page.locator('button', { hasText: 'Calculate Max' });
  }

  async setArray(value) {
    await this.page.fill('#array-input', value);
  }

  async setWindowSize(value) {
    // value should be string
    await this.page.fill('#window-size', value);
  }

  async clickCalculate() {
    await this.page.click('button:has-text("Calculate Max")');
  }

  async getResultInnerText() {
    return this.page.textContent('#result');
  }

  async getWindowDivs() {
    return this.page.locator('#result .window');
  }

  async getSummaryDiv() {
    return this.page.locator('#result .summary');
  }

  getConsoleMessages() {
    return this.consoleMessages;
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Sliding Window Example - Functional tests', () => {
  // Use a fresh page for each test and instantiate the page object
  test.beforeEach(async ({ page }) => {
    // Nothing here; individual tests will construct the page object and navigate
  });

  // Test initial page load and default state
  test('Initial page load shows heading, inputs, defaults, and result placeholder', async ({ page }) => {
    const p = new SlidingWindowPage(page);
    await p.goto();

    // Verify heading is present
    const title = await p.getTitleText();
    expect(title).toBe('Sliding Window Example');

    // Verify inputs exist and have expected defaults
    const arrayValue = await page.inputValue('#array-input');
    expect(arrayValue).toBe(''); // default empty

    const windowSizeValue = await page.inputValue('#window-size');
    expect(windowSizeValue).toBe('1'); // default value is 1

    // Verify result placeholder text
    const resultText = await p.getResultInnerText();
    expect(resultText.trim()).toBe('Result will be displayed here...');

    // Ensure no uncaught page errors occurred during load
    expect(p.getPageErrors().length).toBe(0);
  });

  // Test a normal calculation: verifies windows, max values and DOM updates
  test('Calculates sliding window maxima for a typical input and updates DOM accordingly', async ({ page }) => {
    const p = new SlidingWindowPage(page);
    await p.goto();

    // Provide input array and window size
    await p.setArray('1,3,2,5,4');
    await p.setWindowSize('3');

    // Click calculate and wait for DOM updates
    await p.clickCalculate();

    // There should be 3 window divs for array length 5 and window size 3
    const windowDivs = p.getWindowDivs();
    await expect(windowDivs).toHaveCount(3);

    // Verify each window's text content and max values
    const windowTexts = [];
    for (let i = 0; i < 3; i++) {
      windowTexts.push(await windowDivs.nth(i).textContent());
    }
    // Expected windows and maxima:
    // Window 1: 1,3,2 → Max: 3
    // Window 2: 3,2,5 → Max: 5
    // Window 3: 2,5,4 → Max: 5
    expect(windowTexts[0]).toContain('Window 1: 1,3,2');
    expect(windowTexts[0]).toContain('Max: 3');

    expect(windowTexts[1]).toContain('Window 2: 3,2,5');
    expect(windowTexts[1]).toContain('Max: 5');

    expect(windowTexts[2]).toContain('Window 3: 2,5,4');
    expect(windowTexts[2]).toContain('Max: 5');

    // Summary div should show the maxima list
    const summary = p.getSummaryDiv();
    await expect(summary).toBeVisible();
    await expect(summary).toHaveText('Max of each window: 3, 5, 5');

    // Ensure no uncaught page errors occurred during the interaction
    expect(p.getPageErrors().length).toBe(0);

    // Check console messages were produced but not errors (if any)
    const consoles = p.getConsoleMessages();
    // The app itself doesn't log by default, but ensure console did not capture errors
    const consoleErrors = consoles.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test edge-case: empty array input results in NaN behavior in current implementation
  test('Empty array input produces NaN window and summary reflecting NaN (verifies current behavior)', async ({ page }) => {
    const p = new SlidingWindowPage(page);
    await p.goto();

    // Leave array input empty and ensure window-size is 1
    await p.setArray('');
    await p.setWindowSize('1');
    await p.clickCalculate();

    // Expect a window div to be created containing 'NaN' (implementation-specific behavior)
    const windowDivs = p.getWindowDivs();
    await expect(windowDivs).toHaveCount(1);
    const text = await windowDivs.nth(0).textContent();
    expect(text).toContain('Window 1: NaN');
    expect(text).toContain('Max: NaN');

    // Summary will include NaN as well
    await expect(p.getSummaryDiv()).toHaveText('Max of each window: NaN');

    // No uncaught errors should occur from this operation
    expect(p.getPageErrors().length).toBe(0);
  });

  // Test invalid window-size (blank) triggers the explicit invalid input branch
  test('Blank window size input triggers validation message "Invalid input..."', async ({ page }) => {
    const p = new SlidingWindowPage(page);
    await p.goto();

    // Provide a valid-looking array but clear the window size to produce NaN
    await p.setArray('1,2,3');
    await p.setWindowSize(''); // this will parseInt('') => NaN and should trigger the invalid input message

    await p.clickCalculate();

    // The result div should contain the explicit validation message
    const resultText = await p.getResultInnerText();
    expect(resultText.trim()).toBe('Invalid input. Please enter a valid array and window size.');

    // Ensure no .window elements were created
    const windowDivs = p.getWindowDivs();
    await expect(windowDivs).toHaveCount(0);

    // Ensure no uncaught page errors occurred during validation
    expect(p.getPageErrors().length).toBe(0);
  });

  // Test when window size is larger than array length: no window operations, but summary is appended
  test('Window size larger than array length produces empty maxima summary', async ({ page }) => {
    const p = new SlidingWindowPage(page);
    await p.goto();

    await p.setArray('1,2,3');
    await p.setWindowSize('5'); // bigger than array length
    await p.clickCalculate();

    // No window divs should be created
    const windowDivs = p.getWindowDivs();
    await expect(windowDivs).toHaveCount(0);

    // But summary div is still appended with empty list after colon and space
    const summary = p.getSummaryDiv();
    await expect(summary).toBeVisible();
    const summaryText = await summary.textContent();
    expect(summaryText).toBe('Max of each window: ');

    // Sanity checks: button remains enabled and visible (accessibility / interactability)
    const button = p.calculateButton();
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // No uncaught page errors
    expect(p.getPageErrors().length).toBe(0);
  });
});

test.describe('Sliding Window Example - Console and error observation tests', () => {
  // This describe block focuses on collecting console messages and page errors during interactions

  test('No uncaught page errors or console error messages during multiple interactions', async ({ page }) => {
    const p = new SlidingWindowPage(page);
    await p.goto();

    // Sequence of interactions to exercise different branches
    await p.setArray('4,8,1,7');
    await p.setWindowSize('2');
    await p.clickCalculate();

    await p.setArray('');
    await p.setWindowSize('1');
    await p.clickCalculate();

    await p.setArray('10,9');
    await p.setWindowSize(''); // invalid
    await p.clickCalculate();

    // Collect any page errors and console errors
    const pageErrors = p.getPageErrors();
    const consoleMsgs = p.getConsoleMessages();

    // Assert that there were no uncaught exceptions (ReferenceError, TypeError, etc.)
    // If the environment or implementation produces such errors, this assertion will fail and surface them.
    expect(pageErrors.length).toBe(0);

    // Filter console messages for error-level entries
    const consoleErrors = consoleMsgs.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});