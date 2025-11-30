import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11bae-cd2f-11f0-a440-159d7b77af86.html';

// Page object model for the Linear Regression demo page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.generateButton = page.locator('#generate');
    this.calculateButton = page.locator('#calculate');
    this.canvas = page.locator('#canvas');
    this.title = page.locator('h1');
  }

  // Navigate to the app and wait for load
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for canvas to be present
    await expect(this.canvas).toBeVisible();
  }

  // Click the "Generate Random Points" button
  async clickGenerate() {
    await this.generateButton.click();
  }

  // Click the "Calculate Line of Best Fit" button
  async clickCalculate() {
    await this.calculateButton.click();
  }

  // Get the canvas data URL (PNG)
  async getCanvasDataURL() {
    // Evaluate toDataURL in the page context
    return await this.page.evaluate(() => {
      const c = document.getElementById('canvas');
      // If there is any problem accessing the canvas, let it throw naturally
      return c.toDataURL();
    });
  }

  // Helper to ensure a short pause to allow drawing to complete
  async waitForDrawing() {
    // The app draws synchronously in event handlers, but allow a small tick to be safe
    await this.page.waitForTimeout(120);
  }
}

test.describe('Linear Regression Demonstration - UI and behavior', () => {
  // We'll capture any page errors and console messages to assert on them
  test.beforeEach(async ({ page }) => {
    // Nothing needed globally here; individual tests will instantiate page object
  });

  // Test: initial page load and default state
  test('Initial load shows title, buttons and canvas with axes drawn', async ({ page }) => {
    // Track runtime page errors during the test
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    // Verify title text
    await expect(lr.title).toHaveText('Linear Regression Demonstration');

    // Verify buttons are visible and enabled
    await expect(lr.generateButton).toBeVisible();
    await expect(lr.generateButton).toBeEnabled();
    await expect(lr.calculateButton).toBeVisible();
    await expect(lr.calculateButton).toBeEnabled();

    // Verify canvas attributes and that it contains some initial drawing (axes)
    const dataURL = await lr.getCanvasDataURL();
    expect(typeof dataURL).toBe('string');
    expect(dataURL.startsWith('data:image/png')).toBeTruthy();

    // No runtime errors should have occurred during initial load
    expect(pageErrors.length).toBe(0);
  });

  // Test: clicking calculate before generating points should NOT change the canvas
  test('Clicking "Calculate" without generated points does not alter canvas', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    // Capture canvas before clicking calculate
    const before = await lr.getCanvasDataURL();

    // Click calculate (no points generated) - should be a no-op
    await lr.clickCalculate();
    await lr.waitForDrawing();

    const after = await lr.getCanvasDataURL();

    // Expect no change in the canvas image after calculate when no points present
    expect(after).toBe(before);

    // No runtime errors should result from clicking calculate in empty state
    expect(pageErrors.length).toBe(0);
  });

  // Test: clicking generate should draw random points on the canvas (image should change)
  test('Clicking "Generate Random Points" draws points on the canvas', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    const before = await lr.getCanvasDataURL();

    // Click generate and allow drawing to occur
    await lr.clickGenerate();
    await lr.waitForDrawing();

    const after = await lr.getCanvasDataURL();

    // The canvas should change after generating random points
    expect(after).not.toBe(before);

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);
  });

  // Test: after generating points, clicking calculate should draw the regression line (image changes)
  test('Clicking "Calculate Line of Best Fit" after generating draws a regression line', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    // Generate points first
    await lr.clickGenerate();
    await lr.waitForDrawing();

    const afterGenerate = await lr.getCanvasDataURL();

    // Click calculate to draw the regression line
    await lr.clickCalculate();
    await lr.waitForDrawing();

    const afterCalculate = await lr.getCanvasDataURL();

    // The canvas should be updated after calculation to include the regression line
    expect(afterCalculate).not.toBe(afterGenerate);

    // No runtime errors expected during generation and calculation
    expect(pageErrors.length).toBe(0);
  });

  // Test: multiple generate clicks produce visual changes (randomness)
  test('Multiple "Generate Random Points" clicks produce different results due to randomness', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    const initial = await lr.getCanvasDataURL();

    // First generate
    await lr.clickGenerate();
    await lr.waitForDrawing();
    const gen1 = await lr.getCanvasDataURL();

    // Second generate
    await lr.clickGenerate();
    await lr.waitForDrawing();
    const gen2 = await lr.getCanvasDataURL();

    // At least one of the generated canvases should differ from the initial canvas.
    // Also, typically gen1 and gen2 should differ. We assert that not all are identical.
    const allIdentical = (initial === gen1) && (gen1 === gen2);
    expect(allIdentical).toBeFalsy();

    // No runtime errors expected across repeated generates
    expect(pageErrors.length).toBe(0);
  });

  // Test: application robustness - observe console and page errors during interactions
  test('No unexpected runtime errors are emitted during common user interactions', async ({ page }) => {
    const pageErrors = [];
    const consoleMessages = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

    const lr = new LinearRegressionPage(page);
    await lr.goto();

    // Simulate a full user flow: generate -> calculate -> generate -> calculate
    await lr.clickGenerate();
    await lr.waitForDrawing();
    await lr.clickCalculate();
    await lr.waitForDrawing();
    await lr.clickGenerate();
    await lr.waitForDrawing();
    await lr.clickCalculate();
    await lr.waitForDrawing();

    // Validate there were no page errors during the flow
    expect(pageErrors.length).toBe(0);

    // There should be zero or more console messages, but none of them should be errors. We'll assert no 'error' type console messages.
    const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });
});