import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6d1-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object Model for the Linear Regression Demo page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#plot');
    this.btnClear = page.locator('#btnClear');
    this.btnRandom = page.locator('#btnRandom');
    this.resultDiv = page.locator('#result');
    this.equationDiv = page.locator('#equation');
    this.instructions = page.locator('#instructions');
    this.clearTip = page.locator('#clearTip');
    this.container = page.locator('#container');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
    // Ensure canvas is rendered
    await expect(this.canvas).toBeVisible();
  }

  // Click at an offset inside the canvas relative to the canvas top-left
  // offsetX/offsetY are pixels from canvas top-left
  async clickCanvasAtOffset(offsetX, offsetY) {
    const bbox = await this.canvas.boundingBox();
    if (!bbox) throw new Error('Canvas bounding box not available');
    const x = bbox.x + offsetX;
    const y = bbox.y + offsetY;
    await this.page.mouse.click(x, y);
  }

  // Convenience: click somewhere safely inside the plotting area (margin is 50 in the app)
  async clickInsidePlot() {
    // margin = 50, choose offset 60,60 to be inside
    await this.clickCanvasAtOffset(60, 60);
  }

  // Click somewhere near the right-middle of the plotting region
  async clickAnotherInsidePlot() {
    // Choose offset well inside margins: width is 700, margin 50 => internal width ~600
    // Choose offset around 300, 200
    await this.clickCanvasAtOffset(300, 200);
  }

  // Click outside plotting area (e.g., within canvas but inside margin margin area or outside)
  async clickOutsidePlotLeft() {
    // Click inside canvas but left of margin (margin = 50)
    await this.clickCanvasAtOffset(10, 100);
  }

  async clickRandomButton() {
    await this.btnRandom.click();
  }

  async clickClearButton() {
    await this.btnClear.click();
  }
}

