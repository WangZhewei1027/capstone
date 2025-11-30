import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf8-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object Model for the Insertion Sort page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.barContainerSelector = '#bar-container';
    this.barSelector = '.bar';
    this.startButtonSelector = '#start-button';
    this.headerSelector = 'h1';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getHeaderText() {
    return this.page.textContent(this.headerSelector);
  }

  async getStartButton() {
    return this.page.locator(this.startButtonSelector);
  }

  async clickStart() {
    await this.page.click(this.startButtonSelector);
  }

  // Returns array of bar text values as numbers, in DOM order
  async getBarValues() {
    return this.page.$$eval(this.barSelector, bars => bars.map(b => Number(b.textContent.trim())));
  }

  // Returns array of CSS heights (e.g. "150px")
  async getBarHeights() {
    return this.page.$$eval(this.barSelector, bars => bars.map(b => b.style.height));
  }

  // Returns count of bars
  async getBarCount() {
    return this.page.$$eval(this.barSelector, bs => bs.length);
  }

  // Wait until the bars' text contents equal expected array (numbers)
  async waitForBarValues(expectedValues, timeout = 10000) {
    await this.page.waitForFunction(
      (sel, expected) => {
        const bars = Array.from(document.querySelectorAll(sel));
        if (bars.length !== expected.length) return false;
        const values = bars.map(b => Number(b.textContent.trim()));
        return expected.every((v, i) => values[i] === v);
      },
      this.barSelector,
      expectedValues,
      { timeout }
    );
  }
}

test.describe('Insertion Sort Visualization - Integration Tests', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen for console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', error => {
      // capture the error message string
      pageErrors.push(String(error.message || error));
    });
  });

  test.afterEach(async () => {
    // Nothing to teardown beyond Playwright's built-in cleanup.
    // But we keep listeners local to the test via beforeEach scope variables.
  });

  test('Initial page load shows header, start button, and 5 bars with correct values and heights', async ({ page }) => {
    // Test purpose: Validate initial render state and bar properties before any interaction.
    const app = new InsertionSortPage(page);
    await app.goto();

    // Verify header text
    const header = await app.getHeaderText();
    expect(header).toContain('Insertion Sort Visualization');

    // Verify start button is visible and has correct label
    const startBtn = await app.getStartButton();
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toHaveText('Start Sort');

    // Verify there are 5 bars initially
    const count = await app.getBarCount();
    expect(count).toBe(5);

    // Verify bar values and heights match the initial array [5,3,8,4,2]
    const expectedValues = [5, 3, 8, 4, 2];
    const barValues = await app.getBarValues();
    expect(barValues).toEqual(expectedValues);

    const barHeights = await app.getBarHeights();
    // Each height should equal value * 30 + 'px'
    const expectedHeights = expectedValues.map(v => `${v * 30}px`);
    expect(barHeights).toEqual(expectedHeights);

    // Verify no page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
    // No console errors logged
    const consoleErrorCount = consoleMessages.filter(m => m.type === 'error').length;
    expect(consoleErrorCount).toBe(0);
  });

  test('Clicking Start Sort produces an intermediate update after the first step and final sorted order', async ({ page }) => {
    // Test purpose:
    // 1) Verify that after clicking the Start Sort button, the first visual update occurs (insertion of 3).
    // 2) Verify that after the sort completes, the bars are in sorted order [2,3,4,5,8].
    const app = new InsertionSortPage(page);
    await app.goto();

    // Start the sorting process
    await app.clickStart();

    // The algorithm's first inner loop step occurs after ~500ms.
    // Wait for a slightly longer time and assert the intermediate state [3,5,8,4,2].
    await app.waitForBarValues([3, 5, 8, 4, 2], 2000);
    const midValues = await app.getBarValues();
    expect(midValues).toEqual([3, 5, 8, 4, 2]);

    // Now wait for the final sorted order to appear.
    // As calculated, the total visualization sleep will be 7 * 500ms = 3500ms,
    // so allow a reasonable timeout for the entire sort to finish.
    await app.waitForBarValues([2, 3, 4, 5, 8], 10000);
    const finalValues = await app.getBarValues();
    expect(finalValues).toEqual([2, 3, 4, 5, 8]);

    // Verify final heights correspond to sorted values
    const finalHeights = await app.getBarHeights();
    const expectedFinalHeights = [2, 3, 4, 5, 8].map(v => `${v * 30}px`);
    expect(finalHeights).toEqual(expectedFinalHeights);

    // Verify that the Start Sort button remains visible (the implementation does not disable it)
    await expect(app.getStartButton()).toBeVisible();

    // Ensure no uncaught page errors were generated during the sorting process
    expect(pageErrors.length).toBe(0);

    // Ensure no console errors were logged during the sorting process
    const consoleErrorCount = consoleMessages.filter(m => m.type === 'error').length;
    expect(consoleErrorCount).toBe(0);

    // Also assert that some console messages (if any) were captured (not required but informative)
    // We don't require specific console output, just ensure capturing is working.
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Clicking Start Sort multiple times does not throw uncaught exceptions', async ({ page }) => {
    // Test purpose: Exercise the start button more than once to ensure repeated clicks do not cause runtime errors.
    const app = new InsertionSortPage(page);
    await app.goto();

    // Click start, then click again shortly after to attempt overlapping runs
    await app.clickStart();
    // Click again after a short delay (simulate user impatience)
    await page.waitForTimeout(100);
    await app.clickStart();

    // Wait for final sorted state to appear to ensure the algorithm ran to completion at least once
    await app.waitForBarValues([2, 3, 4, 5, 8], 12000);
    const finalValues = await app.getBarValues();
    expect(finalValues).toEqual([2, 3, 4, 5, 8]);

    // Ensure no uncaught exceptions surfaced as page errors
    expect(pageErrors.length).toBe(0);
    // Ensure no console errors were logged
    const consoleErrorCount = consoleMessages.filter(m => m.type === 'error').length;
    expect(consoleErrorCount).toBe(0);
  });

  test('Accessibility basics: start button is reachable and has accessible name', async ({ page }) => {
    // Test purpose: Basic accessibility check for the Start Sort button presence and label.
    const app = new InsertionSortPage(page);
    await app.goto();

    const startBtn = await app.getStartButton();

    // Button should be enabled and have the accessible name 'Start Sort'
    await expect(startBtn).toBeEnabled();
    await expect(startBtn).toHaveText('Start Sort');

    // Ensure the button is reachable via keyboard (focusable)
    await startBtn.focus();
    const focused = await page.evaluate(() => document.activeElement.id);
    expect(focused).toBe('start-button');

    // No page errors should have occurred
    expect(pageErrors.length).toBe(0);
  });
});