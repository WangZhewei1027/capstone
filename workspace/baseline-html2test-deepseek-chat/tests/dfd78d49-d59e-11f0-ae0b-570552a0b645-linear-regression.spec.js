import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d49-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Linear Regression app
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.calculateBtn = page.locator('button', { hasText: 'Calculate Regression' });
    this.addRandomBtn = page.locator('button', { hasText: 'Add 10 Random Points' });
    this.clearBtn = page.locator('button.clear');
    this.canvas = page.locator('#regressionCanvas');
    this.equation = page.locator('#equationDisplay');
    this.stats = page.locator('#statsDisplay');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickCalculate() {
    await this.calculateBtn.click();
  }

  async clickAddRandom() {
    await this.addRandomBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  // Click on canvas at coordinates relative to the element
  async clickCanvasAt(offsetX = 100, offsetY = 100) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    await this.page.mouse.click(x, y);
  }

  async getEquationText() {
    return (await this.equation.textContent())?.trim();
  }

  async getStatsHTML() {
    return (await this.stats.innerHTML()).trim();
  }

  async isCanvasVisible() {
    return await this.canvas.isVisible();
  }
}

test.describe('Linear Regression Visualization - dfd78d49-d59e-11f0-ae0b-570552a0b645', () => {
  // Arrays to collect console messages and page errors per test
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests will set up listeners so they can inspect errors/messages specifically.
  });

  // Test initial page load, presence of elements, and observe runtime errors triggered on load
  test('Initial load: UI elements are present and a runtime error due to recursion is observed', async ({ page }) => {
    // Collect console errors and page errors
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      // capture only error-level console messages
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      // capture Error objects thrown at page level
      pageErrors.push(err.message);
    });

    const app = new LinearRegressionPage(page);
    await app.goto();

    // Allow a short time for synchronous onload errors to surface
    await page.waitForTimeout(300);

    // Verify the main UI elements are present and visible
    await expect(app.heading).toHaveText('Linear Regression Visualization');
    await expect(app.calculateBtn).toBeVisible();
    await expect(app.addRandomBtn).toBeVisible();
    await expect(app.clearBtn).toBeVisible();
    await expect(app.canvas).toBeVisible();

    // The equation display should have the default initial text
    const eqText = await app.getEquationText();
    expect(eqText).toContain('Regression equation will appear here');

    // Because the implementation has initCanvas() calling redrawAll() and redrawAll() calling initCanvas(),
    // we expect a runtime error resulting from excessive recursion / maximum call stack exceeded.
    // Assert that at least one page error or console error indicating a call stack issue was observed.
    // Be tolerant of variations in error messages across browsers.
    const combinedErrors = [...pageErrors, ...consoleErrors].join(' | ').toLowerCase();

    const callStackRegex = /(maximum call stack size exceeded|maximum call stack|maximum call stack size|too much recursion|stack overflow|call stack)/i;
    expect(combinedErrors.length).toBeGreaterThan(0); // ensure we captured some error output
    expect(callStackRegex.test(combinedErrors)).toBeTruthy();
  });

  // Test clicking the "Calculate Regression" button when there are fewer than 2 points (edge case)
  test('Calculate Regression with fewer than 2 points shows helpful message', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    const app = new LinearRegressionPage(page);
    await app.goto();

    // Wait briefly for any initial errors to appear (they are expected based on recursion bug)
    await page.waitForTimeout(200);

    // Click Calculate Regression button - this calls calculateRegression directly and should update the equation display
    await app.clickCalculate();

    // After clicking, the application should set the equation display text to indicate need for at least 2 points.
    // Because calculateRegression checks points.length and returns early in this path, it should work despite other errors.
    const eqText = await app.getEquationText();
    expect(eqText).toContain('Need at least 2 points to calculate regression');

    // Ensure that the page errors array includes the recursion/stack error from initial load
    const combined = pageErrors.join(' | ').toLowerCase();
    const callStackRegex = /(maximum call stack size exceeded|maximum call stack|too much recursion|stack overflow|call stack)/i;
    expect(callStackRegex.test(combined)).toBeTruthy();
  });

  // Test that clicking on the canvas attempts to add a point and that the runtime error may be triggered again
  test('Clicking on the canvas triggers adding a point and is associated with runtime errors due to redraw recursion', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const app = new LinearRegressionPage(page);
    await app.goto();

    // Wait to ensure initial error(s) have occurred
    await page.waitForTimeout(200);

    // Clear captured errors so we can detect new ones caused by the canvas click
    pageErrors.length = 0;
    consoleErrors.length = 0;

    // Click near the center of the canvas to add a data point (this triggers points.push and redrawAll)
    await app.clickCanvasAt(400, 200);

    // Allow time for the click handler and any synchronous errors to surface
    await page.waitForTimeout(200);

    // After clicking, because redrawAll triggers initCanvas() again recursively, we expect at least one page error or console error.
    const combined = [...pageErrors, ...consoleErrors].join(' | ').toLowerCase();
    const callStackRegex = /(maximum call stack size exceeded|maximum call stack|too much recursion|stack overflow|call stack)/i;

    // At minimum, one of the error channels should contain a stack-related message
    expect(combined.length).toBeGreaterThan(0);
    expect(callStackRegex.test(combined)).toBeTruthy();
  });

  // Test the Clear All Points button behavior: it should attempt to clear internal state and reset displays,
  // but due to initCanvas recursion the UI reset may not complete. We assert either the UI reset OR that an error was raised.
  test('Clear All Points attempts to reset the UI; either resets or triggers recursion error', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));

    const app = new LinearRegressionPage(page);
    await app.goto();

    // Wait for initial errors to surface and clear them for a fresh check
    await page.waitForTimeout(200);
    pageErrors.length = 0;

    // Click the clear button
    await app.clickClear();

    // Allow event loop to process and surface any resulting errors
    await page.waitForTimeout(200);

    const eqText = await app.getEquationText();
    const statsHTML = await app.getStatsHTML();

    const callStackRegex = /(maximum call stack size exceeded|maximum call stack|too much recursion|stack overflow|call stack)/i;
    const combinedErrs = pageErrors.join(' | ').toLowerCase();

    // Two acceptable outcomes:
    // 1) The UI reset completed: equation display shows default text and stats are empty
    // 2) The recursion error occurred and was captured in pageErrors
    const uiReset = eqText.includes('Regression equation will appear here') && (statsHTML === '' || statsHTML === '<!-- Statistics will be populated here -->' || statsHTML.trim() === '');
    const errorOccurred = callStackRegex.test(combinedErrs);

    expect(uiReset || errorOccurred).toBeTruthy();
  });

  // Test that the "Add 10 Random Points" button is present and clickable - it will likely trigger recursion error,
  // but ensure the button exists and clicking it does not crash the test runner.
  test('Add 10 Random Points button exists and is clickable (click triggers behavior and likely runtime error)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));

    const app = new LinearRegressionPage(page);
    await app.goto();

    // Wait for initial errors
    await page.waitForTimeout(200);

    // Clear any existing captured errors to only observe those from this click
    pageErrors.length = 0;

    // Click the "Add 10 Random Points" button
    await app.clickAddRandom();

    // Wait a short time for the function to execute and any synchronous errors to surface
    await page.waitForTimeout(200);

    // Verify that the button remains visible and clickable (sanity)
    await expect(app.addRandomBtn).toBeVisible();

    // Confirm that clicking caused at least one page error related to the recursion/stack issue
    const combined = pageErrors.join(' | ').toLowerCase();
    const callStackRegex = /(maximum call stack size exceeded|maximum call stack|too much recursion|stack overflow|call stack)/i;
    expect(callStackRegex.test(combined)).toBeTruthy();
  });
});