test.describe('Linear Regression Demo - Interactive behaviors and UI validations', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture any page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages with type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });
  });

  // Test initial page load and default state of UI elements
  test('Initial load: page structure, instructions and default messages are correct', async ({ page }) => {
    const app = new LinearRegressionPage(page);
    await app.goto();

    // Verify heading is present inside container
    await expect(app.container.locator('h1')).toHaveText('Linear Regression Demo');

    // Instructions text should instruct clicking on the graph
    await expect(app.instructions).toContainText('Click on the graph below to add data points');

    // Canvas should have proper accessibility attributes
    const canvas = app.canvas;
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label', 'Linear regression graph');

    // Buttons are visible and enabled
    await expect(app.btnClear).toBeVisible();
    await expect(app.btnRandom).toBeVisible();

    // Default result text on initial load
    await expect(app.resultDiv).toHaveText('Click on the graph to add data points.');

    // Equation area should be empty initially
    await expect(app.equationDiv).toHaveText('');

    // Clear tip should be visible and contain hint text
    await expect(app.clearTip).toBeVisible();
    await expect(app.clearTip).toContainText('Click "Clear Points" to remove all points');

    // Assert there were no runtime errors logged to console or page
    expect(pageErrors.length, 'No uncaught page errors on initial load').toBe(0);
    expect(consoleErrors.length, 'No console.error messages on initial load').toBe(0);
  });

  // Test adding points by clicking the canvas and checking state transitions and messages
  test('Clicking canvas adds points and updates messages: 1 point -> prompt, 2 points -> regression computed', async ({ page }) => {
    const app1 = new LinearRegressionPage(page);
    await app.goto();

    // Click once inside plotting area
    await app.clickInsidePlot();

    // After one click, app should prompt to add at least one more point
    await expect(app.resultDiv).toHaveText('Add at least one more point to compute regression line.');
    await expect(app.equationDiv).toHaveText(''); // still no equation text

    // Click a second point inside plotting area
    await app.clickAnotherInsidePlot();

    // After two points, regression should be calculated
    await expect(app.resultDiv).toHaveText('Regression line calculated for 2 points');

    // Equation div should now contain equation and R² indicator
    await expect(app.equationDiv).toContainText('y =');
    await expect(app.equationDiv).toContainText('R² =');

    // Ensure no runtime errors occurred during interactions
    expect(pageErrors.length, 'No uncaught page errors after adding points').toBe(0);
    expect(consoleErrors.length, 'No console.error messages after adding points').toBe(0);
  });

  // Test that clicks outside the plotting area are ignored
  test('Click outside plotting margin should be ignored and not add points', async ({ page }) => {
    const app2 = new LinearRegressionPage(page);
    await app.goto();

    // Click outside the plotting area (within canvas left margin)
    await app.clickOutsidePlotLeft();

    // State should remain the initial instruction state
    await expect(app.resultDiv).toHaveText('Click on the graph to add data points.');
    await expect(app.equationDiv).toHaveText('');

    // Now click inside to add a point to confirm normal behavior still works
    await app.clickInsidePlot();
    await expect(app.resultDiv).toHaveText('Add at least one more point to compute regression line.');

    // No runtime errors should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test the "Add Random Points" button produces 10 points and calculates regression
  test('Add Random Points button populates 10 points and displays regression summary', async ({ page }) => {
    const app3 = new LinearRegressionPage(page);
    await app.goto();

    // Click random button
    await app.clickRandomButton();

    // The app should state regression calculated for 10 points
    await expect(app.resultDiv).toHaveText('Regression line calculated for 10 points');

    // Equation text should be populated and include R²
    await expect(app.equationDiv).toContainText('y =');
    await expect(app.equationDiv).toContainText('R² =');

    // Ensure clear button is still available
    await expect(app.btnClear).toBeVisible();

    // No page errors or console errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test the Clear Points button resets the canvas and UI state
  test('Clear Points button removes all points and resets UI to initial state', async ({ page }) => {
    const app4 = new LinearRegressionPage(page);
    await app.goto();

    // Populate points via random button first
    await app.clickRandomButton();
    await expect(app.resultDiv).toHaveText('Regression line calculated for 10 points');
    await expect(app.equationDiv).not.toHaveText('');

    // Click clear and assert UI reset
    await app.clickClearButton();
    await expect(app.resultDiv).toHaveText('Click on the graph to add data points.');
    await expect(app.equationDiv).toHaveText('');

    // Verify the tip is still visible after clearing
    await expect(app.clearTip).toBeVisible();

    // No runtime errors should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case test: rapidly clicking multiple times to add many points and ensure UI updates
  test('Rapid multiple clicks add multiple points and maintain stable UI (no errors)', async ({ page }) => {
    const app5 = new LinearRegressionPage(page);
    await app.goto();

    // Simulate rapid clicking at several positions inside the plotting area
    await app.clickInsidePlot();
    await app.clickAnotherInsidePlot();
    await app.clickCanvasAtOffset(200, 130);
    await app.clickCanvasAtOffset(240, 160);
    await app.clickCanvasAtOffset(340, 140);

    // After several points, regression should be calculated (>=2 points)
    // Use a flexible assertion to check prefix since number of points may be 5
    await expect(app.resultDiv).toContainText('Regression line calculated for');

    // Equation should be present
    await expect(app.equationDiv).toContainText('y =');
    await expect(app.equationDiv).toContainText('R² =');

    // Ensure no uncaught exceptions occurred during heavy interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility check: ensure important elements have accessible names and roles
  test('Accessibility: canvas has role and aria-label; buttons have accessible names', async ({ page }) => {
    const app6 = new LinearRegressionPage(page);
    await app.goto();

    // Canvas role and aria-label are already validated in initial test, re-check for completeness
    await expect(app.canvas).toHaveAttribute('role', 'img');
    await expect(app.canvas).toHaveAttribute('aria-label', 'Linear regression graph');

    // Buttons should have accessible names via text content
    await expect(app.btnClear).toHaveText('Clear Points');
    await expect(app.btnRandom).toHaveText('Add Random Points');

    // No runtime errors during accessibility checks
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});